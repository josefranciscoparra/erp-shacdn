# Plan de Robustez: Sistema de Horarios, Turnos y Fichajes

> **Versión**: 1.3
> **Fecha**: 2025-11-29
> **Tag inicial**: `v2.3.0-pre-robustness`
> **Estado**: ✅ TODAS LAS FASES COMPLETADAS (12/12 tareas)

---

## Objetivo

Llevar el sistema de fichajes y horarios a nivel de **produccion estable** corrigiendo todos los problemas criticos identificados para garantizar fiabilidad total antes de la implantacion.

---

## Resumen de Problemas Criticos a Resolver

### Sistema de Fichajes (5 problemas)

| #   | Problema                             | Impacto                            | Estado         |
| --- | ------------------------------------ | ---------------------------------- | -------------- |
| 1   | Race conditions sin transacciones    | Multiples CLOCK_IN posibles        | [x] COMPLETADO |
| 2   | Fichajes que cruzan medianoche       | Minutos calculados incorrectamente | [x] COMPLETADO |
| 3   | Pausas abiertas usan `new Date()`    | Tiempo de pausa incorrecto         | [x] COMPLETADO |
| 4   | Sin validacion de maquina de estados | BREAK_END sin BREAK_START          | [x] COMPLETADO |
| 5   | Sin transacciones atomicas           | Operaciones parciales posibles     | [x] COMPLETADO |

### Motor de Horarios (4 problemas)

| #   | Problema                      | Impacto                            | Estado         |
| --- | ----------------------------- | ---------------------------------- | -------------- |
| 6   | Rotaciones con fecha anterior | `(-5) % 4 = -1` en JS (incorrecto) | [x] COMPLETADO |
| 7   | Plantillas sin periodos       | Retorna 0 silenciosamente          | [x] COMPLETADO |
| 8   | Periodos superpuestos         | Comportamiento no deterministico   | [x] COMPLETADO |
| 9   | Timezone en comparaciones     | Dia incorrecto en edge cases       | [x] COMPLETADO |

### Integracion (3 problemas)

| #   | Problema                       | Impacto                        | Estado         |
| --- | ------------------------------ | ------------------------------ | -------------- |
| 10  | Multiples asignaciones activas | Solo se usa una                | [x] COMPLETADO |
| 11  | PTO retroactivo                | WorkdaySummary no se recalcula | [x] COMPLETADO |
| 12  | expectedMinutes inconsistente  | BD vs motor difieren           | [x] COMPLETADO |

---

## Archivos Criticos a Modificar

| Archivo                                    | Cambios                                       |
| ------------------------------------------ | --------------------------------------------- |
| `/src/server/actions/time-tracking.ts`     | Transacciones, maquina de estados, medianoche |
| `/src/lib/schedule-engine.ts`              | Rotaciones, validaciones, timezone            |
| `/src/server/actions/schedules-v2.ts`      | Validacion de asignaciones                    |
| `/src/server/actions/employee-schedule.ts` | Sincronizacion expectedMinutes                |
| `/prisma/schema.prisma`                    | Indices compuestos                            |

---

## FASE 1: Sistema de Fichajes Robusto

### 1.1 Implementar Maquina de Estados Estricta

**Archivo:** `/src/lib/time-entry-state-machine.ts` (NUEVO)

```typescript
type TimeEntryState = "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
type TimeEntryAction = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

const VALID_TRANSITIONS: Record<TimeEntryState, TimeEntryAction[]> = {
  CLOCKED_OUT: ["CLOCK_IN"],
  CLOCKED_IN: ["CLOCK_OUT", "BREAK_START"],
  ON_BREAK: ["BREAK_END"],
};

export function validateTransition(currentState: TimeEntryState, action: TimeEntryAction): boolean {
  return VALID_TRANSITIONS[currentState]?.includes(action) ?? false;
}

export function getNextState(currentState: TimeEntryState, action: TimeEntryAction): TimeEntryState {
  const transitions: Record<TimeEntryAction, TimeEntryState> = {
    CLOCK_IN: "CLOCKED_IN",
    CLOCK_OUT: "CLOCKED_OUT",
    BREAK_START: "ON_BREAK",
    BREAK_END: "CLOCKED_IN",
  };
  return transitions[action];
}
```

### 1.2 Envolver Operaciones en Transacciones

**Archivo:** `/src/server/actions/time-tracking.ts`

Refactorizar `clockIn`, `clockOut`, `startBreak`, `endBreak` para usar `prisma.$transaction()` con nivel de aislamiento Serializable.

### 1.3 Manejar Fichajes que Cruzan Medianoche

Modificar `updateWorkdaySummary` para buscar CLOCK_IN del dia anterior que no tenga CLOCK_OUT.

### 1.4 Corregir Calculo de Pausas Abiertas

Usar el timestamp del CLOCK_OUT en lugar de `new Date()` para el BREAK_END automatico.

---

## FASE 2: Motor de Horarios Robusto

### 2.1 Corregir Modulo con Numeros Negativos

**Archivo:** `/src/lib/schedule-engine.ts`

```typescript
// CORRECCION: Usar modulo positivo para fechas anteriores al inicio
const positionInCycle = ((daysSinceStart % cycleDuration) + cycleDuration) % cycleDuration;
```

### 2.2 Validar Plantillas Antes de Usar

Marcar como error de configuracion cuando una plantilla no tiene periodos, en lugar de retornar 0 silenciosamente.

### 2.3 Prevenir Periodos Superpuestos

Agregar validacion al crear/editar periodos para detectar solapamientos.

### 2.4 Normalizar Fechas a UTC

Crear helpers `normalizeToUTCMidnight()` y `normalizeToUTCEndOfDay()` y usar en todas las comparaciones.

---

## FASE 3: Integridad de Datos

### 3.1 Prevenir Multiples Asignaciones Activas

Usar transaccion para cerrar asignaciones solapadas antes de crear una nueva.

### 3.2 Recalcular WorkdaySummary en PTO Retroactivo

Cuando se aprueba un PTO con fecha pasada, recalcular los WorkdaySummary afectados.

### 3.3 Sincronizar expectedMinutes Consistentemente

Siempre obtener el horario fresco del motor y actualizar BD si difiere.

---

## FASE 4: Indices y Performance

### 4.1 Agregar Indices Compuestos

**Archivo:** `/prisma/schema.prisma`

```prisma
model TimeEntry {
  @@index([employeeId, orgId, timestamp])
  @@index([employeeId, orgId, entryType, timestamp])
  @@index([employeeId, orgId, isCancelled, timestamp])
}

model EmployeeScheduleAssignment {
  @@index([employeeId, isActive, validFrom, validTo])
}

model WorkdaySummary {
  @@index([employeeId, orgId, date])
}
```

---

## FASE 5: Validaciones de UI

### 5.1 Validar Plantilla Completa Antes de Asignar

Verificar que la plantilla tiene periodos, patrones de dias y franjas horarias antes de permitir asignacion.

### 5.2 Mostrar Warnings en UI de Fichaje

Mostrar alerta cuando el horario tiene `source: "CONFIGURATION_ERROR"` o `source: "NO_ASSIGNMENT"`.

---

## Orden de Implementacion

| #   | Tarea                  | Archivo                                    | Prioridad | Estado    |
| --- | ---------------------- | ------------------------------------------ | --------- | --------- |
| 1   | Maquina de estados     | `/src/lib/time-entry-state-machine.ts`     | P0        | [x] HECHO |
| 2   | Transacciones fichajes | `/src/server/actions/time-tracking.ts`     | P0        | [x] HECHO |
| 3   | Medianoche             | `/src/server/actions/time-tracking.ts`     | P0        | [x] HECHO |
| 4   | Rotaciones negativas   | `/src/lib/schedule-engine.ts`              | P0        | [x] HECHO |
| 5   | Validar plantillas     | `/src/lib/schedule-engine.ts`              | P0        | [x] HECHO |
| 6   | Periodos superpuestos  | `/src/server/actions/schedules-v2.ts`      | P0        | [x] HECHO |
| 7   | Asignaciones multiples | `/src/server/actions/schedules-v2.ts`      | P0        | [x] HECHO |
| 8   | UTC normalizado        | `/src/lib/schedule-engine.ts`              | P0        | [x] HECHO |
| 9   | PTO retroactivo        | `/src/server/actions/approver-pto.ts`      | P1        | [x] HECHO |
| 10  | Sync expectedMinutes   | `/src/server/actions/employee-schedule.ts` | P1        | [x] HECHO |
| 11  | Indices BD             | `/prisma/schema.prisma`                    | P1        | [x] HECHO |
| 12  | Validaciones UI        | Varios componentes                         | P2        | [x] HECHO |

---

## Testing Post-Implementacion

### Casos de Prueba Criticos

1. **Race condition**: Dos tabs fichando CLOCK_IN simultaneamente -> Solo 1 debe pasar
2. **Medianoche**: CLOCK_IN 23:50, CLOCK_OUT 00:10 -> Minutos correctos para ambos dias
3. **Rotacion historica**: Consultar horario de fecha anterior al inicio de rotacion -> No debe crashear
4. **Plantilla vacia**: Asignar plantilla sin periodos -> Debe mostrar error
5. **PTO retroactivo**: Aprobar PTO de ayer -> WorkdaySummary debe recalcularse
6. **Pausas**: CLOCK_IN -> BREAK_START -> CLOCK_OUT (sin BREAK_END) -> Pausa calculada hasta CLOCK_OUT

---

## Migracion de Base de Datos

Como los datos son de prueba, se puede hacer `prisma db push` directamente:

```bash
npx prisma db push
```

---

## Estimacion de Esfuerzo

| Fase      | Descripcion    | Tiempo Estimado |
| --------- | -------------- | --------------- |
| FASE 1    | Fichajes       | 4-5 horas       |
| FASE 2    | Motor horarios | 3-4 horas       |
| FASE 3    | Integridad     | 2-3 horas       |
| FASE 4    | Indices        | 30 min          |
| FASE 5    | UI             | 1-2 horas       |
| **Total** |                | **10-15 horas** |

---

## Guia de Pruebas Manuales

### FASE 1: Sistema de Fichajes

#### Prueba 1: Race conditions (transacciones)

- Abre 2 pestanas en `/dashboard/me/clock`
- Intenta hacer CLOCK_IN en ambas simultaneamente
- **Esperado**: Solo 1 debe pasar, la otra debe dar error

#### Prueba 2: Fichajes que cruzan medianoche

- Ficha entrada a las 23:50
- Espera a que pase medianoche (o cambia la hora del sistema)
- Ficha salida a las 00:10
- **Esperado**: Los minutos deben calcularse correctamente para ambos dias

#### Prueba 3: Pausas abiertas

- CLOCK_IN → BREAK_START → CLOCK_OUT (sin BREAK_END)
- **Esperado**: La pausa debe calcularse hasta el momento del CLOCK_OUT

#### Prueba 4: Maquina de estados

- Intenta hacer BREAK_END sin haber hecho BREAK_START
- **Esperado**: Debe dar error de "transicion no permitida"

### FASE 2: Motor de Horarios

#### Prueba 5: Rotaciones con fecha anterior

- Asigna un patron de rotacion a un empleado
- Consulta el horario de una fecha ANTERIOR al inicio de la rotacion
- **Esperado**: No debe crashear, debe mostrar horario correcto

#### Prueba 6: Plantilla sin periodos

- Crea una plantilla nueva sin anadir periodos
- Intenta asignarla a un empleado
- **Esperado**: Debe dar error descriptivo (FASE 5.1)

### FASE 3: Integridad de Datos

#### Prueba 7: Asignaciones multiples

- Asigna un horario A a un empleado (vigente desde hoy)
- Asigna un horario B al mismo empleado
- **Esperado**: El horario A debe cerrarse automaticamente al dia anterior

#### Prueba 8: PTO retroactivo

- Ficha entrada/salida un dia normal
- Al dia siguiente, aprueba una solicitud de vacaciones para el dia anterior
- **Esperado**: El WorkdaySummary debe recalcularse (expectedMinutes = 0)

#### Prueba 9: Sync expectedMinutes

- Ve a `/dashboard/me/clock` despues de cambiar el horario asignado
- **Esperado**: El resumen debe mostrar los minutos esperados actualizados

### FASE 5: Validaciones de UI

#### Prueba 10: Validar plantilla antes de asignar

- Crea plantilla → Anade periodo → NO anadas franjas horarias
- Intenta asignarla
- **Esperado**: Error "El periodo X no tiene franjas horarias configuradas"

#### Prueba 11: Warning CONFIGURATION_ERROR en UI

- Si tienes una plantilla con errores asignada, ve a `/dashboard/me/clock`
- **Esperado**: Card roja "Error de Configuracion" con mensaje explicativo

#### Prueba 12: Warning NO_ASSIGNMENT en UI

- Crea un empleado sin asignarle horario
- Inicia sesion como ese empleado y ve a `/dashboard/me/clock`
- **Esperado**: Card naranja "Sin horario asignado"

### Checklist Rapido

| #   | Prueba                  | Ubicacion                          | Prioridad |
| --- | ----------------------- | ---------------------------------- | --------- |
| 1   | Race condition CLOCK_IN | 2 tabs → `/dashboard/me/clock`     | CRITICA   |
| 2   | Medianoche              | Fichaje 23:50 → 00:10              | CRITICA   |
| 3   | Pausa abierta           | CLOCK_IN → BREAK_START → CLOCK_OUT | CRITICA   |
| 4   | Maquina estados         | BREAK_END sin BREAK_START          | ALTA      |
| 5   | Rotacion historica      | Consultar fecha anterior           | MEDIA     |
| 6   | Plantilla vacia         | Crear y asignar                    | CRITICA   |
| 7   | Doble asignacion        | Asignar 2 horarios                 | CRITICA   |
| 8   | PTO retroactivo         | Aprobar PTO de ayer                | CRITICA   |
| 9   | Sync minutos            | Cambiar horario y ver resumen      | MEDIA     |
| 10  | Periodo sin franjas     | Crear y asignar                    | ALTA      |
| 11  | Error config UI         | Ver `/dashboard/me/clock`          | MEDIA     |
| 12  | Sin asignacion UI       | Empleado nuevo                     | MEDIA     |

---

## Archivos Modificados (Referencia de Commits)

### Commit: `feat(robustness): implementar plan de robustez completo para fichajes y horarios`

**Archivos modificados:**

| Archivo                                                            | Descripcion del cambio                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/lib/time-entry-state-machine.ts`                              | **NUEVO** - Maquina de estados para validar transiciones de fichajes                                         |
| `src/server/actions/time-tracking.ts`                              | Transacciones atomicas, manejo de medianoche, pausas abiertas, recalculo PTO retroactivo                     |
| `src/lib/schedule-engine.ts`                                       | Modulo positivo para rotaciones, validacion de plantillas, normalizacion UTC                                 |
| `src/server/actions/schedules-v2.ts`                               | Validacion de periodos superpuestos, transaccion atomica para asignaciones, validacion de plantilla completa |
| `src/server/actions/approver-pto.ts`                               | Llamada a recalculo de WorkdaySummary en aprobacion de PTO retroactivo                                       |
| `src/server/actions/employee-schedule.ts`                          | Sincronizacion automatica de expectedMinutes BD vs motor                                                     |
| `src/app/(main)/dashboard/me/clock/_components/today-schedule.tsx` | Warning UI para CONFIGURATION_ERROR                                                                          |
| `prisma/schema.prisma`                                             | Indices compuestos para TimeEntry, EmployeeScheduleAssignment, WorkdaySummary                                |
| `src/types/schedule.ts`                                            | Tipo CONFIGURATION_ERROR en EffectiveSchedule.source                                                         |
| `docs/PLAN_ROBUSTEZ_FICHAJES.md`                                   | Documentacion completa del plan                                                                              |

---

## Historial de Cambios

| Fecha      | Version | Cambios                                                                                |
| ---------- | ------- | -------------------------------------------------------------------------------------- |
| 2025-11-29 | 1.0     | Creacion del plan inicial                                                              |
| 2025-11-29 | 1.1     | FASES 1-4 completadas: fichajes, motor horarios, integridad, indices                   |
| 2025-11-29 | 1.2     | FASE 5 completada: validaciones UI (plantilla completa + warnings CONFIGURATION_ERROR) |
| 2025-11-29 | 1.3     | Anadida guia de pruebas manuales y referencia de commits                               |
