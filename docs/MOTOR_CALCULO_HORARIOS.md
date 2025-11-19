# Motor de Cálculo de Horarios

**Fecha:** 2025-11-19
**Versión:** 1.0
**Estado:** Implementado ✅

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)
← [Ver Arquitectura](./ARQUITECTURA_HORARIOS_V2.md)

**Documentos relacionados:**
- [Server Actions](./SERVER_ACTIONS_HORARIOS.md)
- [Guía de UI](./GUIA_UI_HORARIOS.md)
- [Validaciones](./VALIDACIONES_Y_CONFIGURACION.md)

---

## 📚 Índice

1. [Descripción General](#descripción-general)
2. [Funciones Principales](#funciones-principales)
3. [Lógica de Prioridades](#lógica-de-prioridades)
4. [Tipos TypeScript](#tipos-typescript)
5. [Integración con Excepciones Globales](#integración-con-excepciones-globales)

---

## 📋 Descripción General

**Archivo:** `/src/lib/schedule-engine.ts`

El motor de cálculo es el **corazón del sistema de horarios V2.0**. Implementa toda la lógica para:

- Resolver el horario efectivo de un empleado en cualquier fecha
- Calcular horas esperadas en rangos de fechas
- Validar fichajes contra el horario asignado
- Manejar rotaciones, periodos especiales y excepciones

**Estado:** ✅ Completamente implementado (Sprint 3)

---

## 🔧 Funciones Principales

### `getEffectiveSchedule()`

**Firma:**
```typescript
export async function getEffectiveSchedule(
  employeeId: string,
  date: Date
): Promise<EffectiveSchedule>
```

**Descripción:**
Obtiene el horario efectivo para un empleado en una fecha específica, aplicando toda la lógica de prioridades.

**Retorna:**
```typescript
{
  date: Date
  isWorkingDay: boolean
  expectedMinutes: number
  timeSlots: EffectiveTimeSlot[]
  source: 'EXCEPTION' | 'PERIOD' | 'TEMPLATE' | 'ABSENCE' | 'NO_ASSIGNMENT'
  periodName?: string
  absence?: { type: string, reason?: string }
  exceptionType?: string
  exceptionReason?: string
}
```

**Ejemplo de uso:**
```typescript
const schedule = await getEffectiveSchedule('emp_123', new Date('2025-11-19'))

console.log(schedule.isWorkingDay) // true
console.log(schedule.expectedMinutes) // 480 (8 horas)
console.log(schedule.timeSlots) // [{ startMinutes: 540, endMinutes: 1020, ... }]
```

---

### `calculateExpectedHours()`

**Firma:**
```typescript
export async function calculateExpectedHours(
  employeeId: string,
  from: Date,
  to: Date
): Promise<number>
```

**Descripción:**
Calcula las horas totales esperadas en un rango de fechas (útil para reportes mensuales).

**Ejemplo:**
```typescript
// Horas esperadas en noviembre 2025
const hours = await calculateExpectedHours(
  'emp_123',
  new Date('2025-11-01'),
  new Date('2025-11-30')
)
console.log(hours) // 160 (aproximadamente 20 días laborables × 8h)
```

---

### `validateTimeEntry()`

**Firma:**
```typescript
export async function validateTimeEntry(
  employeeId: string,
  timestamp: Date,
  entryType: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'
): Promise<ValidationResult>
```

**Descripción:**
Valida si un fichaje cumple el horario esperado, aplicando tolerancias configurables.

**Retorna:**
```typescript
{
  isValid: boolean
  warnings: string[]  // Ej: ["Fichaje tardío: 20 minutos de retraso"]
  errors: string[]    // Ej: ["No está permitido fichar en días no laborables"]
  expectedSlot?: EffectiveTimeSlot
  actualSlot?: { startMinutes: number, endMinutes: number }
  deviationMinutes?: number
}
```

**Integración con configuraciones:**

Usa los parámetros configurables de la organización:
- `clockInToleranceMinutes` - Tolerancia para entrada
- `clockOutToleranceMinutes` - Tolerancia para salida
- `nonWorkdayClockInAllowed` - Permitir fichajes en días no laborables

**Ejemplo:**
```typescript
const validation = await validateTimeEntry(
  'emp_123',
  new Date('2025-11-19 09:20:00'),
  'CLOCK_IN'
)

console.log(validation.warnings) // ["Fichaje tardío: 20 minutos de retraso"]
console.log(validation.deviationMinutes) // 20
```

---

### `getNextPeriodChange()`

**Firma:**
```typescript
export async function getNextPeriodChange(
  employeeId: string,
  fromDate: Date
): Promise<PeriodChange | null>
```

**Descripción:**
Obtiene el próximo cambio de periodo (ej: cambio a jornada intensiva de verano).

**Retorna:**
```typescript
{
  fromPeriod: {
    type: string
    name?: string
    endDate: Date
  }
  toPeriod: {
    type: string
    name?: string
    startDate: Date
  }
}
```

**Ejemplo:**
```typescript
// En marzo 2025, obtener próximo cambio
const change = await getNextPeriodChange('emp_123', new Date('2025-03-15'))

console.log(change)
// {
//   fromPeriod: { type: 'REGULAR', endDate: '2025-06-14' },
//   toPeriod: { type: 'INTENSIVE', name: 'Verano', startDate: '2025-06-15' }
// }
```

---

### `getWeekSchedule()`

**Firma:**
```typescript
export async function getWeekSchedule(
  employeeId: string,
  weekStart: Date
): Promise<WeekSchedule>
```

**Descripción:**
Obtiene el horario completo de una semana (L-D) para mostrar en calendario.

**Retorna:**
```typescript
{
  weekStart: Date
  weekEnd: Date
  days: EffectiveSchedule[]  // 7 elementos (L-D)
  totalExpectedMinutes: number
}
```

**Ejemplo de uso en UI:**
```typescript
const week = await getWeekSchedule('emp_123', startOfWeek(new Date()))

week.days.forEach(day => {
  console.log(`${format(day.date, 'EEEE')}: ${day.expectedMinutes / 60}h`)
})
// Lunes: 8h
// Martes: 8h
// Miércoles: 8h
// Jueves: 8h
// Viernes: 8h
// Sábado: 0h
// Domingo: 0h

console.log(`Total semana: ${week.totalExpectedMinutes / 60}h`) // 40h
```

---

## 🎯 Lógica de Prioridades

**Orden de resolución (mayor a menor prioridad):**

```
1. AbsenceRequest (vacaciones/permisos) → No trabaja (o parcial)
   ↓
2. ExceptionDayOverride (días específicos)
   ├─ Empleado específico (mayor prioridad)
   ├─ Plantilla
   ├─ Departamento
   ├─ Centro de costes
   └─ Global (menor prioridad)
   ↓
3. SchedulePeriod activo (SPECIAL > INTENSIVE > REGULAR)
   ↓
4. ScheduleTemplate base (periodo REGULAR)
```

### Pseudocódigo Completo

```typescript
function getEffectiveSchedule(employeeId, date) {
  // 1. Verificar ausencias (vacaciones, permisos)
  const absence = await getAbsenceForDate(employeeId, date)
  if (absence) {
    return { isWorkingDay: false, source: 'ABSENCE', absence }
  }

  // 2. Buscar excepción de día (con prioridades)
  const exception = await getExceptionForDate(employeeId, date)
  if (exception) {
    return buildScheduleFromException(exception, 'EXCEPTION')
  }

  // 3. Obtener asignación activa del empleado
  const assignment = await getActiveAssignment(employeeId, date)
  if (!assignment) {
    return { isWorkingDay: false, source: 'NO_ASSIGNMENT' }
  }

  // 4. Si es rotación, calcular qué step toca
  if (assignment.assignmentType === 'ROTATION') {
    const step = calculateRotationStep(assignment, date)
    const template = step.scheduleTemplate
  } else {
    const template = assignment.scheduleTemplate
  }

  // 5. Buscar periodo activo (SPECIAL > INTENSIVE > REGULAR)
  const period = await getActivePeriod(template, date)

  // 6. Obtener patrón del día de semana
  const dayOfWeek = date.getDay()
  const pattern = await getWorkDayPattern(period, dayOfWeek)

  if (!pattern.isWorkingDay) {
    return { isWorkingDay: false, source: 'PERIOD' }
  }

  // 7. Obtener time slots
  const slots = await getTimeSlots(pattern)

  return {
    isWorkingDay: true,
    expectedMinutes: calculateTotalMinutes(slots),
    timeSlots: slots,
    source: 'PERIOD',
    periodName: period.name ?? period.periodType
  }
}
```

---

## 📐 Algoritmo de Rotaciones

**Función:** `calculateRotationStep()`

**Descripción:**
Algoritmo 100% genérico que funciona con CUALQUIER patrón de rotación usando módulo aritmético.

**Pseudocódigo:**
```typescript
function calculateRotationStep(assignment, targetDate) {
  const rotationPattern = assignment.rotationPattern
  const rotationStartDate = assignment.rotationStartDate
  const steps = rotationPattern.steps.sort((a, b) => a.stepOrder - b.stepOrder)

  // Días transcurridos desde inicio de rotación
  const daysSinceStart = Math.floor(
    (targetDate - rotationStartDate) / MS_PER_DAY
  )

  // Duración total del ciclo completo
  const cycleDuration = steps.reduce((sum, step) => sum + step.durationDays, 0)

  // Día dentro del ciclo actual (módulo)
  const dayInCycle = daysSinceStart % cycleDuration

  // Encontrar qué step corresponde
  let accumulated = 0
  for (const step of steps) {
    if (dayInCycle < accumulated + step.durationDays) {
      return step
    }
    accumulated += step.durationDays
  }

  // Nunca debería llegar aquí si los datos son válidos
  return steps[0]
}
```

**Ejemplos:**

### Policía 6x6
```
Rotación:
  Step 1: 6 días → Turno Mañana
  Step 2: 6 días → Descanso

Ciclo completo: 12 días

Si rotationStartDate = 2025-01-01:
  - 2025-01-01 → Día 0 → 0 % 12 = 0 → Step 1 (Turno Mañana)
  - 2025-01-03 → Día 2 → 2 % 12 = 2 → Step 1 (Turno Mañana)
  - 2025-01-07 → Día 6 → 6 % 12 = 6 → Step 2 (Descanso)
  - 2025-01-13 → Día 12 → 12 % 12 = 0 → Step 1 (Turno Mañana) ← Reinicia ciclo
```

### Bomberos 24x72
```
Rotación:
  Step 1: 1 día → Turno 24h
  Step 2: 3 días → Descanso

Ciclo completo: 4 días

Si rotationStartDate = 2025-01-01:
  - 2025-01-01 → Día 0 → 0 % 4 = 0 → Step 1 (Turno 24h)
  - 2025-01-02 → Día 1 → 1 % 4 = 1 → Step 2 (Descanso)
  - 2025-01-03 → Día 2 → 2 % 4 = 2 → Step 2 (Descanso)
  - 2025-01-04 → Día 3 → 3 % 4 = 3 → Step 2 (Descanso)
  - 2025-01-05 → Día 4 → 4 % 4 = 0 → Step 1 (Turno 24h) ← Reinicia ciclo
```

---

## 🔗 Integración con Excepciones Globales

**Implementación completada:** ✅ 2025-11-19

### Función `getExceptionForDate()`

**Descripción:**
Busca excepciones aplicables a un empleado en una fecha, con prioridad de scope.

**Prioridad de excepciones (específico → general):**
1. Empleado específico (`employeeId`)
2. Plantilla (`scheduleTemplateId`)
3. Departamento (`departmentId`)
4. Centro de costes (`costCenterId`)
5. Global (`isGlobal=true`)

**Soporte para:**
- Excepciones de fecha única (`date`)
- Excepciones recurrentes anuales (`recurringDate`)
- Rangos de fechas (`dateRangeStart`, `dateRangeEnd`)

**Pseudocódigo:**
```typescript
async function getExceptionForDate(employeeId, date) {
  const employee = await getEmployee(employeeId)
  const assignment = await getActiveAssignment(employeeId, date)

  // Buscar excepciones en orden de prioridad
  const exceptions = await prisma.exceptionDayOverride.findMany({
    where: {
      orgId: employee.orgId,
      OR: [
        // 1. Empleado específico
        { employeeId },
        // 2. Plantilla
        { scheduleTemplateId: assignment?.scheduleTemplateId },
        // 3. Departamento
        { departmentId: employee.department?.id },
        // 4. Centro de costes
        { costCenterId: employee.costCenter?.id },
        // 5. Global
        { isGlobal: true },
      ],
      // Validar fechas
      OR: [
        { date: startOfDay(date) },
        { recurringDate: format(date, 'MM-dd') },
        {
          dateRangeStart: { lte: date },
          dateRangeEnd: { gte: date },
        },
      ],
    },
    orderBy: [
      // Orden de prioridad en la query
      { employeeId: { sort: 'desc', nulls: 'last' } },
      { scheduleTemplateId: { sort: 'desc', nulls: 'last' } },
      { departmentId: { sort: 'desc', nulls: 'last' } },
      { costCenterId: { sort: 'desc', nulls: 'last' } },
      { isGlobal: 'desc' },
    ],
  })

  // Retornar la primera (más específica)
  return exceptions[0] ?? null
}
```

### Función `buildScheduleFromException()`

**Descripción:**
Construye un horario efectivo desde una excepción.

**Soporta:**
- Excepciones tipo `HOLIDAY` (día no laboral completo)
- Excepciones con slots personalizados (horario reducido)

**Pseudocódigo:**
```typescript
function buildScheduleFromException(exception, source) {
  // Si es festivo/día no laboral
  if (exception.exceptionType === 'HOLIDAY') {
    return {
      isWorkingDay: false,
      expectedMinutes: 0,
      timeSlots: [],
      source,
      exceptionType: exception.exceptionType,
      exceptionReason: exception.reason,
    }
  }

  // Si tiene slots personalizados
  if (exception.overrideSlots.length > 0) {
    const slots = exception.overrideSlots.map(slot => ({
      startMinutes: slot.startTimeMinutes,
      endMinutes: slot.endTimeMinutes,
      slotType: slot.slotType,
      presenceType: slot.presenceType,
    }))

    const expectedMinutes = slots.reduce(
      (sum, slot) => sum + (slot.endMinutes - slot.startMinutes),
      0
    )

    return {
      isWorkingDay: true,
      expectedMinutes,
      timeSlots: slots,
      source,
      exceptionType: exception.exceptionType,
      exceptionReason: exception.reason,
    }
  }

  // Sin slots = día no laboral
  return {
    isWorkingDay: false,
    expectedMinutes: 0,
    timeSlots: [],
    source,
  }
}
```

---

## 📊 Tipos TypeScript

**Archivo:** `/src/types/schedule.ts`

### `EffectiveSchedule`

```typescript
export interface EffectiveSchedule {
  date: Date
  isWorkingDay: boolean
  expectedMinutes: number
  timeSlots: EffectiveTimeSlot[]
  source: 'EXCEPTION' | 'PERIOD' | 'TEMPLATE' | 'ABSENCE' | 'NO_ASSIGNMENT'
  periodName?: string
  absence?: {
    type: string
    reason?: string
  }
  exceptionType?: string    // ✅ Añadido para excepciones
  exceptionReason?: string  // ✅ Añadido para excepciones
}
```

### `EffectiveTimeSlot`

```typescript
export interface EffectiveTimeSlot {
  startMinutes: number // 0-1440
  endMinutes: number   // 0-1440
  slotType: 'WORK' | 'BREAK' | 'ON_CALL' | 'OTHER'
  presenceType: 'MANDATORY' | 'FLEXIBLE'
  isMandatory: boolean
  description?: string
}
```

### `ValidationResult`

```typescript
export interface ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  expectedSlot?: EffectiveTimeSlot
  actualSlot?: {
    startMinutes: number
    endMinutes: number
  }
  deviationMinutes?: number
}
```

### `PeriodChange`

```typescript
export interface PeriodChange {
  fromPeriod: {
    type: string
    name?: string
    endDate: Date
  }
  toPeriod: {
    type: string
    name?: string
    startDate: Date
  }
}
```

### `WeekSchedule`

```typescript
export interface WeekSchedule {
  weekStart: Date
  weekEnd: Date
  days: EffectiveSchedule[]  // 7 elementos
  totalExpectedMinutes: number
}
```

---

## 📚 Documentos Relacionados

- [Arquitectura](./ARQUITECTURA_HORARIOS_V2.md) - Modelos de datos
- [Server Actions](./SERVER_ACTIONS_HORARIOS.md) - API de backend
- [Guía de UI](./GUIA_UI_HORARIOS.md) - Integración con componentes
- [Validaciones](./VALIDACIONES_Y_CONFIGURACION.md) - Sistema de validaciones configurables

---

**Versión:** 1.0
**Última actualización:** 2025-11-19
**Autor:** Sistema de Planificación ERP TimeNow
