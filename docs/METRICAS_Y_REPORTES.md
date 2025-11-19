# Métricas y Reportes - Sistema de Horarios V2.0

**Fecha:** 2025-11-19
**Versión:** 1.0
**Estado:** Pendiente ⚠️

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)

---

## 📚 Índice

1. [Sistema de Métricas](#sistema-de-métricas)
2. [Dashboard de Alertas](#dashboard-de-alertas)
3. [Importación/Exportación](#importaciónexportación)

---

## 📊 Sistema de Métricas

**Archivo:** `/src/lib/schedule-metrics.ts`

### Interfaces TypeScript

```typescript
export interface ScheduleMetrics {
  employeeId: string
  period: { from: Date; to: Date }

  // Horas
  expectedHours: number
  actualHours: number
  deviationHours: number
  deviationPercentage: number

  // Cumplimiento de presencia obligatoria (sector público)
  mandatoryPresenceDays: number
  mandatoryPresenceComplied: number
  mandatoryPresenceComplianceRate: number

  // Excesos
  overtimeDays: number // Días con +150% de jornada
  overtimeHours: number

  // Descansos
  insufficientRestDays: number // Días con <11h descanso

  // Alertas
  alerts: ScheduleAlert[]
}

export interface ScheduleAlert {
  type: 'OVERTIME' | 'MANDATORY_PRESENCE_MISSED' | 'INSUFFICIENT_REST' | 'SCHEDULE_CHANGE_REQUIRED'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  date: Date
  message: string
  metadata?: Record<string, any>
}
```

---

### Funciones Principales

#### `calculateScheduleMetrics()`

**Firma:**
```typescript
export async function calculateScheduleMetrics(
  employeeId: string,
  from: Date,
  to: Date
): Promise<ScheduleMetrics>
```

**Descripción:**
Calcula métricas completas de cumplimiento de horario para un empleado en un período.

**Lógica:**

1. Obtener todos los días del período
2. Para cada día:
   - Calcular horas esperadas (`getEffectiveSchedule()`)
   - Calcular horas trabajadas (`WorkdaySummary`)
   - Detectar desviaciones
3. Calcular agregados:
   - Total horas esperadas vs trabajadas
   - Días con exceso (>150% jornada)
   - Días sin cumplir presencia obligatoria
   - Días con descanso insuficiente (<11h)
4. Generar alertas según umbrales

**Ejemplo:**
```typescript
const metrics = await calculateScheduleMetrics(
  'emp_123',
  new Date('2025-11-01'),
  new Date('2025-11-30')
)

console.log(metrics)
// {
//   employeeId: 'emp_123',
//   period: { from: ..., to: ... },
//   expectedHours: 160,
//   actualHours: 165,
//   deviationHours: +5,
//   deviationPercentage: +3.125,
//   overtimeDays: 2,
//   overtimeHours: 8,
//   mandatoryPresenceComplied: 18,
//   mandatoryPresenceDays: 20,
//   mandatoryPresenceComplianceRate: 90,
//   insufficientRestDays: 1,
//   alerts: [
//     {
//       type: 'OVERTIME',
//       severity: 'WARNING',
//       date: '2025-11-15',
//       message: 'Exceso de horas: 12h trabajadas (esperado 8h)'
//     }
//   ]
// }
```

---

#### `getScheduleAlerts()`

**Firma:**
```typescript
export async function getScheduleAlerts(
  employeeId: string,
  from: Date,
  to: Date
): Promise<ScheduleAlert[]>
```

**Descripción:**
Obtiene solo las alertas de un empleado en un período (sin calcular todas las métricas).

---

#### `getOrganizationAlerts()`

**Firma:**
```typescript
export async function getOrganizationAlerts(
  filters?: { severity?: string; type?: string; employeeId?: string }
): Promise<ScheduleAlert[]>
```

**Descripción:**
Obtiene todas las alertas de la organización con filtros opcionales.

**Ejemplo:**
```typescript
// Alertas críticas de toda la organización
const criticalAlerts = await getOrganizationAlerts({ severity: 'CRITICAL' })

// Alertas de exceso de horas
const overtimeAlerts = await getOrganizationAlerts({ type: 'OVERTIME' })
```

---

## 🚨 Dashboard de Alertas

**Ubicación:** `/src/app/(main)/dashboard/schedule-alerts/page.tsx`

### Características

- DataTable con alertas de toda la organización
- Filtros: Severidad, Tipo, Empleado, Fecha
- Acciones: Aprobar exceso, Marcar como revisado, Comentar
- Badges por severidad: INFO (azul), WARNING (amarillo), CRITICAL (rojo)

### Tipos de Alertas

#### 1. OVERTIME_DETECTED (Exceso de horas)

**Trigger:**
Día con >150% de jornada esperada

**Ejemplo:**
```
Empleado trabajó 12h cuando se esperaban 8h (150% = 12h)
```

**Acciones posibles:**
- Aprobar como extra (guardar en extras_aprobadas)
- Marcar como error de fichaje (revisar entradas)
- Compensar con día libre

---

#### 2. MANDATORY_PRESENCE_MISSED (No cumple horario obligatorio)

**Trigger:**
Falta en tramo MANDATORY sin ausencia justificada

**Ejemplo (sector público):**
```
Empleado fichó entrada 10:00 (esperado: presencia obligatoria desde 09:00)
```

**Acciones posibles:**
- Solicitar justificación al empleado
- Marcar como incidencia en historial
- Descontar de nómina (según convenio)

---

#### 3. INSUFFICIENT_REST (Descanso insuficiente)

**Trigger:**
Menos de 11h entre salida y entrada siguiente (legal en España)

**Ejemplo:**
```
Salida: 2025-11-15 22:00
Entrada: 2025-11-16 07:00
Descanso: 9h (INSUFICIENTE, legal = 11h)
```

**Acciones posibles:**
- Alerta al manager (notificación)
- Verificar cumplimiento legal
- Ajustar siguiente turno

---

#### 4. SCHEDULE_CHANGE_REQUIRED (Cambio de periodo sin asignar)

**Trigger:**
Empleado sin horario asignado para periodo nuevo (verano, Semana Santa)

**Ejemplo:**
```
Periodo INTENSIVE "Verano 2025" inicia 15-Jun
Empleado 'emp_123' no tiene horario asignado para ese período
```

**Acciones posibles:**
- Asignar horario de verano automáticamente
- Notificar al empleado del cambio
- Clonar horario regular con ajustes

---

### Wireframe del Dashboard

```
┌────────────────────────────────────────────────────────────┐
│ 🚨 Alertas de Horarios                                     │
├────────────────────────────────────────────────────────────┤
│ Filtros:                                                   │
│ [Severidad ▼] [Tipo ▼] [Empleado ▼] [Desde] - [Hasta]    │
│                                                [Actualizar]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ FECHA       │ EMPLEADO       │ TIPO      │ SEV   │ ACC ││
│ ├────────────────────────────────────────────────────────┤│
│ │ 2025-11-15  │ Juan Pérez     │ OVERTIME  │ 🟡    │ ⋮  ││
│ │             │ Exceso de horas: 12h (esperado 8h)       ││
│ │                                                         ││
│ │ 2025-11-14  │ Ana López      │ REST      │ 🔴    │ ⋮  ││
│ │             │ Descanso insuficiente: 9h (legal 11h)    ││
│ │                                                         ││
│ │ 2025-11-13  │ Pedro García   │ PRESENCE  │ 🟡    │ ⋮  ││
│ │             │ Entrada tardía: 10:00 (obligatorio 09:00)││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Paginación: [< 1 2 3 >]                                   │
└────────────────────────────────────────────────────────────┘

Menú de acciones (⋮):
  - Aprobar exceso
  - Marcar como revisado
  - Añadir comentario
  - Ver detalles del día
  - Enviar notificación al empleado
```

---

## 📥📤 Importación/Exportación

### Importación CSV/Excel

**Ubicación:** `/src/app/(main)/dashboard/schedules/import/page.tsx`

**Formato CSV esperado:**

```csv
empleado_numero,plantilla_horario,tipo_asignacion,fecha_desde,fecha_hasta,rotacion_inicio
TMNW00001,horario-oficina-40h,FIXED,2025-01-01,2025-12-31,
TMNW00002,rotacion-policia-6x6,ROTATION,2025-01-01,,2025-01-15
TMNW00003,teletrabajo-flexible,FLEXIBLE,2025-01-01,,
```

**Wizard de Importación:**

#### Paso 1: Subir archivo (CSV o Excel)

```
┌─────────────────────────────────────────────┐
│ 📄 Importar Horarios desde CSV/Excel       │
├─────────────────────────────────────────────┤
│                                             │
│ Arrastra archivo aquí o haz click           │
│ ┌─────────────────────────────────────────┐│
│ │                                         ││
│ │         📁 Seleccionar archivo          ││
│ │                                         ││
│ └─────────────────────────────────────────┘│
│                                             │
│ Formatos aceptados: .csv, .xlsx, .xls      │
│                                             │
│                        [Siguiente →]        │
└─────────────────────────────────────────────┘
```

---

#### Paso 2: Preview y validación

**Detectar:**
- Empleados que no existen
- Plantillas que no existen
- Fechas inválidas
- Mostrar errores en tabla

```
┌─────────────────────────────────────────────────────┐
│ ✅ Preview y Validación (15 filas)                  │
├─────────────────────────────────────────────────────┤
│ FILA │ EMPLEADO   │ PLANTILLA       │ ESTADO       │
├─────────────────────────────────────────────────────┤
│ 1    │ TMNW00001  │ oficina-40h     │ ✅ Válido    │
│ 2    │ TMNW00002  │ policia-6x6     │ ✅ Válido    │
│ 3    │ TMNW99999  │ -               │ ❌ No existe │
│ 4    │ TMNW00004  │ plantilla-fake  │ ❌ No existe │
│ 5    │ TMNW00005  │ teletrabajo     │ ✅ Válido    │
└─────────────────────────────────────────────────────┘

⚠️ Errores encontrados: 2
- Fila 3: Empleado TMNW99999 no encontrado
- Fila 4: Plantilla 'plantilla-fake' no existe

[← Atrás]  [Importar solo válidos (13 filas) →]
```

---

#### Paso 3: Mapeo de columnas (si es necesario)

Si las columnas del CSV no coinciden:

```
┌─────────────────────────────────────────────┐
│ 🔗 Mapeo de Columnas                        │
├─────────────────────────────────────────────┤
│ Columna CSV         →  Campo Sistema        │
├─────────────────────────────────────────────┤
│ employee_code       →  [empleado_numero ▼]  │
│ template_name       →  [plantilla_horario▼] │
│ start_date          →  [fecha_desde ▼]      │
│ end_date            →  [fecha_hasta ▼]      │
└─────────────────────────────────────────────┘

[← Atrás]  [Continuar →]
```

---

#### Paso 4: Importación

```
┌─────────────────────────────────────────────┐
│ ⏳ Importando horarios...                   │
├─────────────────────────────────────────────┤
│ Progreso: ████████████░░░░  75% (10/13)    │
│                                             │
│ ✅ TMNW00001 - Asignado correctamente       │
│ ✅ TMNW00002 - Asignado correctamente       │
│ ...                                         │
└─────────────────────────────────────────────┘
```

**Resumen final:**

```
✅ Importación completada

📊 Resumen:
- Total filas procesadas: 15
- Importadas correctamente: 13
- Errores: 2

[Ver errores] [Descargar log] [Finalizar]
```

---

### Exportación Legal (PDF/Excel)

#### Reporte Mensual de Horario (PDF)

**Server Action:**
```typescript
await exportScheduleReport(
  'emp_123',
  new Date('2025-10-01'),
  'PDF'
)
```

**Formato del PDF:**

```
┌───────────────────────────────────────────────────┐
│  REGISTRO DE JORNADA - OCTUBRE 2025              │
│  Empleado: Juan Pérez (TMNW00001)                │
│  Horario: Oficina 40h L-V                        │
└───────────────────────────────────────────────────┘

┌──────┬────────────┬──────────┬──────────┬─────────┐
│ DÍA  │ HORARIO    │ FICHAJES │ TRABAJADO│ DESV.   │
├──────┼────────────┼──────────┼──────────┼─────────┤
│ 1 Lu │ 09:00-18:00│ 08:55    │ 8h 10m   │ +10m    │
│      │            │ 18:05    │          │         │
├──────┼────────────┼──────────┼──────────┼─────────┤
│ 2 Ma │ 09:00-18:00│ 09:02    │ 8h 5m    │ +5m     │
│      │            │ 18:07    │          │         │
├──────┼────────────┼──────────┼──────────┼─────────┤
│ 3 Mi │ 09:00-18:00│ 09:00    │ 8h 0m    │  0m     │
│      │            │ 18:00    │          │         │
├──────┼────────────┼──────────┼──────────┼─────────┤
│ ...  │            │          │          │         │
└──────┴────────────┴──────────┴──────────┴─────────┘

RESUMEN:
- Horas esperadas: 160h
- Horas trabajadas: 162h 30m
- Desviación: +2h 30m (+1.56%)
- Días trabajados: 20
- Ausencias: 2 (vacaciones)

Fecha de generación: 2025-11-01 10:30:45
Firma digital: SHA256:a3f2c9...

───────────────────────────────────────────────────
Este documento es legal y vinculante según RD 1561/1995
```

---

#### Export Masivo (Excel)

**Server Action:**
```typescript
await exportSchedulesToExcel({
  employeeIds: ['emp_1', 'emp_2', 'emp_3']
})
```

**Hojas del Excel:**

1. **Hoja 1: Horarios Asignados**
   - Empleado | Plantilla | Tipo | Desde | Hasta

2. **Hoja 2: Fichajes del Mes**
   - Empleado | Fecha | Entrada | Salida | Trabajado | Esperado | Desv.

3. **Hoja 3: Desviaciones**
   - Empleado | Fecha | Tipo | Minutos | Motivo

4. **Hoja 4: Alertas**
   - Empleado | Fecha | Tipo | Severidad | Mensaje

---

## 📚 Documentos Relacionados

- [Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)
- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md)
- [Arquitectura](./ARQUITECTURA_HORARIOS_V2.md)

---

**Versión:** 1.0
**Última actualización:** 2025-11-19
**Estado:** Pendiente de implementación ⚠️
**Autor:** Sistema de Planificación ERP TimeNow
