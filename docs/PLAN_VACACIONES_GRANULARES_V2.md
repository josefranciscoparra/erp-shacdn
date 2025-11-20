# PLAN: Sistema de Ausencias y Vacaciones Granulares V2.0

**Fecha:** 2025-11-18
**Estado:** 🟢 Implementación Avanzada (Fases 1-4 completas)
**Versión:** 1.1
**Relacionado con:** [PLAN_MIGRACION_HORARIOS_V2.md](./PLAN_MIGRACION_HORARIOS_V2.md)

---

## 🎯 Objetivo

Extender el sistema de ausencias (`PtoRequest` + `AbsenceType`) para soportar **granularidad en minutos**, permitiendo:

- ✅ Sector **privado**: Vacaciones/permisos por horas, minutos (ej: "30 min de 14:00 a 14:30")
- ✅ Sector **público**: Vacaciones por días completos según EBEP
- ✅ **Colectivos especiales**: Policía, bomberos con guardias de 24h y compensaciones
- ✅ **Flexibilidad total**: Configuración por tipo de ausencia (granularidad, mínimos, máximos)

---

## 📊 Contexto: Normativa y Casos Reales

### Sector Público - EBEP (Estatuto Básico del Empleado Público)

**Vacaciones:**

- 22 días hábiles mínimos al año (ampliables por antigüedad)
- Se gestionan en **días completos**

**Asuntos propios:**

- Mínimo 6 días al año (ampliables)
- Algunos ayuntamientos permiten **fraccionar en horas**

**Otros permisos (Art. 48 EBEP):**

- Fallecimiento, hospitalización → **días completos**
- Lactancia, reducción de jornada → **horas/minutos**
- Mudanza, deber inexcusable → **días completos**
- Exámenes → **horas necesarias**

### Colectivos Especiales

**Bomberos:**

- Jornada anual: 1.600-1.700 horas
- Turnos de 24h con libranzas (1-4, 1-5)
- Vacaciones se "gastan" en bloques de 24h (1 día = 1.440 minutos)

**Policía Local/Autonómica:**

- Jornada anual específica (ej: 1.664h)
- Guardias que "valen más" por nocturnidad/festivos (factor 1.5x, 1.75x)
- Permisos en horas/días según convenio

### Sector Privado

**Vacaciones:**

- Pueden fraccionarse en **horas, medias horas, cuartos de hora**
- Ejemplo: "Salir 2h antes el viernes" = 120 minutos de vacaciones

**Permisos retribuidos:**

- Médico: fracciones de hora (ej: 1h 15min)
- Trámites: minutos exactos

---

## 🔴 Problema Actual

### Modelo de Datos Limitado

```prisma
model PtoRequest {
  startDate   DateTime  // ❌ Solo fecha, sin hora
  endDate     DateTime  // ❌ Solo fecha, sin hora
  workingDays Decimal   // ❌ Granularidad de días
}
```

**Limitaciones:**

- ❌ No se pueden solicitar "30 minutos de vacaciones"
- ❌ No hay campos para hora de inicio/fin
- ❌ Imposible gestionar ausencias parciales de un día

### Configuración Inflexible

```prisma
model AbsenceType {
  name      String
  isPaid    Boolean
  // ❌ No hay configuración de granularidad
  // ❌ No hay configuración de mínimos/máximos
}
```

**Problemas:**

- Todos los tipos se comportan igual
- No se puede configurar "Vacaciones solo en días completos" vs "Permisos médicos en horas"

---

## ✅ Solución Propuesta

### 1. Schema de Prisma Extendido

#### `AbsenceType` - Configuración Granular

```prisma
model AbsenceType {
  id              String   @id @default(cuid())
  name            String   // "Vacaciones", "Asuntos personales", "Baja médica"
  code            String   // "VACATION", "PERSONAL", "SICK_LEAVE"
  description     String?
  color           String   @default("#3b82f6")
  isPaid          Boolean  @default(true)
  requiresApproval Boolean @default(true)
  minDaysAdvance  Int      @default(0)
  affectsBalance  Boolean  @default(true)
  active          Boolean  @default(true)

  // 🆕 NUEVOS CAMPOS - Granularidad
  allowPartialDays       Boolean @default(false) // ¿Permite fracciones de día?
  granularityMinutes     Int     @default(480)   // Granularidad (480=día, 60=hora, 30=media, 15=cuarto)
  minimumDurationMinutes Int     @default(480)   // Duración mínima
  maxDurationMinutes     Int?                    // Duración máxima (null=sin límite)

  // 🆕 FUTURO - Factor de compensación (nocturnidad, festivos)
  compensationFactor     Decimal @default(1.0) @db.Decimal(3,2) // 1.0=normal, 1.5=nocturno, 1.75=festivo

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  ptoRequests     PtoRequest[]

  @@unique([orgId, code])
  @@index([orgId])
  @@map("absence_types")
}
```

#### `PtoRequest` - Soporte para Franjas Horarias

```prisma
model PtoRequest {
  id          String           @id @default(cuid())

  // Fechas (campos actuales)
  startDate   DateTime         // Fecha de inicio
  endDate     DateTime         // Fecha de fin
  workingDays Decimal          @db.Decimal(5,2) // Días laborables calculados

  // 🆕 NUEVOS CAMPOS - Franjas horarias
  startTime       Int?  // Minutos desde medianoche (540 = 09:00)
  endTime         Int?  // Minutos desde medianoche (1020 = 17:00)
  durationMinutes Int?  // Duración real en minutos

  // Estado y aprobación (campos actuales)
  status      PtoRequestStatus @default(PENDING)
  reason      String?
  attachmentUrl String?

  // ... resto de campos ...

  @@map("pto_requests")
}
```

---

### 2. Ejemplos de Configuración

#### Tabla de Tipos de Ausencia

| Tipo                     | allowPartialDays | granularityMinutes | minimumDurationMinutes | maxDurationMinutes | Uso                       |
| ------------------------ | ---------------- | ------------------ | ---------------------- | ------------------ | ------------------------- |
| **Vacaciones (público)** | `false`          | 480 (día)          | 480                    | null               | Solo días completos       |
| **Vacaciones (privado)** | `true`           | 60 (hora)          | 30                     | null               | Por horas (mín 30 min)    |
| **Asuntos propios**      | `true`           | 30 (media)         | 60                     | null               | Por medias horas (mín 1h) |
| **Baja médica**          | `false`          | 480 (día)          | 480                    | null               | Solo días completos       |
| **Permiso médico**       | `true`           | 15 (cuarto)        | 15                     | 240                | Por cuartos (máx 4h)      |
| **Lactancia**            | `true`           | 60 (hora)          | 60                     | 60                 | 1 hora fija               |

#### Ejemplos de Solicitudes

**Caso A: Vacaciones días completos** (sector público)

```typescript
{
  absenceTypeId: "vacation_public",
  startDate: "2025-07-01",
  endDate: "2025-07-05",
  startTime: null,       // Sin hora
  endTime: null,         // Sin hora
  workingDays: 5,        // 5 días completos
  durationMinutes: null  // No aplica
}
```

**Caso B: Vacaciones por horas** (sector privado)

```typescript
{
  absenceTypeId: "vacation_private",
  startDate: "2025-07-01",
  endDate: "2025-07-01",  // Mismo día
  startTime: 840,         // 14:00 (14 * 60)
  endTime: 870,           // 14:30 (14.5 * 60)
  workingDays: 0.0625,    // 30 min / 480 min = 0.0625 días
  durationMinutes: 30
}
```

**Caso C: Medio día**

```typescript
{
  absenceTypeId: "vacation_private",
  startDate: "2025-07-01",
  endDate: "2025-07-01",
  startTime: 540,         // 09:00
  endTime: 780,           // 13:00
  workingDays: 0.5,       // Medio día
  durationMinutes: 240    // 4 horas
}
```

**Caso D: Bomberos - Guardia completa**

```typescript
{
  absenceTypeId: "vacation_firefighter",
  startDate: "2025-07-01",
  endDate: "2025-07-01",
  startTime: 480,         // 08:00
  endTime: 1920,          // 08:00 del día siguiente (32h, pero se corta en 24h)
  workingDays: 1,         // 1 día
  durationMinutes: 1440   // 24 horas
}
```

---

## 🏗️ Arquitectura de la Solución

### Flujo de Solicitud de Ausencia

```
1. Usuario selecciona tipo de ausencia
   ↓
2. ¿allowPartialDays = true?
   ├─ SÍ → Mostrar selectores de hora (con granularityMinutes)
   └─ NO → Solo selector de fechas
   ↓
3. Validar duración:
   - ¿Cumple minimumDurationMinutes?
   - ¿Respeta granularityMinutes?
   - ¿No excede maxDurationMinutes?
   ↓
4. Calcular automáticamente:
   - workingDays (días laborables consumidos)
   - durationMinutes (minutos totales)
   ↓
5. Guardar PtoRequest
   ↓
6. Motor de horarios consulta:
   - getAbsenceForDate() retorna ausencia parcial/completa
   - EffectiveSchedule ajusta slots según ausencia
```

### Integración con Motor de Horarios

**Función: `getAbsenceForDate()` modificada**

```typescript
async function getAbsenceForDate(employeeId: string, date: Date) {
  const absence = await prisma.ptoRequest.findFirst({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: date },
      endDate: { gte: date },
    },
    include: { absenceType: true },
  });

  if (!absence) return null;

  // ✅ Ausencia PARCIAL (con horas específicas)
  if (absence.startTime !== null && absence.endTime !== null) {
    return {
      type: absence.absenceType.name,
      reason: absence.reason ?? undefined,
      isPartialDay: true,
      startMinutes: absence.startTime,
      endMinutes: absence.endTime,
      durationMinutes: absence.durationMinutes,
    };
  }

  // ✅ Ausencia COMPLETA (día entero)
  return {
    type: absence.absenceType.name,
    reason: absence.reason ?? undefined,
    isPartialDay: false,
  };
}
```

**Lógica en `getEffectiveSchedule()`:**

```typescript
const absence = await getAbsenceForDate(employeeId, date);

if (absence) {
  // Ausencia de día completo → retornar día no laborable
  if (!absence.isPartialDay) {
    return {
      date,
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source: "ABSENCE",
      absence: { type: absence.type, reason: absence.reason },
    };
  }

  // Ausencia PARCIAL → restar slot del horario normal
  const normalSchedule = await getPeriodSchedule(...);
  const adjustedSlots = removeAbsenceSlot(
    normalSchedule.timeSlots,
    absence.startMinutes,
    absence.endMinutes
  );

  return {
    ...normalSchedule,
    timeSlots: adjustedSlots,
    expectedMinutes: normalSchedule.expectedMinutes - absence.durationMinutes,
    source: "PERIOD_WITH_ABSENCE",
    absence: { type: absence.type, reason: absence.reason, isPartial: true },
  };
}
```

---

## 📋 Plan de Implementación

### **FASE 1: Base de Datos** ✅

**Objetivo:** Extender schema de Prisma

**Tareas:**

1. ✅ Añadir campos a `AbsenceType`:
   - `allowPartialDays`
   - `granularityMinutes`
   - `minimumDurationMinutes`
   - `maxDurationMinutes`
   - `compensationFactor`

2. ✅ Añadir campos a `PtoRequest`:
   - `startTime`
   - `endTime`
   - `durationMinutes`

3. ✅ Sincronizar con `npx prisma db push`

**Archivos afectados:**

- `/prisma/schema.prisma`

---

### **FASE 2: UI de Configuración (Settings)** ✅

**Objetivo:** Permitir configurar tipos de ausencia desde `/dashboard/settings`

**Tareas:**

1. ✅ Nueva pestaña "Tipos de Ausencia" en Settings
2. ✅ Tabla de tipos con:
   - Nombre, código, color
   - Toggle "Días parciales"
   - Select "Granularidad" (Día/Hora/Media/Cuarto)
   - Inputs: Duración mínima, máxima
3. ✅ Dialog de creación/edición de tipo
4. ✅ Server actions CRUD:
   - `getAbsenceTypes()`
   - `createAbsenceType()`
   - `updateAbsenceType()`
   - `deleteAbsenceType()`

**Archivos creados:**

- ✅ `/src/app/(main)/dashboard/settings/_components/absence-types-tab.tsx`
- ✅ `/src/app/(main)/dashboard/settings/_components/absence-type-dialog.tsx`
- ✅ `/src/server/actions/absence-types.ts`

**Script de migración:**

- ✅ `/scripts/fix-absence-types-defaults.ts` - Actualiza valores por defecto en tipos existentes

---

### **FASE 3: Solicitud de Ausencias con Horas** ✅

**Objetivo:** Modificar dialog de solicitud para soportar granularidad

**Tareas:**

1. ✅ Modificar `NewPtoRequestDialog`:
   - Cargar configuración del tipo seleccionado
   - Si `allowPartialDays = true`:
     - Mostrar selectores de hora (con granularidad)
     - Validar duración mínima/máxima
     - Calcular automáticamente `workingDays` y `durationMinutes`
   - Si `allowPartialDays = false`:
     - Mantener selector de fechas actual
2. ✅ Validaciones:
   - Verificar que las horas respeten granularidad
   - Verificar que no se solapen con otras ausencias del mismo día
3. ✅ Cálculo automático de balance consumido

**Archivos modificados:**

- ✅ `/src/app/(main)/dashboard/me/pto/_components/new-pto-request-dialog.tsx` - UI con selectores de hora
- ✅ `/src/server/actions/employee-pto.ts` - Validaciones de ausencias parciales
- ✅ `/src/stores/pto-store.tsx` - Interfaces actualizadas

---

### **FASE 4: Integración con Motor de Horarios** ✅

**Objetivo:** Hacer que el motor de horarios respete ausencias parciales

**Tareas:**

1. ✅ Modificar `getAbsenceForDate()`:
   - Retornar `isPartial`, `startTime`, `endTime`, `durationMinutes`
2. ✅ Modificar `getEffectiveSchedule()`:
   - Si ausencia parcial, continuar con horario normal
   - Reducir `expectedMinutes` por duración de ausencia
3. ✅ Actualizar tipos TypeScript:
   - `EffectiveSchedule.absence` con campos de ausencia parcial
4. ⏳ Validaciones de fichaje (pendiente):
   - Si hay ausencia parcial, el empleado no puede fichar en ese rango

**Archivos modificados:**

- ✅ `/src/lib/schedule-engine.ts` - Lógica de ausencias parciales
- ✅ `/src/types/schedule.ts` - Tipos actualizados
- ⏳ `/src/server/actions/time-tracking.ts` - Validaciones (pendiente)

---

### **FASE 5: Excepciones de Horario** 🔵

**Objetivo:** Implementar gestión de `ExceptionDayOverride`

**Tareas:**

1. Implementar `getExceptionForDate()` en schedule-engine
2. UI Manager: `/dashboard/schedules/exceptions`
   - Tabla de excepciones
   - Dialog para crear excepción individual/grupal
3. Server actions CRUD para excepciones
4. Badge en `/dashboard/me/schedule` mostrando excepciones

**Archivos a crear:**

- `/src/app/(main)/dashboard/schedules/exceptions/page.tsx`
- `/src/server/actions/schedule-exceptions.ts`

---

## 🧪 Casos de Uso y Testing

### Caso 1: Empleado Privado - Vacaciones por Horas

**Setup:**

- Tipo: "Vacaciones" con `allowPartialDays=true`, `granularityMinutes=60`
- Empleado con horario 09:00-17:00

**Test:**

1. Solicitar 2h de vacaciones (14:00-16:00) el viernes
2. Verificar que se calculan `0.25 días` (2h / 8h)
3. Verificar que el horario del viernes muestra:
   - 09:00-14:00 (trabajo)
   - 14:00-16:00 (ausencia)
   - 16:00-17:00 (trabajo)
4. Verificar que se descuentan 120 minutos del balance

### Caso 2: Funcionario - Vacaciones por Días

**Setup:**

- Tipo: "Vacaciones" con `allowPartialDays=false`, `granularityMinutes=480`

**Test:**

1. Solicitar vacaciones del 1 al 5 de julio
2. Verificar que se calculan 5 días completos
3. Verificar que los 5 días aparecen como no laborables
4. Verificar que NO se permite solicitar "medio día"

### Caso 3: Bomberos - Guardia de 24h

**Setup:**

- Tipo: "Vacaciones Bomberos" con `allowPartialDays=true`, `granularityMinutes=1440`
- Empleado con turno 08:00-08:00 (24h)

**Test:**

1. Solicitar 1 guardia de vacaciones (24h)
2. Verificar que se calcula como 1 día
3. Verificar que `durationMinutes=1440`
4. Verificar que se descuenta 1 día del balance anual

### Caso 4: Varios Tramos en un Día

**Setup:**

- Tipo: "Permiso médico" con `allowPartialDays=true`, `granularityMinutes=15`

**Test:**

1. Solicitar 1h por la mañana (10:00-11:00)
2. Solicitar 45min por la tarde (15:00-15:45)
3. Verificar que se permiten ambas solicitudes para el mismo día
4. Verificar que el horario muestra 3 slots:
   - 09:00-10:00 (trabajo)
   - 10:00-11:00 (ausencia)
   - 11:00-15:00 (trabajo)
   - 15:00-15:45 (ausencia)
   - 15:45-17:00 (trabajo)

---

## 📚 Referencias

### Normativa

- **EBEP (Estatuto Básico del Empleado Público)**: [BOE-A-2015-11719](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11719)
- **Art. 48 EBEP - Permisos de los funcionarios**: Fallecimiento, hospitalización, mudanza, etc.
- **Convenios específicos**: Bomberos, Policía Local (varían por CC.AA. y ayuntamiento)

### Fuentes

- Iberley - "Vacaciones funcionarios públicos"
- Pluxee - "Días de asuntos propios"
- BOE - "Permisos retribuidos sector público"
- La Administración al Día - "Jornadas de bomberos"
- Revista CEMCI - "Jornadas de policía local"

---

## 📝 Notas de Implementación

### Decisiones de Diseño

**¿Por qué `startTime`/`endTime` en minutos?**

- Consistencia con `TimeSlot` (también usa minutos)
- Permite cálculos precisos sin conversiones
- Formato: 540 = 09:00, 1020 = 17:00

**¿Por qué permitir múltiples PtoRequest para el mismo día?**

- Simplicidad: No requiere tabla adicional `AbsenceSegment`
- Flexibilidad: Permite casos como "2 visitas médicas en un día"
- Validación: Se puede validar que no se solapen

**¿Cuándo usar `compensationFactor`?**

- En el futuro, para nocturnidad/festivos
- Ejemplo: 1h nocturna = 1.5h a efectos de cómputo
- Por ahora: campo añadido pero no usado en lógica

### Consideraciones de Performance

**Índices en Prisma:**

```prisma
@@index([employeeId, startDate, endDate]) // Para getAbsenceForDate()
@@index([status])                          // Para filtrar aprobadas
```

**Consultas optimizadas:**

- `getAbsenceForDate()` solo trae 1 resultado (`findFirst`)
- Incluir `absenceType` en el query inicial (no query adicional)

### Retrocompatibilidad

**Solicitudes existentes sin `startTime`/`endTime`:**

- Se interpretan como días completos (comportamiento actual)
- No requieren migración de datos

**Tipos de ausencia existentes:**

- Migración automática: `allowPartialDays=false`, `granularityMinutes=480`
- Mantienen comportamiento actual (solo días completos)

---

## ✅ Criterios de Aceptación

La feature estará **completa** cuando:

1. ✅ Schema de Prisma extendido y sincronizado
2. ✅ UI en Settings permite configurar tipos con granularidad
3. ✅ Dialog de solicitud soporta horas/minutos según tipo
4. ✅ Motor de horarios respeta ausencias parciales
5. ✅ Validaciones impiden solapamientos y errores de granularidad
6. ✅ Balances de días se calculan correctamente desde minutos
7. ✅ Tests manuales de los 4 casos de uso pasan
8. ✅ Documentación actualizada (este archivo + plan principal)

---

## 🔄 Historial de Cambios

| Fecha      | Versión | Cambios                                                                                                                                                                       |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-11-18 | 1.0     | Documento inicial. Planificación completa antes de implementación.                                                                                                            |
| 2025-11-18 | 1.1     | ✅ Fases 1-4 completadas. Sistema funcional con ausencias granulares y integración con motor de horarios. Pendiente: Fase 5 (ExceptionDayOverride) y validaciones de fichaje. |

---

## 📎 Archivos Relacionados

- [PLAN_MIGRACION_HORARIOS_V2.md](./PLAN_MIGRACION_HORARIOS_V2.md) - Plan principal del sistema de horarios
- `/prisma/schema.prisma` - Schema de base de datos
- `/src/lib/schedule-engine.ts` - Motor de cálculo de horarios
- `/src/app/(main)/dashboard/me/pto/` - UI de solicitud de vacaciones
- `/src/app/(main)/dashboard/settings/` - UI de configuración

---

**Fin del documento**
