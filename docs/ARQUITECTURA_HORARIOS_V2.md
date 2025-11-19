# Arquitectura del Sistema de Horarios V2.0

**Fecha:** 2025-11-19
**Versión:** 1.0
**Estado:** Documentación Técnica

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)

**Documentos relacionados:**
- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md)
- [Server Actions](./SERVER_ACTIONS_HORARIOS.md)
- [Guía de UI](./GUIA_UI_HORARIOS.md)

---

## 📚 Índice

1. [Análisis del Sistema Actual](#análisis-del-sistema-actual)
2. [Nuevo Modelo de Datos Prisma](#nuevo-modelo-de-datos-prisma)
3. [Decisiones de Diseño](#decisiones-de-diseño)

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

## 📋 Nuevo Modelo de Datos Prisma

### Modelos Principales

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

### Actualizar Modelos Existentes

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

## 📝 Decisiones de Diseño

### 1. Minutos en lugar de HH:mm

**Decisión:** Usar minutos desde medianoche (0-1440) en lugar de formato HH:mm.

**Razón:** Facilita enormemente los cálculos:
- Suma de horas: `suma(slot.endTimeMinutes - slot.startTimeMinutes)`
- Comparaciones: `if (currentMinutes >= slot.startTimeMinutes)`
- Conversión simple: `hours = minutes / 60`

**Ejemplo:**
```typescript
// 09:00 → 540 minutos
// 18:00 → 1080 minutos
// Duración: 1080 - 540 = 540 minutos = 9 horas
```

---

### 2. Periodos con fechas null

**Decisión:** Periodo REGULAR tiene `validFrom=null, validTo=null`.

**Razón:**
- Indica que es permanente (siempre activo)
- Periodos SPECIAL/INTENSIVE tienen vigencia temporal
- Simplifica consultas: "si no hay periodo temporal activo, usar REGULAR"

**Ejemplo:**
```typescript
// REGULAR (todo el año)
{ periodType: 'REGULAR', validFrom: null, validTo: null }

// INTENSIVE (verano)
{ periodType: 'INTENSIVE', validFrom: '2025-06-15', validTo: '2025-09-01' }
```

---

### 3. Separación Template/Period/Pattern/Slot

**Decisión:** 4 niveles de jerarquía en lugar de modelo plano.

**Razón:**
- **Máxima reutilización**: Una plantilla puede tener múltiples periodos
- **Flexibilidad**: Cambiar solo lo necesario sin duplicar todo
- **Mantenibilidad**: Editar verano sin tocar el horario regular

**Jerarquía:**
```
ScheduleTemplate (Plantilla reutilizable)
  └── SchedulePeriod (Periodo temporal)
      └── WorkDayPattern (Día de la semana)
          └── TimeSlot (Franja horaria específica)
```

---

### 4. Rotaciones como pasos secuenciales

**Decisión:** `ShiftRotationPattern` con múltiples `ShiftRotationStep`.

**Razón:**
- Soporta patrones complejos (no solo 2 turnos)
- Ejemplo: Policía podría tener Mañana → Tarde → Noche → Descanso (4 pasos)
- Cada paso referencia una plantilla existente (reutilización)

**Algoritmo:**
```typescript
// Calcular qué step toca en una fecha
const daysSinceStart = Math.floor((date - rotationStartDate) / MS_PER_DAY)
const cycleDuration = sum(steps.map(s => s.durationDays))
const dayInCycle = daysSinceStart % cycleDuration

// Recorrer steps hasta encontrar el que toca
let accumulated = 0
for (const step of steps) {
  if (dayInCycle < accumulated + step.durationDays) {
    return step.scheduleTemplate
  }
  accumulated += step.durationDays
}
```

---

### 5. Excepciones separadas

**Decisión:** `ExceptionDayOverride` separado del modelo base.

**Razón:**
- Casos raros no contaminan el modelo principal
- Fácil de añadir/quitar sin tocar la plantilla
- Prioridad máxima en el motor de cálculo

**Ejemplos de uso:**
- Viernes Santo con horario reducido (12:48h)
- Cierre excepcional de empresa
- Cambio puntual para un empleado específico

---

## 🔄 Integración con Motor de Cálculo

Ver detalles completos en: [Motor de Cálculo de Horarios](./MOTOR_CALCULO_HORARIOS.md)

**Lógica de prioridades:**
1. **Ausencias** (vacaciones/permisos) → Mayor prioridad
2. **Excepciones** (días específicos) → Sobrescribe todo
3. **Periodo activo** (SPECIAL > INTENSIVE > REGULAR) → Por fechas
4. **Plantilla base** → Horario normal

---

## 📚 Documentos Relacionados

- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md) - Lógica de cálculo de horarios efectivos
- [Server Actions](./SERVER_ACTIONS_HORARIOS.md) - API de backend
- [Guía de UI](./GUIA_UI_HORARIOS.md) - Componentes de interfaz
- [Validaciones](./VALIDACIONES_Y_CONFIGURACION.md) - Sistema de validaciones
- [Migración de Datos](./MIGRACION_DATOS_V1_V2.md) - Script de migración

---

**Versión:** 1.0
**Última actualización:** 2025-11-19
**Autor:** Sistema de Planificación ERP TimeNow
