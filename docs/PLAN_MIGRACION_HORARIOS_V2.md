# PLAN: Sistema de Horarios Flexible v2.0

**Fecha:** 2025-11-17
**Estado:** Planificación
**Tipo:** Migración Breaking Change

---

## 🎯 Objetivo

Crear un sistema de horarios completamente nuevo, desacoplado y flexible que soporte:

- ✅ Sector privado y público (funcionarios, policía, bomberos)
- ✅ Periodos especiales (Semana Santa, verano, Navidad)
- ✅ Turnos rotativos (24x72, 6x6, etc.)
- ✅ Horarios con precisión de minutos (ej: 9:12, 12:48)
- ✅ Franjas fijas + flexibles (sector público)
- ✅ Total flexibilidad para futuros casos de uso

---

## 📊 Análisis del Sistema Actual

### Problemas Identificados

1. **Acoplamiento excesivo**: 100+ campos de horarios en `EmploymentContract`
2. **Inflexibilidad**: No soporta rotaciones (policía, bomberos)
3. **Limitaciones**: Solo 2 periodos (REGULAR + INTENSIVE)
4. **Repetición**: Campos duplicados para cada día de la semana
5. **Dificultad de mantenimiento**: Cambiar un horario requiere modificar múltiples campos

### Campos Actuales a Eliminar

**De `EmploymentContract` (100+ campos):**

- `scheduleType`, `hasFixedTimeSlots`, `hasCustomWeeklyPattern`, `hasIntensiveSchedule`
- `mondayStartTime` hasta `sundayEndTime` (56 campos)
- `mondayBreakStartTime` hasta `sundayBreakEndTime` (14 campos)
- `intensiveMondayStartTime` hasta `intensiveSundayEndTime` (28 campos)
- `intensiveMondayBreakStartTime` hasta `intensiveSundayBreakEndTime` (14 campos)
- `mondayHours` hasta `sundayHours` (14 campos)
- `workMonday` hasta `workSunday` (7 campos)

**Campos a MANTENER en `EmploymentContract`:**

- `weeklyHours` (horas semanales contractuales)
- `workingDaysPerWeek` (días laborables)
- `grossSalary`, `startDate`, `endDate`, `contractType`

---

## 📋 FASE 1: Nuevo Modelo de Datos Prisma

### 1.1 Modelos Principales

#### `ScheduleTemplate` (Plantilla de Horario)

Plantilla base que define un patrón de horario reutilizable.

```prisma
model ScheduleTemplate {
  id              String   @id @default(cuid())
  name            String   // "Horario oficina central", "Turno 24h bomberos"
  description     String?
  templateType    ScheduleTemplateType // FIXED, SHIFT, ROTATION, FLEXIBLE
  isActive        Boolean  @default(true)

  // Multi-tenancy
  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Relaciones
  periods         SchedulePeriod[]
  employeeAssignments EmployeeScheduleAssignment[]
  rotationSteps   ShiftRotationStep[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([orgId])
  @@map("schedule_templates")
}

enum ScheduleTemplateType {
  FIXED      // Horario fijo (oficina, tienda)
  SHIFT      // Turno (mañana, tarde, noche)
  ROTATION   // Rotación (policía 6x6, bomberos 24x72)
  FLEXIBLE   // Flexible (teletrabajo, autónomos)
}
```

**Ejemplos:**
- "Horario Oficina 40h L-V" (FIXED)
- "Turno Noche" (SHIFT)
- "Rotación Policía 6x6" (ROTATION)
- "Teletrabajo Flexible" (FLEXIBLE)

---

#### `SchedulePeriod` (Periodo de Vigencia)

Define periodos temporales dentro de una plantilla (regular, verano, Semana Santa).

```prisma
model SchedulePeriod {
  id              String   @id @default(cuid())
  scheduleTemplateId String
  scheduleTemplate ScheduleTemplate @relation(fields: [scheduleTemplateId], references: [id], onDelete: Cascade)

  periodType      SchedulePeriodType
  name            String?  // "Verano 2025", "Semana Santa", "Campaña Navidad"

  // Fechas de vigencia (null = permanente/REGULAR)
  validFrom       DateTime? // null = desde siempre
  validTo         DateTime? // null = hasta siempre

  // Patrón de días laborables
  workDayPatterns WorkDayPattern[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([scheduleTemplateId])
  @@map("schedule_periods")
}

enum SchedulePeriodType {
  REGULAR     // Horario habitual todo el año
  INTENSIVE   // Jornada intensiva (verano)
  SPECIAL     // Especial (Navidad, Semana Santa, campañas)
}
```

**Ejemplos:**
- **REGULAR**: `validFrom=null, validTo=null` → Todo el año
- **INTENSIVE (verano)**: `validFrom=2025-06-15, validTo=2025-09-01`
- **SPECIAL (Semana Santa)**: `validFrom=2025-04-14, validTo=2025-04-20`

---

#### `WorkDayPattern` (Patrón de Día de Semana)

Define cómo se trabaja cada día de la semana dentro de un periodo.

```prisma
model WorkDayPattern {
  id              String   @id @default(cuid())
  schedulePeriodId String
  schedulePeriod  SchedulePeriod @relation(fields: [schedulePeriodId], references: [id], onDelete: Cascade)

  dayOfWeek       Int      // 0=Domingo, 1=Lunes, ..., 6=Sábado (ISO 8601)
  isWorkingDay    Boolean  @default(true)

  // Tramos horarios de ese día
  timeSlots       TimeSlot[]

  @@index([schedulePeriodId])
  @@map("work_day_patterns")
}
```

**Ejemplos:**
- Lunes (1): `isWorkingDay=true`, con TimeSlots de 9:00-18:00
- Sábado (6): `isWorkingDay=false`, sin TimeSlots
- Domingo (0): `isWorkingDay=false`, sin TimeSlots

---

#### `TimeSlot` (Tramo Horario)

Tramo de tiempo específico con tipo y presencia (obligatoria/flexible).

```prisma
model TimeSlot {
  id              String   @id @default(cuid())
  workDayPatternId String
  workDayPattern  WorkDayPattern @relation(fields: [workDayPatternId], references: [id], onDelete: Cascade)

  startTimeMinutes Int     // 0-1440 (minutos desde medianoche)
  endTimeMinutes   Int     // 0-1440

  slotType        TimeSlotType
  presenceType    PresenceType  // MANDATORY (presencia obligatoria) o FLEXIBLE

  description     String?  // "Pausa comida", "Guardia localizada"

  @@index([workDayPatternId])
  @@map("time_slots")
}

enum TimeSlotType {
  WORK       // Tiempo de trabajo
  BREAK      // Pausa/descanso
  ON_CALL    // Guardia localizada
  OTHER      // Otro
}

enum PresenceType {
  MANDATORY  // Presencia obligatoria (sector público: 9:00-14:30)
  FLEXIBLE   // Flexible (sector público: 7:00-9:00 y 14:30-16:00)
}
```

**Ejemplos (Sector Público con Flex):**
- 07:00-09:00 → `WORK FLEXIBLE` (puede entrar en esta franja)
- 09:00-14:30 → `WORK MANDATORY` (presencia obligatoria)
- 14:30-16:00 → `WORK FLEXIBLE` (puede salir en esta franja)

**Ejemplos (Oficina Normal):**
- 09:00-14:00 → `WORK MANDATORY`
- 14:00-15:00 → `BREAK MANDATORY`
- 15:00-18:00 → `WORK MANDATORY`

**Ejemplos (Bomberos 24h):**
- 00:00-24:00 → `WORK MANDATORY` (un solo slot de 1440 minutos)

---

#### `ShiftRotationPattern` + `ShiftRotationStep` (Rotaciones)

Para patrones tipo policía (6x6) o bomberos (24x72).

```prisma
model ShiftRotationPattern {
  id              String   @id @default(cuid())
  name            String   // "Policía 6x6", "Bomberos 24x72"
  description     String?

  // Multi-tenancy
  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Pasos de la rotación
  steps           ShiftRotationStep[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([orgId])
  @@map("shift_rotation_patterns")
}

model ShiftRotationStep {
  id              String   @id @default(cuid())
  rotationPatternId String
  rotationPattern ShiftRotationPattern @relation(fields: [rotationPatternId], references: [id], onDelete: Cascade)

  stepOrder       Int      // Orden en la rotación (1, 2, 3...)
  durationDays    Int      // Duración en días

  scheduleTemplateId String
  scheduleTemplate ScheduleTemplate @relation(fields: [scheduleTemplateId], references: [id])

  @@index([rotationPatternId])
  @@map("shift_rotation_steps")
}
```

**Ejemplo Policía 6x6:**

```
ShiftRotationPattern "Policía 6x6"
  Step 1: order=1, durationDays=6, scheduleTemplateId="TurnoMañana"
  Step 2: order=2, durationDays=6, scheduleTemplateId="TurnoDescanso"
```

**Ejemplo Bomberos 24x72:**

```
ShiftRotationPattern "Bomberos 24x72"
  Step 1: order=1, durationDays=1, scheduleTemplateId="Turno24h"
  Step 2: order=2, durationDays=3, scheduleTemplateId="Descanso"
```

---

#### `EmployeeScheduleAssignment` (Asignación a Empleado)

Asigna una plantilla o rotación a un empleado con vigencia temporal.

```prisma
model EmployeeScheduleAssignment {
  id              String   @id @default(cuid())

  employeeId      String
  employee        Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  assignmentType  ScheduleAssignmentType

  // Para FIXED/SHIFT/FLEXIBLE
  scheduleTemplateId String?
  scheduleTemplate ScheduleTemplate? @relation(fields: [scheduleTemplateId], references: [id])

  // Para ROTATION
  rotationPatternId String?
  rotationPattern ShiftRotationPattern? @relation(fields: [rotationPatternId], references: [id])
  rotationStartDate DateTime? // Fecha inicio de la rotación

  // Vigencia de la asignación
  validFrom       DateTime  @default(now())
  validTo         DateTime? // null = indefinido

  isActive        Boolean   @default(true)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([employeeId])
  @@map("employee_schedule_assignments")
}

enum ScheduleAssignmentType {
  FIXED      // Horario fijo asignado
  SHIFT      // Turno asignado
  ROTATION   // Rotación asignada
  FLEXIBLE   // Flexible (sin horario fijo)
}
```

**Ejemplos:**
- Juan Pérez: `FIXED`, "Horario Oficina", desde 2025-01-01, indefinido
- Pedro García: `ROTATION`, "Policía 6x6", desde 2025-01-15, rotationStartDate=2025-01-15
- Ana López: `FLEXIBLE`, null, teletrabajo sin horario fijo

---

#### `ExceptionDayOverride` + `ExceptionTimeSlot` (Excepciones)

Para días sueltos o circunstancias raras (Viernes Santo 12:48h, cierre excepcional).

```prisma
model ExceptionDayOverride {
  id              String   @id @default(cuid())

  // Puede aplicar a un empleado específico o a toda la plantilla
  employeeId      String?
  employee        Employee? @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  scheduleTemplateId String?
  scheduleTemplate ScheduleTemplate? @relation(fields: [scheduleTemplateId], references: [id])

  date            DateTime  // Día específico
  reason          String?   // "Viernes Santo", "Cierre excepcional"

  // Slots específicos para ese día
  overrideSlots   ExceptionTimeSlot[]

  // Multi-tenancy
  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([employeeId])
  @@index([orgId])
  @@index([date])
  @@map("exception_day_overrides")
}

model ExceptionTimeSlot {
  id              String   @id @default(cuid())
  exceptionDayId  String
  exceptionDay    ExceptionDayOverride @relation(fields: [exceptionDayId], references: [id], onDelete: Cascade)

  startTimeMinutes Int
  endTimeMinutes   Int
  slotType        TimeSlotType
  presenceType    PresenceType

  @@index([exceptionDayId])
  @@map("exception_time_slots")
}
```

**Ejemplos:**
- Viernes Santo: `date=2025-04-18, reason="Viernes Santo"`, slot 09:00-12:48 (minutos: 540-768)
- Cierre excepcional: `date=2025-12-24, reason="Nochebuena"`, slot 09:00-14:00

---

### 1.2 Actualizar Modelos Existentes

#### `Employee`

```prisma
model Employee {
  // ... campos existentes ...

  // NUEVA relación
  scheduleAssignments EmployeeScheduleAssignment[]
  exceptionDays       ExceptionDayOverride[]
}
```

#### `Organization`

```prisma
model Organization {
  // ... campos existentes ...

  // NUEVAS relaciones
  scheduleTemplates   ScheduleTemplate[]
  rotationPatterns    ShiftRotationPattern[]
  exceptionDays       ExceptionDayOverride[]
}
```

---

## 📋 FASE 2: Motor de Cálculo de Horarios (`schedule-engine.ts`)

### 2.1 Funciones Principales

**Archivo:** `/src/lib/schedule-engine.ts`

```typescript
/**
 * Motor de cálculo de horarios efectivos.
 * Implementa la lógica de prioridades para resolver el horario de un empleado.
 */

// Obtener horario efectivo para un empleado en una fecha
export async function getEffectiveSchedule(
  employeeId: string,
  date: Date
): Promise<EffectiveSchedule>

// Calcular horas esperadas en un rango de fechas
export async function calculateExpectedHours(
  employeeId: string,
  from: Date,
  to: Date
): Promise<number>

// Validar si un fichaje cumple el horario
export async function validateTimeEntry(
  employeeId: string,
  timestamp: Date,
  entryType: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'
): Promise<ValidationResult>

// Obtener próximo cambio de periodo (verano → regular)
export async function getNextPeriodChange(
  employeeId: string,
  fromDate: Date
): Promise<PeriodChange | null>

// Obtener horario de una semana completa
export async function getWeekSchedule(
  employeeId: string,
  weekStart: Date
): Promise<WeekSchedule>
```

### 2.2 Lógica de Prioridades

**Orden de resolución (mayor a menor prioridad):**

1. **`AbsenceRequest`** (vacaciones/permisos) → No trabaja, horario anulado
2. **`ExceptionDayOverride`** (día específico para ese empleado/plantilla)
3. **`SchedulePeriod`** activo (SPECIAL > INTENSIVE > REGULAR por fechas)
4. **`ScheduleTemplate`** base (periodo REGULAR por defecto)

**Pseudocódigo:**

```typescript
function getEffectiveSchedule(employeeId, date) {
  // 1. Verificar ausencias (vacaciones, permisos)
  const absence = await getAbsenceForDate(employeeId, date)
  if (absence) {
    return { isWorkingDay: false, source: 'ABSENCE', absence }
  }

  // 2. Buscar excepción de día
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

### 2.3 Types

**Archivo:** `/src/types/schedule.ts`

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
}

export interface EffectiveTimeSlot {
  startMinutes: number // 0-1440
  endMinutes: number   // 0-1440
  slotType: 'WORK' | 'BREAK' | 'ON_CALL' | 'OTHER'
  presenceType: 'MANDATORY' | 'FLEXIBLE'
  isMandatory: boolean
  description?: string
}

export interface ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  expectedSlot?: EffectiveTimeSlot
  actualSlot?: {
    startMinutes: number
    endMinutes: number
  }
}

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

export interface WeekSchedule {
  weekStart: Date
  weekEnd: Date
  days: EffectiveSchedule[]
  totalExpectedMinutes: number
}
```

---

## 📋 FASE 3: Server Actions

### 3.1 CRUD de Plantillas

**Archivo:** `/src/server/actions/schedules-v2.ts`

```typescript
// ========================================
// CRUD de ScheduleTemplate
// ========================================

export async function createScheduleTemplate(data: {
  name: string
  description?: string
  templateType: ScheduleTemplateType
}): Promise<{ success: boolean; data?: ScheduleTemplate; error?: string }>

export async function updateScheduleTemplate(
  id: string,
  data: Partial<ScheduleTemplate>
): Promise<{ success: boolean; error?: string }>

export async function deleteScheduleTemplate(
  id: string
): Promise<{ success: boolean; error?: string }>

export async function duplicateScheduleTemplate(
  id: string,
  newName: string
): Promise<{ success: boolean; data?: ScheduleTemplate; error?: string }>

export async function getScheduleTemplates(
  filters?: { templateType?: ScheduleTemplateType; isActive?: boolean }
): Promise<ScheduleTemplate[]>

// ========================================
// Gestión de SchedulePeriod
// ========================================

export async function createSchedulePeriod(
  templateId: string,
  data: {
    periodType: SchedulePeriodType
    name?: string
    validFrom?: Date
    validTo?: Date
  }
): Promise<{ success: boolean; data?: SchedulePeriod; error?: string }>

export async function updateSchedulePeriod(
  id: string,
  data: Partial<SchedulePeriod>
): Promise<{ success: boolean; error?: string }>

export async function deleteSchedulePeriod(
  id: string
): Promise<{ success: boolean; error?: string }>

// ========================================
// Gestión de WorkDayPattern + TimeSlot
// ========================================

export async function updateWorkDayPattern(
  periodId: string,
  dayOfWeek: number,
  data: {
    isWorkingDay: boolean
    timeSlots: Array<{
      startTimeMinutes: number
      endTimeMinutes: number
      slotType: TimeSlotType
      presenceType: PresenceType
      description?: string
    }>
  }
): Promise<{ success: boolean; error?: string }>

// ========================================
// Asignación a Empleados
// ========================================

export async function assignScheduleToEmployee(
  employeeId: string,
  data: {
    assignmentType: ScheduleAssignmentType
    scheduleTemplateId?: string
    rotationPatternId?: string
    rotationStartDate?: Date
    validFrom: Date
    validTo?: Date
  }
): Promise<{ success: boolean; data?: EmployeeScheduleAssignment; error?: string }>

export async function getEmployeeScheduleHistory(
  employeeId: string
): Promise<EmployeeScheduleAssignment[]>

export async function getEmployeeCurrentSchedule(
  employeeId: string,
  date?: Date
): Promise<EmployeeScheduleAssignment | null>

// ========================================
// Excepciones de Día
// ========================================

export async function createExceptionDay(data: {
  employeeId?: string
  scheduleTemplateId?: string
  date: Date
  reason?: string
  overrideSlots: Array<{
    startTimeMinutes: number
    endTimeMinutes: number
    slotType: TimeSlotType
    presenceType: PresenceType
  }>
}): Promise<{ success: boolean; data?: ExceptionDayOverride; error?: string }>

export async function deleteExceptionDay(
  id: string
): Promise<{ success: boolean; error?: string }>

// ========================================
// Importación/Exportación
// ========================================

export async function importSchedulesFromCSV(
  file: File
): Promise<{ success: boolean; imported: number; errors: string[] }>

export async function exportSchedulesToExcel(
  filters?: { employeeIds?: string[]; templateIds?: string[] }
): Promise<{ success: boolean; fileUrl?: string; error?: string }>

export async function exportScheduleReport(
  employeeId: string,
  month: Date,
  format: 'PDF' | 'EXCEL'
): Promise<{ success: boolean; fileUrl?: string; error?: string }>
```

---

## 📋 FASE 4: UI - CRUD de Plantillas

### 4.1 Estructura de Archivos

```
/src/app/(main)/dashboard/schedules-v2/
├── page.tsx                    # Lista de plantillas (DataTable)
├── new/
│   └── page.tsx                # Wizard creación plantilla
├── [id]/
│   ├── page.tsx                # Detalle plantilla
│   └── edit/
│       └── page.tsx            # Edición plantilla
└── _components/
    ├── schedule-template-form.tsx
    ├── schedule-template-wizard.tsx
    ├── period-form.tsx
    ├── work-day-pattern-form.tsx
    ├── time-slot-form.tsx
    ├── rotation-pattern-form.tsx
    ├── schedule-preview-calendar.tsx
    ├── schedules-data-table.tsx
    └── schedules-columns.tsx
```

### 4.2 Página Principal (`/dashboard/schedules-v2/page.tsx`)

**Características:**

- DataTable con tabs: "Fijos", "Turnos", "Rotaciones", "Flexible", "Todos"
- Botón "Nueva Plantilla" → Wizard
- Botón "Importar CSV/Excel"
- Acciones por fila: Ver, Editar, Duplicar, Eliminar
- Filtros: Activo/Inactivo, Tipo
- Badges: Tipo de plantilla, Número de periodos, Número de empleados asignados

### 4.3 Wizard de Creación (`/dashboard/schedules-v2/new/page.tsx`)

**Multi-paso:**

1. **Paso 1: Información Básica**
   - Nombre, descripción
   - Tipo de plantilla (FIXED, SHIFT, ROTATION, FLEXIBLE)

2. **Paso 2: Periodo REGULAR** (obligatorio)
   - Días laborables (L-V, L-S, etc.)
   - Tramos horarios por día
   - Preview semanal

3. **Paso 3: Periodos Especiales** (opcional)
   - Añadir INTENSIVE (verano)
   - Añadir SPECIAL (Semana Santa, Navidad, etc.)
   - Fechas de vigencia
   - Tramos horarios específicos

4. **Paso 4: Preview y Confirmación**
   - Vista previa de la plantilla completa
   - Calendario anual con periodos marcados
   - Botón "Crear Plantilla"

### 4.4 Editor de Tramos Horarios (`time-slot-form.tsx`)

**Características:**

- Selector visual de hora inicio/fin (HH:mm)
- Tipo de tramo: WORK, BREAK, ON_CALL
- Tipo de presencia: MANDATORY, FLEXIBLE
- Descripción opcional
- Botón "Añadir Tramo"
- Lista de tramos creados (editar/eliminar)
- Validación: No solapamientos, orden cronológico

### 4.5 Preview de Horario (`schedule-preview-calendar.tsx`)

**Vista Semanal:**

```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│  LUN    │  MAR    │  MIÉ    │  JUE    │  VIE    │  SÁB    │  DOM    │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:00   │ 09:00   │ 09:00   │ 09:00   │ 09:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │ Descanso│ Descanso│
│ 14:00   │ 14:00   │ 14:00   │ 14:00   │ 14:00   │         │         │
│ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │         │         │
│         │         │         │         │         │         │         │
│ 14:00   │ 14:00   │ 14:00   │ 14:00   │ 14:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │         │         │
│ 15:00   │ 15:00   │ 15:00   │ 15:00   │ 15:00   │         │         │
│ (BREAK) │ (BREAK) │ (BREAK) │ (BREAK) │ (BREAK) │         │         │
│         │         │         │         │         │         │         │
│ 15:00   │ 15:00   │ 15:00   │ 15:00   │ 15:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │         │         │
│ 18:00   │ 18:00   │ 18:00   │ 18:00   │ 18:00   │         │         │
│ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
Total: 40h/semana
```

**Vista Anual (con periodos):**

```
Enero - Junio: REGULAR (L-V 09:00-18:00, 40h)
15 Jun - 1 Sep: INTENSIVE (L-V 08:00-15:00, 35h)
Septiembre - Diciembre: REGULAR (L-V 09:00-18:00, 40h)
```

---

## 📋 FASE 5: UI - Asignación a Empleados

### 5.1 Actualizar `/dashboard/employees/[id]/schedules`

**Reemplazar completamente** el formulario antiguo basado en `EmploymentContract`.

**Nueva estructura:**

```tsx
<div className="@container/main flex flex-col gap-4 md:gap-6">
  <SectionHeader
    title="Horario del Empleado"
    actionLabel="Asignar Horario"
  />

  {/* Horario Actual */}
  <Card>
    <CardHeader>
      <CardTitle>Horario Actual</CardTitle>
    </CardHeader>
    <CardContent>
      {currentAssignment ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3>{currentAssignment.scheduleTemplate.name}</h3>
              <p className="text-sm text-muted-foreground">
                Desde {formatDate(currentAssignment.validFrom)}
              </p>
            </div>
            <Badge>{currentAssignment.assignmentType}</Badge>
          </div>

          {/* Preview del horario de esta semana */}
          <SchedulePreviewCalendar
            employeeId={employeeId}
            weekStart={startOfWeek(new Date())}
          />
        </>
      ) : (
        <EmptyState
          icon={CalendarIcon}
          title="Sin horario asignado"
          description="Este empleado no tiene un horario asignado todavía."
          action={
            <Button onClick={() => setShowAssignDialog(true)}>
              Asignar Horario
            </Button>
          }
        />
      )}
    </CardContent>
  </Card>

  {/* Histórico de Asignaciones */}
  <Card>
    <CardHeader>
      <CardTitle>Histórico de Horarios</CardTitle>
    </CardHeader>
    <CardContent>
      <Timeline>
        {history.map(assignment => (
          <TimelineItem key={assignment.id}>
            <div>
              <h4>{assignment.scheduleTemplate.name}</h4>
              <p className="text-sm text-muted-foreground">
                {formatDate(assignment.validFrom)} - {assignment.validTo ? formatDate(assignment.validTo) : 'Actual'}
              </p>
            </div>
          </TimelineItem>
        ))}
      </Timeline>
    </CardContent>
  </Card>
</div>
```

### 5.2 Dialog de Asignación

**Formulario:**

1. **Tipo de asignación:**
   - Radio: FIXED, SHIFT, ROTATION, FLEXIBLE

2. **Seleccionar plantilla/rotación:**
   - Si FIXED/SHIFT/FLEXIBLE: Select de `ScheduleTemplate`
   - Si ROTATION: Select de `ShiftRotationPattern` + DatePicker de inicio

3. **Vigencia:**
   - Fecha desde (obligatorio)
   - Fecha hasta (opcional, null = indefinido)

4. **Preview:**
   - Horario de la próxima semana con la nueva asignación
   - Horas esperadas semanales

---

## 📋 FASE 6: Integración con Fichaje

### 6.1 Actualizar `/dashboard/me/clock`

**Añadir sección "Tu Horario Hoy":**

```tsx
{/* Nuevo componente */}
<Card>
  <CardHeader>
    <CardTitle>Tu Horario Hoy</CardTitle>
  </CardHeader>
  <CardContent>
    {effectiveSchedule ? (
      <>
        <div className="space-y-2">
          {effectiveSchedule.timeSlots.map(slot => (
            <div key={slot.startMinutes} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={slot.slotType === 'WORK' ? 'default' : 'secondary'}>
                  {slot.slotType}
                </Badge>
                <span>
                  {minutesToTime(slot.startMinutes)} - {minutesToTime(slot.endMinutes)}
                </span>
              </div>
              {slot.presenceType === 'MANDATORY' && (
                <Badge variant="outline">Obligatorio</Badge>
              )}
              {slot.presenceType === 'FLEXIBLE' && (
                <Badge variant="outline">Flexible</Badge>
              )}
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Horas esperadas:</span>
          <span className="font-medium">
            {formatDuration(effectiveSchedule.expectedMinutes)}
          </span>
        </div>

        {effectiveSchedule.source === 'PERIOD' && (
          <p className="text-xs text-muted-foreground mt-2">
            Periodo: {effectiveSchedule.periodName}
          </p>
        )}
      </>
    ) : (
      <p className="text-sm text-muted-foreground">
        No tienes horario asignado para hoy
      </p>
    )}
  </CardContent>
</Card>
```

**Indicador de tramo actual:**

```tsx
{/* Mostrar en qué tramo estamos AHORA */}
<Alert>
  <ClockIcon className="h-4 w-4" />
  <AlertTitle>Tramo Actual</AlertTitle>
  <AlertDescription>
    {currentSlot ? (
      <>
        {currentSlot.slotType === 'WORK' && (
          <span>Tiempo de trabajo ({currentSlot.presenceType})</span>
        )}
        {currentSlot.slotType === 'BREAK' && (
          <span>Descanso</span>
        )}
        <br />
        <span className="text-xs text-muted-foreground">
          Hasta {minutesToTime(currentSlot.endMinutes)}
        </span>
      </>
    ) : (
      <span>Fuera de horario</span>
    )}
  </AlertDescription>
</Alert>
```

### 6.2 Actualizar Cálculo de `WorkdaySummary`

**Antes (sistema antiguo):**

```typescript
// En EmploymentContract
const expectedHours = contract.mondayHours // campo fijo por día
```

**Ahora (sistema nuevo):**

```typescript
import { getEffectiveSchedule } from '@/lib/schedule-engine'

const effective = await getEffectiveSchedule(employeeId, today)
const expectedMinutes = effective.expectedMinutes
const actualMinutes = workday.totalWorkedMinutes
const deviation = actualMinutes - expectedMinutes

// Guardar en WorkdaySummary (NUEVO CAMPO)
await prisma.workdaySummary.update({
  where: { id: workday.id },
  data: {
    expectedMinutes, // NUEVO campo Decimal
    deviationMinutes: deviation, // NUEVO campo Decimal
    status: determineStatus(actualMinutes, expectedMinutes, absence)
  }
})
```

**Añadir campos a `WorkdaySummary`:**

```prisma
model WorkdaySummary {
  // ... campos existentes ...

  // NUEVOS campos para sistema de horarios v2
  expectedMinutes  Decimal? @db.Decimal(6,2) // Minutos esperados según horario
  deviationMinutes Decimal? @db.Decimal(6,2) // Desviación (real - esperado)
}
```

---

## 📋 FASE 7: Métricas y Avisos

### 7.1 Sistema de Métricas (`schedule-metrics.ts`)

**Archivo:** `/src/lib/schedule-metrics.ts`

```typescript
/**
 * Calcula métricas de cumplimiento de horario para un empleado.
 */

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

export async function calculateScheduleMetrics(
  employeeId: string,
  from: Date,
  to: Date
): Promise<ScheduleMetrics>

export async function getScheduleAlerts(
  employeeId: string,
  from: Date,
  to: Date
): Promise<ScheduleAlert[]>

export async function getOrganizationAlerts(
  filters?: { severity?: string; type?: string; employeeId?: string }
): Promise<ScheduleAlert[]>
```

### 7.2 Dashboard de Alertas (`/dashboard/schedule-alerts`)

**Características:**

- DataTable con alertas de toda la organización
- Filtros: Severidad, Tipo, Empleado, Fecha
- Acciones: Aprobar exceso, Marcar como revisado, Comentar
- Badges por severidad: INFO (azul), WARNING (amarillo), CRITICAL (rojo)

**Tipos de alertas:**

1. **OVERTIME_DETECTED** (Exceso de horas)
   - Trigger: Día con >150% de jornada esperada
   - Acción: Aprobar como extra, o marcar error de fichaje

2. **MANDATORY_PRESENCE_MISSED** (No cumple horario obligatorio)
   - Trigger: Falta en tramo MANDATORY sin ausencia justificada
   - Acción: Solicitar justificación, marcar incidencia

3. **INSUFFICIENT_REST** (Descanso insuficiente)
   - Trigger: Menos de 11h entre salida y entrada siguiente
   - Acción: Alerta al manager, verificar cumplimiento legal

4. **SCHEDULE_CHANGE_REQUIRED** (Cambio de periodo sin asignar)
   - Trigger: Empleado sin horario asignado para periodo nuevo (verano)
   - Acción: Asignar horario correspondiente

---

## 📋 FASE 8: Importación/Exportación

### 8.1 Importación CSV/Excel

**Formato CSV esperado:**

```csv
empleado_numero,plantilla_horario,tipo_asignacion,fecha_desde,fecha_hasta,rotacion_inicio
TMNW00001,horario-oficina-40h,FIXED,2025-01-01,2025-12-31,
TMNW00002,rotacion-policia-6x6,ROTATION,2025-01-01,,2025-01-15
TMNW00003,teletrabajo-flexible,FLEXIBLE,2025-01-01,,
```

**Wizard de Importación:**

1. **Subir archivo** (CSV o Excel)
2. **Preview y validación**
   - Detectar empleados que no existen
   - Detectar plantillas que no existen
   - Detectar fechas inválidas
   - Mostrar errores en tabla
3. **Mapeo de columnas** (si es necesario)
4. **Importación**
   - Crear `EmployeeScheduleAssignment` por cada fila válida
   - Log de errores y éxitos
   - Resumen: "15 importados, 3 errores"

### 8.2 Exportación Legal (PDF/Excel)

**Reporte Mensual de Horario (PDF):**

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
│ ...  │            │          │          │         │
└──────┴────────────┴──────────┴──────────┴─────────┘

RESUMEN:
- Horas esperadas: 160h
- Horas trabajadas: 162h 30m
- Desviación: +2h 30m (+1.56%)

Fecha de generación: 2025-11-01
Firma digital: [HASH SHA256]
```

**Export Masivo (Excel):**

Hoja 1: Horarios Asignados
Hoja 2: Fichajes del Mes
Hoja 3: Desviaciones
Hoja 4: Alertas

---

## 📋 FASE 9: Migración de Datos (OPCIONAL)

**Como NO necesitas datos históricos**, esta fase es **OPCIONAL**.

### 9.1 Script de Migración

**Archivo:** `/scripts/migrate-schedules-v1-to-v2.ts`

**Lógica:**

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateSchedules() {
  // 1. Obtener todos los contratos con horario definido
  const contracts = await prisma.employmentContract.findMany({
    where: {
      scheduleType: { not: null }
    },
    include: { employee: true }
  })

  for (const contract of contracts) {
    // 2. Crear ScheduleTemplate "Migrado - {employeeName}"
    const template = await prisma.scheduleTemplate.create({
      data: {
        name: `Migrado - ${contract.employee.firstName} ${contract.employee.lastName}`,
        templateType: mapScheduleType(contract.scheduleType),
        orgId: contract.orgId
      }
    })

    // 3. Crear SchedulePeriod REGULAR
    const regularPeriod = await prisma.schedulePeriod.create({
      data: {
        scheduleTemplateId: template.id,
        periodType: 'REGULAR',
        validFrom: null,
        validTo: null
      }
    })

    // 4. Crear WorkDayPattern + TimeSlot para cada día
    for (let day = 0; day <= 6; day++) {
      const isWorking = getIsWorkingDay(contract, day)
      const pattern = await prisma.workDayPattern.create({
        data: {
          schedulePeriodId: regularPeriod.id,
          dayOfWeek: day,
          isWorkingDay: isWorking
        }
      })

      if (isWorking) {
        const slots = buildTimeSlotsFromContract(contract, day)
        for (const slot of slots) {
          await prisma.timeSlot.create({
            data: {
              workDayPatternId: pattern.id,
              ...slot
            }
          })
        }
      }
    }

    // 5. Si tiene jornada intensiva, crear periodo INTENSIVE
    if (contract.hasIntensiveSchedule) {
      const intensivePeriod = await prisma.schedulePeriod.create({
        data: {
          scheduleTemplateId: template.id,
          periodType: 'INTENSIVE',
          name: 'Verano',
          validFrom: parseMMDD(contract.intensiveStartDate!),
          validTo: parseMMDD(contract.intensiveEndDate!)
        }
      })

      // Crear patterns + slots para verano...
    }

    // 6. Crear EmployeeScheduleAssignment
    await prisma.employeeScheduleAssignment.create({
      data: {
        employeeId: contract.employeeId,
        assignmentType: 'FIXED',
        scheduleTemplateId: template.id,
        validFrom: contract.startDate,
        validTo: contract.endDate,
        isActive: contract.active
      }
    })

    console.log(`✅ Migrado: ${contract.employee.firstName} ${contract.employee.lastName}`)
  }

  console.log(`\n✅ Migración completada: ${contracts.length} contratos migrados`)
}

migrateSchedules()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Ejecutar SOLO si decides migrar datos:**

```bash
npx tsx scripts/migrate-schedules-v1-to-v2.ts
```

---

## 📋 FASE 10: Documentación y Seeds

### 10.1 Documentación

**Archivos a crear:**

1. `/docs/sistema-horarios-v2.md` - Especificación técnica completa
2. `/docs/guia-uso-horarios.md` - Guía de usuario (cómo crear plantillas, asignar, etc.)
3. `/docs/ejemplos-horarios.md` - Casos de uso reales

**Contenido de `ejemplos-horarios.md`:**

```markdown
# Ejemplos de Horarios Configurables

## 1. Oficina 40h (L-V 9-18h)

**ScheduleTemplate:**
- Tipo: FIXED
- Nombre: "Horario Oficina 40h"

**SchedulePeriod REGULAR:**
- L-V: 09:00-14:00 WORK, 14:00-15:00 BREAK, 15:00-18:00 WORK
- S-D: Descanso

**Total:** 40h/semana

---

## 2. Funcionario Público con Flex

**ScheduleTemplate:**
- Tipo: FIXED
- Nombre: "Funcionario con Flex"

**SchedulePeriod REGULAR:**
- L-V:
  - 07:00-09:00 WORK FLEXIBLE
  - 09:00-14:30 WORK MANDATORY (presencia obligatoria)
  - 14:30-16:00 WORK FLEXIBLE
- S-D: Descanso

**Total:** 37.5h/semana

---

## 3. Jornada Intensiva Verano

**ScheduleTemplate:**
- Tipo: FIXED
- Nombre: "Oficina con Verano"

**SchedulePeriod REGULAR (Oct-Jun):**
- L-V: 09:00-18:00 (40h)

**SchedulePeriod INTENSIVE (15 Jun - 1 Sep):**
- L-V: 08:00-15:00 (35h)

---

## 4. Policía Nacional 6x6

**ShiftRotationPattern:**
- Nombre: "Policía 6x6"
- Step 1: 6 días → "Turno Mañana" (07:00-15:00)
- Step 2: 6 días → "Descanso"

**EmployeeScheduleAssignment:**
- Tipo: ROTATION
- Inicio rotación: 2025-01-15

---

## 5. Bomberos 24x72

**ShiftRotationPattern:**
- Nombre: "Bomberos 24x72"
- Step 1: 1 día → "Turno 24h" (00:00-24:00)
- Step 2: 3 días → "Descanso"

---

## 6. Semana Santa con Reducción

**ScheduleTemplate:**
- Tipo: FIXED
- Nombre: "Oficina con Semana Santa"

**SchedulePeriod REGULAR:**
- L-V: 09:00-18:00

**SchedulePeriod SPECIAL (14-20 Abril):**
- L-J: 09:00-14:00
- V: 09:00-12:48 (como en algunos convenios)
```

### 10.2 Seeds de Datos de Ejemplo

**Archivo:** `/prisma/seeds/schedules-v2.seed.ts`

```typescript
import { PrismaClient, ScheduleTemplateType, SchedulePeriodType } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedSchedulesV2(orgId: string) {
  // 1. Plantilla: Horario Oficina 40h
  const office40h = await prisma.scheduleTemplate.create({
    data: {
      name: 'Horario Oficina 40h',
      description: 'Horario estándar de oficina L-V 9-18h con pausa comida',
      templateType: 'FIXED',
      orgId,
      periods: {
        create: {
          periodType: 'REGULAR',
          workDayPatterns: {
            create: [
              // Lunes a Viernes (1-5)
              ...Array.from({ length: 5 }, (_, i) => ({
                dayOfWeek: i + 1,
                isWorkingDay: true,
                timeSlots: {
                  create: [
                    { startTimeMinutes: 540, endTimeMinutes: 840, slotType: 'WORK', presenceType: 'MANDATORY' }, // 09:00-14:00
                    { startTimeMinutes: 840, endTimeMinutes: 900, slotType: 'BREAK', presenceType: 'MANDATORY' }, // 14:00-15:00
                    { startTimeMinutes: 900, endTimeMinutes: 1080, slotType: 'WORK', presenceType: 'MANDATORY' }, // 15:00-18:00
                  ]
                }
              })),
              // Sábado y Domingo (6, 0)
              { dayOfWeek: 6, isWorkingDay: false },
              { dayOfWeek: 0, isWorkingDay: false },
            ]
          }
        }
      }
    }
  })

  // 2. Plantilla: Funcionario con Flex
  const funcionarioFlex = await prisma.scheduleTemplate.create({
    data: {
      name: 'Funcionario con Flex',
      description: 'Horario sector público con franja flexible y presencia obligatoria',
      templateType: 'FIXED',
      orgId,
      periods: {
        create: {
          periodType: 'REGULAR',
          workDayPatterns: {
            create: [
              ...Array.from({ length: 5 }, (_, i) => ({
                dayOfWeek: i + 1,
                isWorkingDay: true,
                timeSlots: {
                  create: [
                    { startTimeMinutes: 420, endTimeMinutes: 540, slotType: 'WORK', presenceType: 'FLEXIBLE', description: 'Entrada flexible' }, // 07:00-09:00
                    { startTimeMinutes: 540, endTimeMinutes: 870, slotType: 'WORK', presenceType: 'MANDATORY', description: 'Presencia obligatoria' }, // 09:00-14:30
                    { startTimeMinutes: 870, endTimeMinutes: 960, slotType: 'WORK', presenceType: 'FLEXIBLE', description: 'Salida flexible' }, // 14:30-16:00
                  ]
                }
              })),
              { dayOfWeek: 6, isWorkingDay: false },
              { dayOfWeek: 0, isWorkingDay: false },
            ]
          }
        }
      }
    }
  })

  // 3. Plantilla: Oficina con Verano
  const officeVerano = await prisma.scheduleTemplate.create({
    data: {
      name: 'Oficina con Jornada Intensiva Verano',
      description: 'Horario con jornada intensiva en verano',
      templateType: 'FIXED',
      orgId,
      periods: {
        create: [
          // Periodo REGULAR
          {
            periodType: 'REGULAR',
            name: 'Horario Regular',
            workDayPatterns: {
              create: [
                ...Array.from({ length: 5 }, (_, i) => ({
                  dayOfWeek: i + 1,
                  isWorkingDay: true,
                  timeSlots: {
                    create: [
                      { startTimeMinutes: 540, endTimeMinutes: 840, slotType: 'WORK', presenceType: 'MANDATORY' },
                      { startTimeMinutes: 840, endTimeMinutes: 900, slotType: 'BREAK', presenceType: 'MANDATORY' },
                      { startTimeMinutes: 900, endTimeMinutes: 1080, slotType: 'WORK', presenceType: 'MANDATORY' },
                    ]
                  }
                })),
                { dayOfWeek: 6, isWorkingDay: false },
                { dayOfWeek: 0, isWorkingDay: false },
              ]
            }
          },
          // Periodo INTENSIVE (Verano)
          {
            periodType: 'INTENSIVE',
            name: 'Verano',
            validFrom: new Date(new Date().getFullYear(), 5, 15), // 15 junio
            validTo: new Date(new Date().getFullYear(), 8, 1), // 1 septiembre
            workDayPatterns: {
              create: [
                ...Array.from({ length: 5 }, (_, i) => ({
                  dayOfWeek: i + 1,
                  isWorkingDay: true,
                  timeSlots: {
                    create: [
                      { startTimeMinutes: 480, endTimeMinutes: 900, slotType: 'WORK', presenceType: 'MANDATORY' }, // 08:00-15:00
                    ]
                  }
                })),
                { dayOfWeek: 6, isWorkingDay: false },
                { dayOfWeek: 0, isWorkingDay: false },
              ]
            }
          }
        ]
      }
    }
  })

  // 4. Turno 24h (para bomberos)
  const turno24h = await prisma.scheduleTemplate.create({
    data: {
      name: 'Turno 24 Horas',
      description: 'Turno de 24 horas continuas',
      templateType: 'SHIFT',
      orgId,
      periods: {
        create: {
          periodType: 'REGULAR',
          workDayPatterns: {
            create: Array.from({ length: 7 }, (_, i) => ({
              dayOfWeek: i,
              isWorkingDay: true,
              timeSlots: {
                create: [
                  { startTimeMinutes: 0, endTimeMinutes: 1440, slotType: 'WORK', presenceType: 'MANDATORY' }, // 00:00-24:00
                ]
              }
            }))
          }
        }
      }
    }
  })

  // 5. Turno Descanso
  const turnoDescanso = await prisma.scheduleTemplate.create({
    data: {
      name: 'Descanso',
      description: 'Día de descanso',
      templateType: 'SHIFT',
      orgId,
      periods: {
        create: {
          periodType: 'REGULAR',
          workDayPatterns: {
            create: Array.from({ length: 7 }, (_, i) => ({
              dayOfWeek: i,
              isWorkingDay: false
            }))
          }
        }
      }
    }
  })

  // 6. Rotación Bomberos 24x72
  const rotacionBomberos = await prisma.shiftRotationPattern.create({
    data: {
      name: 'Bomberos 24x72',
      description: '1 día de trabajo (24h) seguido de 3 días de descanso',
      orgId,
      steps: {
        create: [
          { stepOrder: 1, durationDays: 1, scheduleTemplateId: turno24h.id },
          { stepOrder: 2, durationDays: 3, scheduleTemplateId: turnoDescanso.id },
        ]
      }
    }
  })

  console.log('✅ Seeds de horarios v2 creados:')
  console.log(`   - ${office40h.name}`)
  console.log(`   - ${funcionarioFlex.name}`)
  console.log(`   - ${officeVerano.name}`)
  console.log(`   - ${rotacionBomberos.name}`)

  return {
    office40h,
    funcionarioFlex,
    officeVerano,
    turno24h,
    turnoDescanso,
    rotacionBomberos
  }
}
```

---

## 🚀 Orden de Ejecución Recomendado

### Sprint 1: Fundamentos (Modelo de Datos + Motor)

1. ✅ **FASE 1**: Crear modelos Prisma
   - Añadir todos los modelos nuevos
   - Eliminar campos obsoletos de `EmploymentContract`
   - Actualizar `Employee` y `Organization`
   - Migración: `npx prisma migrate dev --name add_flexible_schedule_system_v2`

2. ✅ **FASE 2**: Motor de cálculo `schedule-engine.ts`
   - Implementar `getEffectiveSchedule()`
   - Implementar lógica de prioridades
   - Tests unitarios

### Sprint 2: UI Básica (CRUD Plantillas)

3. ✅ **FASE 3**: Server actions
   - CRUD de `ScheduleTemplate`
   - CRUD de `SchedulePeriod`
   - Gestión de `WorkDayPattern` + `TimeSlot`

4. ✅ **FASE 4**: UI CRUD plantillas
   - Página `/dashboard/schedules-v2`
   - Wizard de creación
   - Editor de tramos horarios
   - Preview visual

### Sprint 3: Asignación y Fichaje

5. ✅ **FASE 5**: UI asignación empleados
   - Actualizar `/dashboard/employees/[id]/schedules`
   - Dialog de asignación
   - Histórico de horarios

6. ✅ **FASE 6**: Integración fichaje
   - Actualizar `/dashboard/me/clock`
   - Mostrar horario esperado del día
   - Actualizar cálculo de `WorkdaySummary`

### Sprint 4: Métricas y Exportación

7. ✅ **FASE 7**: Métricas y avisos
   - `schedule-metrics.ts`
   - Dashboard de alertas `/dashboard/schedule-alerts`

8. ✅ **FASE 8**: Import/Export
   - Importación CSV/Excel
   - Exportación legal (PDF/Excel)

### Sprint 5: Finalización

9. ⚠️ **FASE 9**: (OPCIONAL) Migración datos
   - Script de migración v1 → v2
   - Solo ejecutar si se decide migrar datos históricos

10. ✅ **FASE 10**: Docs + seeds
    - Documentación completa
    - Seeds de plantillas de ejemplo
    - Testing manual completo

---

## ✅ Checklist de Validación

**Cumplimiento de requisitos:**

- ✅ **Migración breaking**: Elimina campos antiguos, sistema completamente nuevo
- ✅ **Flexibilidad total**: Soporta cualquier caso de uso futuro
- ✅ **Sector privado**: Horarios fijos, turnos, flexible
- ✅ **Sector público**: Franjas MANDATORY + FLEXIBLE, funcionarios
- ✅ **Periodos especiales**: REGULAR, INTENSIVE (verano), SPECIAL (Semana Santa, Navidad)
- ✅ **Turnos rotativos**: ShiftRotationPattern para policía (6x6), bomberos (24x72)
- ✅ **Precisión de minutos**: TimeSlot usa minutos (0-1440), soporta 9:12, 12:48, etc.
- ✅ **Compatible con métricas**: `schedule-metrics.ts` + alertas
- ✅ **Importación Excel/CSV**: Wizard de importación
- ✅ **Exportación legal**: PDF + Excel con formatos oficiales
- ✅ **Datos limpios**: No migrar histórico (empezar de cero)

---

## 🔄 Plan de Rollback

**En caso de necesitar volver atrás:**

1. **Git**: Checkout al tag `v1-before-schedules-v2` (creado antes de empezar)
2. **Base de datos**: Restaurar backup `erp_dev_backup_YYYYMMDD.sql`
3. **Prisma**: `npx prisma db push` para sincronizar schema antiguo
4. **Clear build**: `rm -rf .next && npm run dev`

**Comandos:**

```bash
# Restaurar código
git checkout v1-before-schedules-v2

# Restaurar base de datos
psql -U erp_user -d erp_dev < backups/erp_dev_backup_20251117.sql

# Sincronizar Prisma
npx prisma db push

# Rebuild
rm -rf .next && npm run dev
```

---

## 📝 Notas Finales

### Decisiones de Diseño

1. **Minutos en lugar de HH:mm**: Facilita cálculos (suma, resta, comparaciones)
2. **Periodos con fechas null**: REGULAR es permanente, SPECIAL/INTENSIVE tienen vigencia temporal
3. **Separación Template/Period/Pattern/Slot**: Máxima flexibilidad y reutilización
4. **Rotaciones como pasos secuenciales**: Permite patrones complejos (policía, bomberos)
5. **Excepciones separadas**: Para casos raros sin contaminar el modelo base

### Próximos Pasos Después de Implementación

1. **Automatización de rotaciones**: Motor que asigne automáticamente turnos siguiendo rotaciones
2. **Intercambio de turnos**: Empleados pueden solicitar cambios entre ellos
3. **Plantillas por departamento/centro**: Herencia y sobreescritura
4. **Integración con nómina**: Export directo a sistemas de nómina
5. **Dashboard analítico**: Heatmaps de staffing, gráficos de cumplimiento

---

**Versión:** 1.0
**Última actualización:** 2025-11-17
**Autor:** Sistema de Planificación ERP TimeNow
