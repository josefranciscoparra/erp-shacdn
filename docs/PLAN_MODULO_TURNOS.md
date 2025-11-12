# Plan de Implementación: Módulo de Gestión de Turnos - TimeNow

**Fecha:** 2025-01-12
**Versión:** 1.0
**Autor:** Claude Code + Francisco Parra

---

## 🎯 Resumen Ejecutivo

Implementación completa de un sistema de gestión de turnos para retail y hospitality (tiendas, franquicias, hoteles, restaurantes, gimnasios), con coexistencia con el sistema de jornada fija existente, aprobaciones multi-nivel, visualizaciones por empleado y por cobertura, validaciones de jornada laboral, y generación de informes.

### Objetivo Funcional

Permitir que organizaciones con el módulo activado planifiquen y gestionen turnos con granularidad mínima de 30 minutos, incluyendo:

- ✅ Vista por empleado y vista por cobertura (heatmap por franja)
- ✅ Cobertura mínima por centro, franja y rol
- ✅ Jornada pactada vs horas acumuladas, horas complementarias, horas extra
- ✅ Domingos/festivos/nocturnas parametrizables por organización/centro
- ✅ Flujos de publicación y aprobación con permisos por rol
- ✅ Integración con fichajes (retrasos, ausencias, fuera de turno) y notificaciones
- ✅ Informes y exportaciones (CSV/Excel/PDF)
- ✅ Multi-centro y multi-rol (dependiente, cajero, recepcionista, camarero, supervisor, gobernanta)

---

## 📋 Decisiones de Diseño Confirmadas

### 1. Coexistencia con Jornada Fija

- **Campo nuevo en `EmploymentContract`:** `workScheduleMode` (`FIXED_SCHEDULE` | `SHIFT_BASED`)
- **Comportamiento:**
  - `FIXED_SCHEDULE`: Usa el sistema existente de jornada fija (campos `weeklyHours`, `mondayHours`, etc.)
  - `SHIFT_BASED`: Usa el nuevo sistema de turnos
- **Decisión:** En tiempo de ejecución, el sistema decide qué lógica aplicar según este campo

### 2. Alcance del MVP

- **Nivel:** Completo (Draft → Pending Approval → Published → Closed)
- **Incluye:**
  - Flujo completo de estados con aprobaciones
  - Permisos granulares por centro
  - Informes y exportes
  - Validaciones avanzadas (cobertura, horas complementarias, límites)

### 3. Sistema de Permisos

- **Enfoque:** Permisos por centro con planificadores asignados
- **Roles involucrados:**
  - `SUPER_ADMIN`, `ORG_ADMIN`, `HR_ADMIN`: Control total
  - `ShiftPlanner`: Usuarios específicos asignados a centros (o globales)
  - `ShiftPlanner.canApprove`: Flag para otorgar permiso de aprobación
- **Nuevo modelo:** `ShiftPlanner` con campos `userId`, `costCenterId?`, `isGlobal`, `canApprove`

### 4. Roles de Trabajo

- **Decisión:** Reutilizar modelo `Position` existente
- **Justificación:** Ya existe en TimeNow (`/dashboard/positions`), evita duplicación
- **Uso:** Crear posiciones como "Cajero", "Recepcionista", "Camarero", etc. y asociarlas a turnos

---

## 🗂️ Fase 1: Modelado de Base de Datos (Prisma)

### Nuevos Modelos a Crear

#### 1. ShiftConfiguration (1:1 con Organization)

```prisma
model ShiftConfiguration {
  id                          String   @id @default(cuid())

  // Configuración de granularidad
  planningGranularityMinutes  Int      @default(30)  // Granularidad de planning (15, 30, 60)
  weekStartDay                Int      @default(1)   // Día inicio semana (0=domingo, 1=lunes)

  // Límites de jornada
  maxDailyHours               Decimal  @default(9)   @db.Decimal(4,2)
  maxWeeklyHours              Decimal  @default(40)  @db.Decimal(5,2)
  minRestBetweenShiftsHours   Decimal  @default(12)  @db.Decimal(4,2)

  // Horas complementarias (part-time)
  complementaryHoursEnabled   Boolean  @default(true)
  complementaryHoursLimitPercent Decimal? @db.Decimal(5,2) // % sobre jornada (ej: 30.00)
  complementaryHoursMonthlyCap   Decimal? @db.Decimal(6,2) // Cap mensual en horas

  // Políticas de publicación
  publishRequiresApproval     Boolean  @default(true)
  minAdvancePublishDays       Int      @default(7)   // Días mínimos de anticipación
  allowEditAfterPublish       Boolean  @default(false)

  // Validación de cobertura
  enforceMinimumCoverage      Boolean  @default(true)
  blockPublishIfUncovered     Boolean  @default(false)

  // Metadatos
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt

  // Multi-tenancy (1:1)
  orgId                       String   @unique
  organization                Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("shift_configurations")
}
```

#### 2. ShiftPlanner (Planificadores por centro)

```prisma
model ShiftPlanner {
  id           String   @id @default(cuid())

  // Ámbito
  isGlobal     Boolean  @default(false) // Puede planificar en todos los centros

  // Usuario planificador
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Centro específico (null si isGlobal=true)
  costCenterId String?
  costCenter   CostCenter? @relation(fields: [costCenterId], references: [id], onDelete: Cascade)

  // Permisos
  canApprove   Boolean  @default(false) // Puede aprobar publicaciones

  // Metadatos
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, userId, costCenterId]) // Un usuario no puede ser planificador del mismo centro dos veces
  @@index([orgId])
  @@index([userId])
  @@index([costCenterId])
  @@map("shift_planners")
}
```

#### 3. ShiftTemplate (Plantillas reutilizables)

```prisma
model ShiftTemplate {
  id                      String   @id @default(cuid())
  name                    String   // "Mañana", "Tarde", "Noche", "Opening", "Closing"
  description             String?

  // Horarios por defecto
  defaultStartTime        String   // "09:00"
  defaultEndTime          String   // "17:00"

  // Duración calculada (minutos)
  durationMinutes         Int      // Calculado automáticamente

  // Cobertura requerida por defecto
  defaultRequiredHeadcount Int     @default(1)

  // Posición/rol asociado (opcional)
  positionId              String?
  position                Position? @relation(fields: [positionId], references: [id])

  // Identificación visual
  color                   String   @default("#3b82f6") // Color hex

  // Estado
  active                  Boolean  @default(true)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  // Multi-tenancy
  orgId                   String
  organization            Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Centro específico (opcional)
  costCenterId            String?
  costCenter              CostCenter? @relation(fields: [costCenterId], references: [id])

  // Relaciones
  shifts                  Shift[]

  @@index([orgId])
  @@index([costCenterId])
  @@index([positionId])
  @@map("shift_templates")
}
```

#### 4. Shift (Turno individual)

```prisma
model Shift {
  id                   String      @id @default(cuid())
  date                 DateTime    // Fecha del turno (sin hora)

  // Horario específico
  startTime            String      // "09:00"
  endTime              String      // "17:00"
  durationMinutes      Int         // Duración calculada

  // Cobertura requerida
  requiredHeadcount    Int         @default(1)

  // Posición/rol para este turno
  positionId           String?
  position             Position?   @relation(fields: [positionId], references: [id])

  // Tipo de día
  shiftType            ShiftType   @default(REGULAR)

  // Estado del turno
  status               ShiftStatus @default(DRAFT)

  // Plantilla origen (opcional)
  templateId           String?
  template             ShiftTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)

  // Aprobación y publicación
  publishedAt          DateTime?
  publishedById        String?
  publishedBy          User?       @relation("ShiftPublisher", fields: [publishedById], references: [id])

  approvedAt           DateTime?
  approvedById         String?
  approvedBy           User?       @relation("ShiftApprover", fields: [approvedById], references: [id])

  rejectedAt           DateTime?
  rejectedById         String?
  rejectedBy           User?       @relation("ShiftRejecter", fields: [rejectedById], references: [id])
  rejectionReason      String?

  closedAt             DateTime?
  closedById           String?
  closedBy             User?       @relation("ShiftCloser", fields: [closedById], references: [id])

  // Notas
  notes                String?

  // Metadatos
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
  createdById          String
  createdBy            User        @relation("ShiftCreator", fields: [createdById], references: [id])

  // Multi-tenancy
  orgId                String
  organization         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Centro de coste
  costCenterId         String
  costCenter           CostCenter  @relation(fields: [costCenterId], references: [id], onDelete: Cascade)

  // Relaciones
  assignments          ShiftAssignment[]
  coverageRequirements ShiftCoverageRequirement[]

  @@index([orgId])
  @@index([costCenterId])
  @@index([date])
  @@index([status])
  @@index([positionId])
  @@index([templateId])
  @@map("shifts")
}
```

#### 5. ShiftAssignment (Asignación empleado-turno)

```prisma
model ShiftAssignment {
  id                String   @id @default(cuid())

  // Estado de la asignación
  status            ShiftAssignmentStatus @default(ASSIGNED)

  // Fichajes reales (relación con TimeEntry)
  actualClockIn     DateTime?
  actualClockOut    DateTime?
  actualWorkedMinutes Decimal? @db.Decimal(10,2)

  // Anomalías detectadas
  hasDelay          Boolean  @default(false)
  delayMinutes      Int?
  hasEarlyExit      Boolean  @default(false)
  earlyExitMinutes  Int?
  wasAbsent         Boolean  @default(false)
  workedOutsideShift Boolean @default(false)

  // Notas
  notes             String?

  // Metadatos
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  assignedById      String
  assignedBy        User     @relation(fields: [assignedById], references: [id])

  // Turno asignado
  shiftId           String
  shift             Shift    @relation(fields: [shiftId], references: [id], onDelete: Cascade)

  // Empleado asignado
  employeeId        String
  employee          Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@unique([shiftId, employeeId]) // Un empleado no puede estar asignado dos veces al mismo turno
  @@index([shiftId])
  @@index([employeeId])
  @@index([status])
  @@map("shift_assignments")
}
```

#### 6. ShiftCoverageRequirement (Requisitos de cobertura)

```prisma
model ShiftCoverageRequirement {
  id                String   @id @default(cuid())

  // Franja horaria
  timeSlotStart     String   // "12:00"
  timeSlotEnd       String   // "14:00"

  // Cobertura requerida
  requiredHeadcount Int

  // Posición/rol (opcional)
  positionId        String?
  position          Position? @relation(fields: [positionId], references: [id])

  // Recurrencia (para requisitos permanentes)
  isRecurring       Boolean  @default(false)
  recurrencePattern String?  // "WEEKLY", "MONTHLY", "SEASONAL"
  recurrenceData    Json?    // Configuración de recurrencia

  // Metadatos
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Multi-tenancy
  orgId             String
  organization      Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Centro de coste
  costCenterId      String
  costCenter        CostCenter @relation(fields: [costCenterId], references: [id], onDelete: Cascade)

  // Turno específico (opcional, para requisitos puntuales)
  shiftId           String?
  shift             Shift?   @relation(fields: [shiftId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([costCenterId])
  @@index([shiftId])
  @@index([positionId])
  @@map("shift_coverage_requirements")
}
```

### Enums a Crear

```prisma
enum WorkScheduleMode {
  FIXED_SCHEDULE   // Usa jornada fija (existente)
  SHIFT_BASED      // Usa sistema de turnos
}

enum ShiftType {
  REGULAR   // Día regular
  SUNDAY    // Domingo
  HOLIDAY   // Festivo
  NIGHT     // Nocturno
}

enum ShiftStatus {
  DRAFT            // Borrador (editable)
  PENDING_APPROVAL // Pendiente de aprobación
  PUBLISHED        // Publicado (empleados lo ven)
  CLOSED           // Cerrado (no editable, listo para informes)
}

enum ShiftAssignmentStatus {
  ASSIGNED         // Asignado
  CONFIRMED        // Confirmado por empleado (futuro)
  COMPLETED        // Completado (fichó correctamente)
  ABSENT           // Ausente (no fichó)
  CANCELLED        // Cancelado
}
```

### Relaciones a Añadir en Modelos Existentes

#### En `Organization`

```prisma
shiftConfiguration   ShiftConfiguration?
shiftPlanners        ShiftPlanner[]
shiftTemplates       ShiftTemplate[]
shifts               Shift[]
shiftCoverageRequirements ShiftCoverageRequirement[]
```

#### En `User`

```prisma
shiftPlannerRole     ShiftPlanner?
shiftsPublished      Shift[] @relation("ShiftPublisher")
shiftsApproved       Shift[] @relation("ShiftApprover")
shiftsRejected       Shift[] @relation("ShiftRejecter")
shiftsClosed         Shift[] @relation("ShiftCloser")
shiftsCreated        Shift[] @relation("ShiftCreator")
shiftAssignmentsMade ShiftAssignment[]
```

#### En `Employee`

```prisma
shiftAssignments     ShiftAssignment[]
```

#### En `CostCenter`

```prisma
shiftPlanners        ShiftPlanner[]
shiftTemplates       ShiftTemplate[]
shifts               Shift[]
shiftCoverageRequirements ShiftCoverageRequirement[]
```

#### En `Position`

```prisma
shiftTemplates       ShiftTemplate[]
shifts               Shift[]
shiftCoverageRequirements ShiftCoverageRequirement[]
```

#### En `EmploymentContract`

```prisma
workScheduleMode     WorkScheduleMode @default(FIXED_SCHEDULE)
```

---

## 🏗️ Fase 2: Server Actions

### Archivo: `/src/server/actions/shifts.ts`

#### Grupo 1: Configuración

```typescript
// Configuración de turnos
export async function getShiftConfiguration(): Promise<ShiftConfiguration | null>
export async function updateShiftConfiguration(config: UpdateConfigInput): Promise<ShiftConfiguration>

// Planificadores
export async function getShiftPlanners(filters?: { costCenterId?: string }): Promise<ShiftPlanner[]>
export async function addShiftPlanner(
  userId: string,
  costCenterId?: string,
  isGlobal?: boolean,
  canApprove?: boolean
): Promise<ShiftPlanner>
export async function removeShiftPlanner(plannerId: string): Promise<void>
export async function updateShiftPlanner(plannerId: string, data: UpdatePlannerInput): Promise<ShiftPlanner>
```

#### Grupo 2: Plantillas

```typescript
// CRUD Plantillas
export async function getShiftTemplates(filters?: { costCenterId?: string; positionId?: string }): Promise<ShiftTemplate[]>
export async function getShiftTemplateById(id: string): Promise<ShiftTemplate>
export async function createShiftTemplate(data: CreateTemplateInput): Promise<ShiftTemplate>
export async function updateShiftTemplate(id: string, data: UpdateTemplateInput): Promise<ShiftTemplate>
export async function deleteShiftTemplate(id: string): Promise<void>
```

#### Grupo 3: Turnos (CRUD)

```typescript
// CRUD Turnos
export async function getShifts(filters: ShiftFilters): Promise<Shift[]>
export async function getShiftById(id: string): Promise<Shift>
export async function createShift(data: CreateShiftInput): Promise<Shift>
export async function createShiftsFromTemplate(
  templateId: string,
  dateRange: { start: Date; end: Date },
  costCenterId: string
): Promise<Shift[]>
export async function updateShift(id: string, data: UpdateShiftInput): Promise<Shift>
export async function deleteShift(id: string): Promise<void>
export async function duplicateShift(id: string, newDate: Date): Promise<Shift>
export async function copyWeekShifts(
  fromWeek: Date,
  toWeek: Date,
  costCenterId: string
): Promise<Shift[]>
```

#### Grupo 4: Asignaciones

```typescript
// Asignación de empleados a turnos
export async function getShiftAssignments(filters: AssignmentFilters): Promise<ShiftAssignment[]>
export async function assignEmployeeToShift(
  shiftId: string,
  employeeId: string,
  notes?: string
): Promise<ShiftAssignment>
export async function unassignEmployeeFromShift(assignmentId: string): Promise<void>
export async function bulkAssignEmployees(
  shiftIds: string[],
  employeeIds: string[]
): Promise<ShiftAssignment[]>
```

#### Grupo 5: Publicación y Aprobación

```typescript
// Validación pre-publicación
export async function validateShiftsForPublication(
  shiftIds: string[]
): Promise<ValidationResult[]>

// Flujo de aprobación
export async function requestPublicationApproval(shiftIds: string[]): Promise<void>
export async function approveShifts(shiftIds: string[], approverId: string): Promise<void>
export async function rejectShifts(shiftIds: string[], reason: string): Promise<void>

// Publicación
export async function publishShifts(shiftIds: string[]): Promise<void>

// Cierre
export async function closeShifts(shiftIds: string[]): Promise<void>
```

#### Grupo 6: Cobertura

```typescript
// Análisis de cobertura
export async function getCoverageAnalysis(
  costCenterId: string,
  dateRange: { start: Date; end: Date }
): Promise<CoverageAnalysis>

// Requisitos de cobertura
export async function getCoverageRequirements(
  costCenterId: string
): Promise<ShiftCoverageRequirement[]>
export async function createCoverageRequirement(
  data: CreateCoverageRequirementInput
): Promise<ShiftCoverageRequirement>
export async function updateCoverageRequirement(
  id: string,
  data: UpdateCoverageRequirementInput
): Promise<ShiftCoverageRequirement>
export async function deleteCoverageRequirement(id: string): Promise<void>
```

#### Grupo 7: Validaciones

```typescript
// Validaciones de empleado
export async function validateEmployeeWeeklyHours(
  employeeId: string,
  weekStart: Date
): Promise<ValidationResult>
export async function validateEmployeeDailyHours(
  employeeId: string,
  date: Date
): Promise<ValidationResult>
export async function validateRestBetweenShifts(
  employeeId: string,
  newShift: { date: Date; startTime: string; endTime: string }
): Promise<ValidationResult>

// Resumen de empleado
export async function getEmployeeShiftSummary(
  employeeId: string,
  dateRange: { start: Date; end: Date }
): Promise<EmployeeShiftSummary>
```

#### Grupo 8: Informes

```typescript
// Informes generales
export async function getShiftReport(filters: ReportFilters): Promise<ShiftReport>
export async function getEmployeeShiftReport(
  employeeId: string,
  month: Date
): Promise<EmployeeShiftReport>
export async function getCostCenterShiftReport(
  costCenterId: string,
  month: Date
): Promise<CostCenterShiftReport>

// Exportaciones
export async function exportShiftsToCSV(filters: ReportFilters): Promise<string>
export async function exportShiftsToExcel(filters: ReportFilters): Promise<Buffer>
export async function exportShiftsToPDF(filters: ReportFilters): Promise<Buffer>
```

### Archivo: `/src/server/actions/shift-permissions.ts`

```typescript
// Helpers de permisos
export async function canUserPlanShifts(
  userId: string,
  costCenterId?: string
): Promise<boolean>

export async function canUserApproveShifts(userId: string): Promise<boolean>

export async function canUserViewShifts(
  userId: string,
  costCenterId: string
): Promise<boolean>

export async function getUserShiftPermissions(userId: string): Promise<ShiftPermissions>
```

---

## 🎨 Fase 3: Stores de Zustand

### 1. `/src/stores/shifts-store.tsx`

```typescript
interface ShiftsState {
  // Estado
  shifts: Shift[]
  selectedShift: Shift | null
  isLoading: boolean
  error: string | null
  filters: ShiftFilters

  // Acciones sincrónicas
  setShifts: (shifts: Shift[]) => void
  setSelectedShift: (shift: Shift | null) => void
  setFilters: (filters: ShiftFilters) => void
  addShift: (shift: Shift) => void
  updateShiftLocal: (id: string, data: Partial<Shift>) => void
  deleteShiftLocal: (id: string) => void

  // Acciones asincrónicas
  fetchShifts: (filters: ShiftFilters) => Promise<void>
  createShift: (data: CreateShiftInput) => Promise<void>
  updateShift: (id: string, data: UpdateShiftInput) => Promise<void>
  deleteShift: (id: string) => Promise<void>
  duplicateShift: (id: string, newDate: Date) => Promise<void>
  copyWeekShifts: (fromWeek: Date, toWeek: Date) => Promise<void>
  publishShifts: (shiftIds: string[]) => Promise<void>
  requestApproval: (shiftIds: string[]) => Promise<void>
  approveShifts: (shiftIds: string[]) => Promise<void>
  rejectShifts: (shiftIds: string[], reason: string) => Promise<void>
  closeShifts: (shiftIds: string[]) => Promise<void>
}
```

### 2. `/src/stores/shift-templates-store.tsx`

```typescript
interface ShiftTemplatesState {
  // Estado
  templates: ShiftTemplate[]
  selectedTemplate: ShiftTemplate | null
  isLoading: boolean
  error: string | null

  // Acciones sincrónicas
  setTemplates: (templates: ShiftTemplate[]) => void
  setSelectedTemplate: (template: ShiftTemplate | null) => void
  addTemplate: (template: ShiftTemplate) => void
  updateTemplateLocal: (id: string, data: Partial<ShiftTemplate>) => void
  deleteTemplateLocal: (id: string) => void

  // Acciones asincrónicas
  fetchTemplates: (filters?: { costCenterId?: string }) => Promise<void>
  createTemplate: (data: CreateTemplateInput) => Promise<void>
  updateTemplate: (id: string, data: UpdateTemplateInput) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  applyTemplate: (templateId: string, dateRange: { start: Date; end: Date }) => Promise<void>
}
```

### 3. `/src/stores/shift-configuration-store.tsx`

```typescript
interface ShiftConfigurationState {
  // Estado
  config: ShiftConfiguration | null
  planners: ShiftPlanner[]
  isLoading: boolean
  error: string | null

  // Acciones sincrónicas
  setConfig: (config: ShiftConfiguration) => void
  setPlanners: (planners: ShiftPlanner[]) => void

  // Acciones asincrónicas
  fetchConfiguration: () => Promise<void>
  updateConfiguration: (data: UpdateConfigInput) => Promise<void>
  fetchPlanners: () => Promise<void>
  addPlanner: (userId: string, costCenterId?: string, isGlobal?: boolean, canApprove?: boolean) => Promise<void>
  removePlanner: (plannerId: string) => Promise<void>
  updatePlanner: (plannerId: string, data: UpdatePlannerInput) => Promise<void>
}
```

### 4. `/src/stores/shift-assignments-store.tsx`

```typescript
interface ShiftAssignmentsState {
  // Estado
  assignments: ShiftAssignment[]
  isLoading: boolean
  error: string | null

  // Acciones sincrónicas
  setAssignments: (assignments: ShiftAssignment[]) => void
  addAssignment: (assignment: ShiftAssignment) => void
  removeAssignment: (assignmentId: string) => void

  // Acciones asincrónicas
  fetchAssignments: (filters: AssignmentFilters) => Promise<void>
  assignEmployee: (shiftId: string, employeeId: string, notes?: string) => Promise<void>
  unassignEmployee: (assignmentId: string) => Promise<void>
  bulkAssign: (shiftIds: string[], employeeIds: string[]) => Promise<void>
}
```

---

## 📱 Fase 4: UI - Pantallas Principales

### 1. `/src/app/(main)/dashboard/shifts/page.tsx`

**Componente:** `ShiftsDashboard`

**Descripción:** Dashboard principal del módulo de turnos

**Características:**
- Selector de centro (si multi-centro)
- Selector de rango de fechas (semana/mes)
- Toggle entre vista "Por Empleado" y "Por Cobertura"
- KPIs en cards con gradientes:
  - Total turnos planificados
  - Cobertura media (%)
  - Turnos pendientes aprobación
  - Horas totales planificadas
- Acciones rápidas:
  - Botón "Crear Turno"
  - Botón "Aplicar Plantilla"
  - Botón "Configuración" (solo admin)
- Grid responsivo con estados de carga

### 2. `/src/app/(main)/dashboard/shifts/calendar/page.tsx`

**Componente:** `ShiftCalendarView`

**Descripción:** Vista calendario por empleado (drag & drop)

**Layout:**
- **Filas:** Empleados del centro seleccionado
- **Columnas:** Días de la semana/mes
- **Celdas:** Bloques de turno con:
  - Color según plantilla/tipo
  - Horario (09:00-17:00)
  - Nombre del empleado (si asignado)
  - Badges: Domingo, Festivo, Nocturno

**Indicadores por empleado (lateral):**
- Foto + Nombre
- Horas semana actual vs. jornada pactada
- Badge de estado:
  - 🟢 Verde: Dentro de límites
  - 🟡 Ámbar: Cerca del límite (90-100%)
  - 🔴 Rojo: Excede límites
- Horas complementarias usadas/restantes (si part-time)
- Alertas de conflictos:
  - ⚠️ Solape de turnos
  - ⚠️ Descanso insuficiente
  - ⚠️ Límite diario excedido

**Acciones:**
- Click en celda vacía → Dialog "Crear Turno"
- Click en bloque existente → Dialog "Editar Turno"
- Drag & drop de bloque → Reasignar empleado/día
- Botón "Duplicar turno" (icono)
- Botón "Copiar semana completa"
- Botón "Aplicar plantilla a día/semana"

**Tecnología:** `@dnd-kit/core` para drag & drop

### 3. `/src/app/(main)/dashboard/shifts/coverage/page.tsx`

**Componente:** `ShiftCoverageHeatmap`

**Descripción:** Vista de cobertura por franja horaria (heatmap)

**Layout:**
- **Filas:** Franjas horarias (granularidad 30/60 min)
- **Columnas:** Días de la semana
- **Celdas:** Formato `Asignados / Requeridos` con color:
  - 🟢 Verde: Cobertura >= 100% (`#10b981`)
  - 🟡 Ámbar: Cobertura 80-99% (`#f59e0b`)
  - 🔴 Rojo: Cobertura < 80% (`#ef4444`)
  - ⚪ Gris: Sin requisitos configurados (`#6b7280`)

**Filtros (barra superior):**
- Centro (Select)
- Posición/Rol (Select multi)
- Rango de fechas (DateRangePicker)

**KPIs por día (cards debajo del heatmap):**
- Cobertura media del día (%)
- Franjas en rojo (número)
- Horas sin cubrir (total)
- Empleados asignados (total)

**Interacción:**
- Click en celda → Dialog con detalle:
  - Lista de empleados asignados en esa franja
  - Botón "Asignar más empleados"
  - Botón "Ver turnos"

### 4. `/src/app/(main)/dashboard/shifts/templates/page.tsx`

**Componente:** `ShiftTemplatesManager`

**Descripción:** Gestión de plantillas de turno

**Características:**
- Tabs con badges:
  - "Todas" `<Badge>12</Badge>`
  - "Por Centro"
  - "Por Rol"
- DataTable de TanStack con columnas:
  - Nombre
  - Horario (09:00 - 17:00)
  - Duración (8h)
  - Cobertura req.
  - Posición/Rol
  - Centro
  - Color (badge visual)
  - Estado (Activa/Inactiva)
  - Acciones
- Acciones por fila:
  - Editar (Dialog)
  - Duplicar
  - Aplicar a fechas (Dialog)
  - Eliminar (Confirm)
- Botón "Nueva Plantilla" (top-right)
- DataTableViewOptions (mostrar/ocultar columnas)
- DataTablePagination

**Dialog "Nueva Plantilla":**
- Nombre (Input)
- Descripción (Textarea)
- Horario inicio/fin (TimePicker)
- Cobertura requerida (Input numérico)
- Posición/Rol (Select con búsqueda)
- Centro específico (Select opcional)
- Color (ColorPicker)

### 5. `/src/app/(main)/dashboard/shifts/publish/page.tsx`

**Componente:** `ShiftPublicationWorkflow`

**Descripción:** Flujo de publicación con validación

**Pasos:**

**Paso 1: Selección**
- Filtros: Centro, Rango fechas, Estado=DRAFT
- DataTable con turnos en borrador
- Checkbox multi-selección
- Resumen: "X turnos seleccionados, Y empleados afectados"
- Botón "Validar y Continuar"

**Paso 2: Validación**
- Ejecutar `validateShiftsForPublication(shiftIds)`
- Mostrar checklist con resultados:
  - ✅ **Errores (bloqueantes):**
    - Turnos sin empleados asignados
    - Conflictos de horario no resueltos
    - Cobertura insuficiente (si `blockPublishIfUncovered=true`)
  - ⚠️ **Warnings (no bloqueantes):**
    - Horas complementarias cerca del límite
    - Domingos/festivos sin confirmación
    - Publicación con poca anticipación
  - ℹ️ **Info:**
    - Estadísticas generales (horas totales, empleados, etc.)
- Si hay errores: Botón "Corregir" deshabilitado para publicar
- Si solo warnings: Botón "Publicar de todas formas"

**Paso 3: Solicitud de Aprobación** (solo si `publishRequiresApproval=true`)
- Formulario:
  - Aprobador (Select con usuarios que tienen `canApprove=true`)
  - Notas para el aprobador (Textarea)
  - Fecha límite de aprobación (DatePicker)
- Botón "Enviar a Aprobación"
- Notificación enviada a aprobador

**Paso 4: Publicación** (si aprobado o si no requiere aprobación)
- Confirmación final: "¿Publicar X turnos?"
- Checkbox: "Notificar a empleados por email" (opcional)
- Botón "Publicar"
- Notificaciones enviadas a empleados
- Turnos pasan a estado `PUBLISHED`
- Redirección a calendario

### 6. `/src/app/(main)/dashboard/shifts/approvals/page.tsx`

**Componente:** `ShiftApprovalsManager`

**Descripción:** Pantalla de aprobación de solicitudes

**Características:**
- Tabs con badges:
  - "Pendientes" `<Badge>3</Badge>`
  - "Aprobadas"
  - "Rechazadas"
- DataTable con solicitudes:
  - Solicitante (User)
  - Centro
  - Rango de fechas
  - Nº turnos
  - Nº empleados afectados
  - Fecha solicitud
  - Fecha límite
  - Estado
  - Acciones
- Click en fila → Dialog con detalle:
  - Resumen de la solicitud
  - Vista previa del calendario (mini)
  - Notas del solicitante
  - Checklist de validación
  - Botones: "Aprobar", "Rechazar", "Ver en Calendario"

**Dialog "Rechazar":**
- Motivo del rechazo (Textarea obligatorio)
- Botón "Confirmar Rechazo"

**Dialog "Aprobar":**
- Confirmación: "¿Aprobar X turnos?"
- Botón "Confirmar Aprobación"
- Notificación enviada al solicitante

### 7. `/src/app/(main)/dashboard/shifts/reports/page.tsx`

**Componente:** `ShiftReportsHub`

**Descripción:** Hub de informes y exportaciones

**Estructura:**

**Tabs principales:**
1. **Por Empleado**
2. **Por Centro**
3. **Por Organización**

**Tab 1: Por Empleado**
- Filtros:
  - Empleado (Select con búsqueda)
  - Mes (MonthPicker)
- Card con resumen:
  - Horas ordinarias
  - Horas complementarias
  - Horas extra
  - Domingos (horas)
  - Festivos (horas)
  - Nocturnas (horas)
- Comparativa:
  - Horas planificadas vs. fichadas (gráfico de barras)
- Tabla de detalle por día
- Botones de exportación:
  - CSV
  - Excel
  - PDF

**Tab 2: Por Centro**
- Filtros:
  - Centro (Select)
  - Mes (MonthPicker)
- Card con resumen:
  - Cobertura media (%)
  - Franjas deficitarias (número)
  - Horas totales planificadas
  - Horas totales realizadas
- Gráficos:
  - Cobertura por día (línea)
  - Distribución por posición (dona)
  - Horas por tipo de día (barras)
- Tabla de empleados con totales
- Botones de exportación

**Tab 3: Por Organización**
- Filtros:
  - Mes (MonthPicker)
- KPIs agregados:
  - Total horas planificadas (todos los centros)
  - Cobertura global (%)
  - Turnos por tipo (regular/domingo/festivo)
  - Empleados activos en turnos
- Gráfico de comparativa entre centros
- Tabla resumen por centro
- Botones de exportación

### 8. `/src/app/(main)/dashboard/shifts/settings/page.tsx`

**Componente:** `ShiftSettingsPanel`

**Descripción:** Configuración del módulo de turnos

**Secciones:**

**1. General**
- Granularidad de planning (Select: 15/30/60 min)
- Día inicio de semana (Select: Lunes/Domingo)
- Límite horas diarias (Input numérico)
- Límite horas semanales (Input numérico)
- Descanso mínimo entre turnos (Input numérico, horas)

**2. Horas Complementarias y Extra**
- Toggle: "Activar horas complementarias"
- Límite porcentual sobre jornada (Input %, ej: 30%)
- Cap mensual en horas (Input numérico)
- Notas explicativas con iconos de ayuda

**3. Publicación**
- Toggle: "Requiere aprobación para publicar"
- Días mínimos de anticipación (Input numérico)
- Toggle: "Permitir edición tras publicar"
- Toggle: "Bloquear publicación si cobertura incompleta"

**4. Cobertura**
- Toggle: "Enforcer cobertura mínima"
- DataTable con requisitos configurados:
  - Centro
  - Franja horaria
  - Cobertura requerida
  - Posición/Rol
  - Recurrente (Sí/No)
  - Acciones (Editar, Eliminar)
- Botón "Nuevo Requisito"

**5. Planificadores**
- DataTable con planificadores:
  - Usuario (foto + nombre)
  - Ámbito (Global / Centro X)
  - Puede aprobar (Checkbox)
  - Fecha asignación
  - Acciones (Editar permisos, Eliminar)
- Botón "Añadir Planificador"

**Dialog "Añadir Planificador":**
- Usuario (Select con búsqueda)
- Ámbito (Radio: Global / Centro específico)
- Si centro específico: Select de centro
- Checkbox: "Puede aprobar publicaciones"
- Botón "Guardar"

**Botón "Guardar Configuración"** (bottom-right, sticky)

### 9. `/src/app/(main)/dashboard/me/shifts/page.tsx`

**Componente:** `MyShiftsView`

**Descripción:** Vista personal de turnos (empleado)

**Características:**
- Calendario personal de turnos publicados
- Vista semana/mes (toggle)
- Cada turno muestra:
  - Horario (09:00 - 17:00)
  - Duración (8h)
  - Tipo (badge): Regular, Domingo, Festivo, Nocturno
  - Centro de trabajo
  - Posición/Rol
- Indicadores:
  - Horas semana actual
  - Horas mes actual
  - Badge si hay cambios recientes (🔔 "Cambios")
- **NO editable:** Solo visualización
- Lista lateral con próximos turnos (próximos 7 días)
- Exportar mi calendario (iCal/PDF)

---

## 🧩 Fase 5: Componentes Reutilizables

### 1. `/src/components/shifts/shift-calendar.tsx`

**Componente:** `<ShiftCalendar />`

**Props:**
```typescript
interface ShiftCalendarProps {
  shifts: Shift[]
  employees: Employee[]
  dateRange: { start: Date; end: Date }
  onShiftCreate?: (data: CreateShiftInput) => void
  onShiftUpdate?: (id: string, data: UpdateShiftInput) => void
  onAssignmentChange?: (shiftId: string, employeeId: string) => void
  readOnly?: boolean
  view?: 'week' | 'month'
}
```

**Características:**
- Drag & drop con `@dnd-kit/core`
- Responsive (colapsa a lista en móvil)
- Indicadores visuales de conflictos
- Tooltips con detalle al hover
- Context menu (right-click): Editar, Duplicar, Eliminar

**Tecnología:** React + TanStack Virtual (virtualización de filas)

### 2. `/src/components/shifts/coverage-heatmap.tsx`

**Componente:** `<CoverageHeatmap />`

**Props:**
```typescript
interface CoverageHeatmapProps {
  coverageData: CoverageAnalysis
  dateRange: { start: Date; end: Date }
  granularityMinutes: number
  onCellClick?: (timeSlot: string, date: Date) => void
}
```

**Características:**
- Mapa de calor con escala verde→rojo
- Tooltips con detalle (empleados asignados)
- Click en celda → callback con data
- Leyenda de colores
- Responsive (scroll horizontal en móvil)

### 3. `/src/components/shifts/shift-form-dialog.tsx`

**Componente:** `<ShiftFormDialog />`

**Props:**
```typescript
interface ShiftFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Shift
  onSubmit: (data: CreateShiftInput | UpdateShiftInput) => Promise<void>
}
```

**Campos:**
- Fecha (DatePicker)
- Horario inicio/fin (TimePicker con incrementos según granularidad)
- Posición/rol (Select con búsqueda)
- Cobertura requerida (Input numérico con stepper)
- Plantilla base (Select opcional, auto-rellena campos)
- Tipo de día (Select: Regular, Domingo, Festivo, Nocturno)
- Notas (Textarea)

**Validación:** React Hook Form + Zod

### 4. `/src/components/shifts/shift-validation-checklist.tsx`

**Componente:** `<ShiftValidationChecklist />`

**Props:**
```typescript
interface ValidationChecklistProps {
  validationResults: ValidationResult[]
  showWarnings?: boolean
  showInfo?: boolean
}
```

**Renderizado:**
- Lista agrupada por severidad:
  - ❌ **Errores:** Badge rojo, texto rojo
  - ⚠️ **Warnings:** Badge ámbar, texto ámbar
  - ℹ️ **Info:** Badge azul, texto normal
- Iconos de Lucide React: `XCircle`, `AlertTriangle`, `Info`
- Expandible por grupo (Accordion)

### 5. `/src/components/shifts/employee-shift-summary.tsx`

**Componente:** `<EmployeeShiftSummary />`

**Props:**
```typescript
interface EmployeeShiftSummaryProps {
  employeeId: string
  weekStart: Date
  shifts: Shift[]
  contractedHours: number
}
```

**Muestra:**
- Card con foto del empleado
- Nombre + Posición
- Badge de estado (verde/ámbar/rojo)
- Horas planificadas vs. pactadas (Progress bar)
- Horas complementarias usadas/restantes (si part-time)
- Lista de conflictos detectados (Accordion)
- Botón "Ver detalle"

### 6. `/src/components/shifts/shift-block.tsx`

**Componente:** `<ShiftBlock />`

**Props:**
```typescript
interface ShiftBlockProps {
  shift: Shift
  assignment?: ShiftAssignment
  onClick?: () => void
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: (e: DragEvent) => void
  readOnly?: boolean
}
```

**Renderizado:**
- Card pequeño con:
  - Color de fondo según plantilla/tipo
  - Horario (bold)
  - Nombre empleado (si asignado)
  - Badges: Domingo, Festivo, Nocturno
  - Icono de conflicto (si tiene anomalías)
- Draggable (si no es readOnly)
- Animaciones con Framer Motion

### 7. `/src/components/shifts/time-slot-picker.tsx`

**Componente:** `<TimeSlotPicker />`

**Props:**
```typescript
interface TimeSlotPickerProps {
  value: string // "09:00"
  onChange: (value: string) => void
  granularityMinutes: number
  minTime?: string
  maxTime?: string
}
```

**Características:**
- Select con opciones según granularidad
- Ejemplo: Si granularityMinutes=30, opciones: 00:00, 00:30, 01:00, ...
- Validación de rango (minTime/maxTime)

---

## 🔐 Fase 6: Sistema de Permisos

### Lógica de Permisos

#### Función: `canUserPlanShifts(userId, costCenterId?)`

```typescript
export async function canUserPlanShifts(
  userId: string,
  costCenterId?: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return false

  // SUPER_ADMIN y ORG_ADMIN: siempre pueden
  if (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN") return true

  // HR_ADMIN: siempre en su organización
  if (user.role === "HR_ADMIN") return true

  // ShiftPlanner asignado
  const planner = await prisma.shiftPlanner.findFirst({
    where: {
      userId,
      orgId: user.orgId,
      OR: [
        { isGlobal: true },
        { costCenterId }
      ]
    }
  })

  return planner !== null
}
```

#### Función: `canUserApproveShifts(userId)`

```typescript
export async function canUserApproveShifts(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return false

  // Roles administrativos: siempre
  if (["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(user.role)) {
    return true
  }

  // ShiftPlanner con flag canApprove
  const planner = await prisma.shiftPlanner.findFirst({
    where: {
      userId,
      orgId: user.orgId,
      canApprove: true
    }
  })

  return planner !== null
}
```

#### Función: `canUserViewShifts(userId, costCenterId)`

```typescript
export async function canUserViewShifts(
  userId: string,
  costCenterId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true }
  })
  if (!user) return false

  // Administradores: siempre
  if (["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "MANAGER"].includes(user.role)) {
    return true
  }

  // Empleados: solo si tienen contrato en ese centro y modo SHIFT_BASED
  if (user.employee) {
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId: user.employee.id,
        costCenterId,
        workScheduleMode: "SHIFT_BASED",
        active: true
      }
    })
    return contract !== null
  }

  return false
}
```

### Matriz de Permisos

| Acción | SUPER_ADMIN | ORG_ADMIN | HR_ADMIN | MANAGER | ShiftPlanner (Global) | ShiftPlanner (Centro) | EMPLOYEE |
|--------|-------------|-----------|----------|---------|----------------------|----------------------|----------|
| Ver configuración | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar configuración | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar planificadores | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear plantillas | ✅ | ✅ | ✅ | ❌ | ✅ (todos) | ✅ (su centro) | ❌ |
| Crear turnos | ✅ | ✅ | ✅ | ❌ | ✅ (todos) | ✅ (su centro) | ❌ |
| Editar turnos DRAFT | ✅ | ✅ | ✅ | ❌ | ✅ (todos) | ✅ (su centro) | ❌ |
| Asignar empleados | ✅ | ✅ | ✅ | ❌ | ✅ (todos) | ✅ (su centro) | ❌ |
| Solicitar publicación | ✅ | ✅ | ✅ | ❌ | ✅ (todos) | ✅ (su centro) | ❌ |
| Aprobar publicación | ✅ | ✅ | ✅ | ❌ | ✅ (si canApprove) | ✅ (si canApprove) | ❌ |
| Ver turnos publicados | ✅ | ✅ | ✅ | ✅ (subordinados) | ✅ (todos) | ✅ (su centro) | ✅ (solo suyos) |
| Ver informes org | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver informes centro | ✅ | ✅ | ✅ | ✅ (su centro) | ✅ (todos) | ✅ (su centro) | ❌ |
| Ver informes empleado | ✅ | ✅ | ✅ | ✅ (subordinados) | ✅ (todos) | ✅ (su centro) | ✅ (solo suyo) |
| Cerrar turnos | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔗 Fase 7: Integración con Fichajes

### Sincronización Automática en Fichaje

#### Modificar `/src/server/actions/time-tracking.ts`

```typescript
export async function clockIn(
  latitude?: number,
  longitude?: number,
  accuracy?: number
) {
  const user = await getAuthenticatedUser()
  const employee = await getAuthenticatedEmployee()

  // ... lógica existente de creación de TimeEntry ...

  // NUEVO: Buscar turno asignado para hoy
  const today = startOfDay(new Date())
  const shiftAssignment = await prisma.shiftAssignment.findFirst({
    where: {
      employeeId: employee.id,
      shift: {
        date: today,
        status: "PUBLISHED"
      },
      status: { in: ["ASSIGNED", "CONFIRMED"] }
    },
    include: {
      shift: true
    }
  })

  // Si hay turno asignado, actualizar con datos reales
  if (shiftAssignment) {
    await prisma.shiftAssignment.update({
      where: { id: shiftAssignment.id },
      data: {
        actualClockIn: new Date(),
        status: "COMPLETED"
      }
    })

    // Detectar retraso
    const expectedClockIn = parseTime(shiftAssignment.shift.startTime)
    const actualClockIn = new Date()
    const delayMinutes = Math.floor((actualClockIn - expectedClockIn) / (1000 * 60))

    if (delayMinutes > 15) { // Tolerancia de 15 minutos
      await prisma.shiftAssignment.update({
        where: { id: shiftAssignment.id },
        data: {
          hasDelay: true,
          delayMinutes
        }
      })

      // Notificar a manager
      await notifyShiftAnomaly(employee.id, "DELAY", delayMinutes)
    }
  } else {
    // Fichaje fuera de turno
    // Buscar si hay algún turno para hoy
    const shiftsToday = await prisma.shift.findMany({
      where: {
        date: today,
        costCenterId: employee.costCenterId,
        status: "PUBLISHED"
      }
    })

    if (shiftsToday.length > 0) {
      // Hay turnos publicados pero el empleado no está asignado
      // Marcar como anomalía "trabajó fuera de turno"
      await notifyShiftAnomaly(employee.id, "WORKED_OUTSIDE_SHIFT", 0)
    }
  }

  // ... resto de lógica existente ...
}
```

#### Modificar `clockOut` de forma similar

```typescript
export async function clockOut() {
  // ... lógica existente ...

  // Actualizar ShiftAssignment con actualClockOut y actualWorkedMinutes
  if (shiftAssignment) {
    const actualWorkedMinutes = calculateMinutes(actualClockIn, actualClockOut)

    await prisma.shiftAssignment.update({
      where: { id: shiftAssignment.id },
      data: {
        actualClockOut: new Date(),
        actualWorkedMinutes,
        status: "COMPLETED"
      }
    })

    // Detectar salida anticipada
    const expectedClockOut = parseTime(shiftAssignment.shift.endTime)
    const actualClockOut = new Date()
    const earlyExitMinutes = Math.floor((expectedClockOut - actualClockOut) / (1000 * 60))

    if (earlyExitMinutes > 15) {
      await prisma.shiftAssignment.update({
        where: { id: shiftAssignment.id },
        data: {
          hasEarlyExit: true,
          earlyExitMinutes
        }
      })

      await notifyShiftAnomaly(employee.id, "EARLY_EXIT", earlyExitMinutes)
    }
  }
}
```

### Job Nocturno: Procesamiento de Turnos Completados

**Archivo:** `/src/lib/jobs/process-completed-shifts.ts`

```typescript
import { prisma } from "@/lib/prisma"
import { startOfDay, subDays } from "date-fns"

/**
 * Job que se ejecuta cada noche a las 02:00 AM
 * Procesa turnos del día anterior y detecta ausencias
 */
export async function processCompletedShifts() {
  const yesterday = startOfDay(subDays(new Date(), 1))

  console.log(`[CRON] Procesando turnos completados del ${yesterday.toISOString()}`)

  // 1. Buscar todos los turnos publicados de ayer
  const shifts = await prisma.shift.findMany({
    where: {
      date: yesterday,
      status: "PUBLISHED"
    },
    include: {
      assignments: true
    }
  })

  console.log(`[CRON] Encontrados ${shifts.length} turnos para procesar`)

  for (const shift of shifts) {
    for (const assignment of shift.assignments) {
      // Si no hay fichaje de entrada, marcar como ausente
      if (!assignment.actualClockIn) {
        await prisma.shiftAssignment.update({
          where: { id: assignment.id },
          data: {
            status: "ABSENT",
            wasAbsent: true
          }
        })

        console.log(`[CRON] Empleado ${assignment.employeeId} ausente en turno ${shift.id}`)

        // Notificar a manager
        await notifyShiftAnomaly(assignment.employeeId, "ABSENT", 0)
      }
      // Si solo hay entrada pero no salida, mantener en COMPLETED con flag
      else if (!assignment.actualClockOut) {
        console.log(`[CRON] Empleado ${assignment.employeeId} sin fichaje de salida en turno ${shift.id}`)
        // Ya se maneja en la lógica de fichajes incompletos existente
      }
    }
  }

  console.log(`[CRON] Procesamiento completado`)
}
```

**Configurar cron en Vercel/Next.js:**

```typescript
// /src/app/api/cron/process-shifts/route.ts
import { processCompletedShifts } from "@/lib/jobs/process-completed-shifts"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Verificar token de autorización (Vercel Cron secret)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    await processCompletedShifts()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CRON ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

**Configurar en `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/process-shifts",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## 🔔 Fase 8: Notificaciones

### Tipos de Notificación (añadir a enum `PtoNotificationType`)

```prisma
enum PtoNotificationType {
  // ... existentes ...

  // NUEVAS para turnos
  SHIFTS_PUBLISHED              // Turnos publicados para empleado
  SHIFT_MODIFIED                // Turno modificado
  SHIFT_APPROVAL_REQUESTED      // Solicitud de aprobación de turnos
  SHIFTS_APPROVED               // Turnos aprobados
  SHIFTS_REJECTED               // Turnos rechazados
  SHIFT_ANOMALY_DETECTED        // Anomalía en fichaje de turno
  SHIFT_COVERAGE_CRITICAL       // Cobertura crítica en centro
}
```

### Funciones de Notificación

**Archivo:** `/src/server/actions/shift-notifications.ts`

```typescript
import { prisma } from "@/lib/prisma"
import type { PtoNotificationType } from "@prisma/client"

/**
 * Enviar notificación de turnos publicados a empleados asignados
 */
export async function notifyShiftsPublished(shiftIds: string[]) {
  const shifts = await prisma.shift.findMany({
    where: { id: { in: shiftIds } },
    include: {
      assignments: {
        include: {
          employee: { include: { user: true } }
        }
      },
      costCenter: true
    }
  })

  // Agrupar por empleado
  const byEmployee = new Map<string, typeof shifts>()

  for (const shift of shifts) {
    for (const assignment of shift.assignments) {
      if (!assignment.employee.user) continue

      if (!byEmployee.has(assignment.employee.id)) {
        byEmployee.set(assignment.employee.id, [])
      }
      byEmployee.get(assignment.employee.id)!.push(shift)
    }
  }

  // Crear notificaciones
  const notifications = []

  for (const [employeeId, employeeShifts] of byEmployee) {
    const employee = employeeShifts[0].assignments.find(a => a.employeeId === employeeId)!.employee
    const dateRange = getDateRange(employeeShifts.map(s => s.date))

    notifications.push({
      type: "SHIFTS_PUBLISHED" as PtoNotificationType,
      title: "Nuevos turnos publicados",
      message: `Tus turnos del ${dateRange} han sido publicados. Revisa tu calendario.`,
      userId: employee.user!.id,
      orgId: employee.orgId
    })
  }

  await prisma.ptoNotification.createMany({ data: notifications })
}

/**
 * Notificar cambio en turno asignado
 */
export async function notifyShiftModified(shiftId: string, changeDescription: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      assignments: {
        include: {
          employee: { include: { user: true } }
        }
      }
    }
  })

  if (!shift) return

  const notifications = shift.assignments
    .filter(a => a.employee.user)
    .map(assignment => ({
      type: "SHIFT_MODIFIED" as PtoNotificationType,
      title: "Turno modificado",
      message: `Tu turno del ${formatDate(shift.date)} ha sido modificado: ${changeDescription}`,
      userId: assignment.employee.user!.id,
      orgId: shift.orgId
    }))

  await prisma.ptoNotification.createMany({ data: notifications })
}

/**
 * Notificar solicitud de aprobación a aprobadores
 */
export async function notifyShiftApprovalRequested(
  shiftIds: string[],
  requesterId: string
) {
  const requester = await prisma.user.findUnique({ where: { id: requesterId } })
  if (!requester) return

  const shifts = await prisma.shift.findMany({
    where: { id: { in: shiftIds } },
    include: { costCenter: true }
  })

  const costCenterIds = [...new Set(shifts.map(s => s.costCenterId))]

  // Buscar aprobadores para estos centros
  const approvers = await prisma.shiftPlanner.findMany({
    where: {
      orgId: requester.orgId,
      canApprove: true,
      OR: [
        { isGlobal: true },
        { costCenterId: { in: costCenterIds } }
      ]
    },
    include: { user: true }
  })

  const notifications = approvers.map(planner => ({
    type: "SHIFT_APPROVAL_REQUESTED" as PtoNotificationType,
    title: "Nueva solicitud de aprobación de turnos",
    message: `${requester.name} ha solicitado aprobación para ${shiftIds.length} turnos`,
    userId: planner.userId,
    orgId: requester.orgId
  }))

  await prisma.ptoNotification.createMany({ data: notifications })
}

/**
 * Notificar aprobación al solicitante
 */
export async function notifyShiftsApproved(shiftIds: string[], approverId: string) {
  const approver = await prisma.user.findUnique({ where: { id: approverId } })
  const shifts = await prisma.shift.findMany({ where: { id: { in: shiftIds } } })
  const creatorId = shifts[0]?.createdById

  if (!approver || !creatorId) return

  await prisma.ptoNotification.create({
    data: {
      type: "SHIFTS_APPROVED" as PtoNotificationType,
      title: "Turnos aprobados",
      message: `${approver.name} ha aprobado ${shiftIds.length} turnos. Ya puedes publicarlos.`,
      userId: creatorId,
      orgId: shifts[0].orgId
    }
  })
}

/**
 * Notificar rechazo al solicitante
 */
export async function notifyShiftsRejected(
  shiftIds: string[],
  rejecterId: string,
  reason: string
) {
  const rejecter = await prisma.user.findUnique({ where: { id: rejecterId } })
  const shifts = await prisma.shift.findMany({ where: { id: { in: shiftIds } } })
  const creatorId = shifts[0]?.createdById

  if (!rejecter || !creatorId) return

  await prisma.ptoNotification.create({
    data: {
      type: "SHIFTS_REJECTED" as PtoNotificationType,
      title: "Turnos rechazados",
      message: `${rejecter.name} ha rechazado ${shiftIds.length} turnos. Motivo: ${reason}`,
      userId: creatorId,
      orgId: shifts[0].orgId
    }
  })
}

/**
 * Notificar anomalía en fichaje a manager
 */
export async function notifyShiftAnomaly(
  employeeId: string,
  anomalyType: "DELAY" | "EARLY_EXIT" | "ABSENT" | "WORKED_OUTSIDE_SHIFT",
  minutes: number
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      employmentContracts: {
        where: { active: true },
        include: { manager: { include: { user: true } } }
      }
    }
  })

  if (!employee || !employee.employmentContracts[0]?.manager?.user) return

  const messages = {
    DELAY: `ha llegado ${minutes} minutos tarde`,
    EARLY_EXIT: `ha salido ${minutes} minutos antes`,
    ABSENT: `no ha fichado entrada en su turno`,
    WORKED_OUTSIDE_SHIFT: `ha fichado sin tener turno asignado`
  }

  await prisma.ptoNotification.create({
    data: {
      type: "SHIFT_ANOMALY_DETECTED" as PtoNotificationType,
      title: "Anomalía en turno",
      message: `${employee.firstName} ${employee.lastName} ${messages[anomalyType]}`,
      userId: employee.employmentContracts[0].manager.user.id,
      orgId: employee.orgId
    }
  })
}

/**
 * Notificar cobertura crítica a planificadores
 */
export async function notifyShiftCoverageCritical(
  costCenterId: string,
  date: Date,
  timeSlot: string,
  assigned: number,
  required: number
) {
  const planners = await prisma.shiftPlanner.findMany({
    where: {
      OR: [
        { costCenterId, isGlobal: false },
        { isGlobal: true }
      ]
    },
    include: { user: true, costCenter: true }
  })

  const notifications = planners.map(planner => ({
    type: "SHIFT_COVERAGE_CRITICAL" as PtoNotificationType,
    title: "Cobertura crítica",
    message: `Centro ${planner.costCenter?.name || "N/A"} - ${formatDate(date)} ${timeSlot}: solo ${assigned} de ${required} cubiertos`,
    userId: planner.userId,
    orgId: planner.orgId
  }))

  await prisma.ptoNotification.createMany({ data: notifications })
}
```

---

## 📊 Fase 9: KPIs e Informes

### Fórmulas Clave

#### 1. Cobertura de Turno

```typescript
function calculateShiftCoverage(shift: Shift, assignments: ShiftAssignment[]): number {
  const assignedCount = assignments.filter(a => a.status !== "CANCELLED").length
  const coveragePercent = (assignedCount / shift.requiredHeadcount) * 100
  return Math.min(coveragePercent, 100) // Cap al 100%
}
```

#### 2. Horas Complementarias (Part-Time)

```typescript
async function calculateComplementaryHours(
  employeeId: string,
  month: Date
): Promise<{ used: number; limit: number; available: number }> {
  const contract = await getActiveContract(employeeId)
  const config = await getShiftConfiguration(contract.orgId)

  // Horas pactadas semanales
  const contractedWeeklyHours = Number(contract.weeklyHours)

  // Horas trabajadas en el mes
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: {
        date: { gte: startOfMonth(month), lte: endOfMonth(month) }
      }
    },
    include: { shift: true }
  })

  const totalWorkedMinutes = assignments.reduce((sum, a) => {
    return sum + (a.actualWorkedMinutes ? Number(a.actualWorkedMinutes) : a.shift.durationMinutes)
  }, 0)

  const totalWorkedHours = totalWorkedMinutes / 60

  // Horas pactadas en el mes (proporcional)
  const weeksInMonth = 4.33 // Promedio
  const contractedMonthlyHours = contractedWeeklyHours * weeksInMonth

  // Horas complementarias = max(0, trabajadas - pactadas)
  const complementaryHours = Math.max(0, totalWorkedHours - contractedMonthlyHours)

  // Límite de complementarias
  const limitPercent = config?.complementaryHoursLimitPercent
    ? Number(config.complementaryHoursLimitPercent)
    : 30
  const limitHours = (contractedMonthlyHours * limitPercent) / 100

  // Cap mensual (si configurado)
  const monthlyCap = config?.complementaryHoursMonthlyCap
    ? Number(config.complementaryHoursMonthlyCap)
    : Infinity

  const effectiveLimit = Math.min(limitHours, monthlyCap)
  const available = Math.max(0, effectiveLimit - complementaryHours)

  return {
    used: complementaryHours,
    limit: effectiveLimit,
    available
  }
}
```

#### 3. Horas Extra (Full-Time)

```typescript
async function calculateOvertimeHours(
  employeeId: string,
  week: Date
): Promise<number> {
  const contract = await getActiveContract(employeeId)
  const contractedWeeklyHours = Number(contract.weeklyHours)

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: {
        date: { gte: startOfWeek(week), lte: endOfWeek(week) }
      }
    },
    include: { shift: true }
  })

  const totalWorkedMinutes = assignments.reduce((sum, a) => {
    return sum + (a.actualWorkedMinutes ? Number(a.actualWorkedMinutes) : a.shift.durationMinutes)
  }, 0)

  const totalWorkedHours = totalWorkedMinutes / 60

  // Extra = max(0, trabajadas - pactadas)
  return Math.max(0, totalWorkedHours - contractedWeeklyHours)
}
```

#### 4. Horas por Tipo de Día

```typescript
async function calculateHoursByShiftType(
  employeeId: string,
  month: Date
): Promise<{ regular: number; sunday: number; holiday: number; night: number }> {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: {
        date: { gte: startOfMonth(month), lte: endOfMonth(month) }
      }
    },
    include: { shift: true }
  })

  const result = { regular: 0, sunday: 0, holiday: 0, night: 0 }

  for (const assignment of assignments) {
    const hours = (a.actualWorkedMinutes
      ? Number(a.actualWorkedMinutes)
      : a.shift.durationMinutes) / 60

    switch (assignment.shift.shiftType) {
      case "REGULAR": result.regular += hours; break
      case "SUNDAY": result.sunday += hours; break
      case "HOLIDAY": result.holiday += hours; break
      case "NIGHT": result.night += hours; break
    }
  }

  return result
}
```

#### 5. Tasa de Ausencias

```typescript
async function calculateAbsenceRate(
  employeeId: string,
  dateRange: { start: Date; end: Date }
): Promise<number> {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: {
        date: { gte: dateRange.start, lte: dateRange.end },
        status: "PUBLISHED"
      }
    }
  })

  if (assignments.length === 0) return 0

  const absences = assignments.filter(a => a.wasAbsent).length
  return (absences / assignments.length) * 100
}
```

---

## 📄 Fase 10: Exportaciones

### Formato CSV (Por Empleado)

```csv
Empleado,NIF,Mes,Horas Ordinarias,Horas Complementarias,Horas Extra,Domingos,Festivos,Nocturnas,Turnos Completos,Ausencias
Juan Pérez,12345678A,2025-01,160.00,8.00,0.00,8.00,0.00,0.00,20,0
María López,87654321B,2025-01,120.00,12.00,0.00,0.00,8.00,0.00,18,1
```

**Implementación:**

```typescript
export async function exportEmployeeShiftReportToCSV(
  employeeId: string,
  month: Date
): Promise<string> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  const summary = await getEmployeeShiftSummary(employeeId, {
    start: startOfMonth(month),
    end: endOfMonth(month)
  })

  const rows = [
    ["Empleado", "NIF", "Mes", "Horas Ordinarias", "Horas Complementarias", "Horas Extra", "Domingos", "Festivos", "Nocturnas", "Turnos Completos", "Ausencias"],
    [
      `${employee.firstName} ${employee.lastName}`,
      employee.nifNie,
      format(month, "yyyy-MM"),
      summary.regularHours.toFixed(2),
      summary.complementaryHours.toFixed(2),
      summary.overtimeHours.toFixed(2),
      summary.sundayHours.toFixed(2),
      summary.holidayHours.toFixed(2),
      summary.nightHours.toFixed(2),
      summary.completedShifts.toString(),
      summary.absences.toString()
    ]
  ]

  return rows.map(row => row.join(",")).join("\n")
}
```

### Formato Excel (Por Centro)

**Hoja 1: Resumen**

| Centro | Mes | Horas Planificadas | Horas Realizadas | Cobertura Media | Franjas Críticas |
|--------|-----|-------------------|------------------|----------------|------------------|
| Madrid Centro | 2025-01 | 3200.00 | 3150.00 | 92.5% | 5 |

**Hoja 2: Detalle por Empleado**

| Empleado | Horas Ordinarias | Complementarias | Extra | Domingos | Festivos | Nocturnas |
|----------|-----------------|----------------|-------|----------|----------|-----------|
| Juan Pérez | 160.00 | 8.00 | 0.00 | 8.00 | 0.00 | 0.00 |

**Implementación:** Usar librería `exceljs`

```typescript
import ExcelJS from "exceljs"

export async function exportCostCenterShiftReportToExcel(
  costCenterId: string,
  month: Date
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  // Hoja 1: Resumen
  const summarySheet = workbook.addWorksheet("Resumen")
  summarySheet.columns = [
    { header: "Centro", key: "center", width: 20 },
    { header: "Mes", key: "month", width: 12 },
    { header: "Horas Planificadas", key: "planned", width: 18 },
    { header: "Horas Realizadas", key: "actual", width: 18 },
    { header: "Cobertura Media", key: "coverage", width: 15 },
    { header: "Franjas Críticas", key: "critical", width: 15 }
  ]

  const report = await getCostCenterShiftReport(costCenterId, month)

  summarySheet.addRow({
    center: report.costCenter.name,
    month: format(month, "yyyy-MM"),
    planned: report.totalPlannedHours.toFixed(2),
    actual: report.totalActualHours.toFixed(2),
    coverage: `${report.averageCoverage.toFixed(1)}%`,
    critical: report.criticalSlots
  })

  // Hoja 2: Detalle por empleado
  const detailSheet = workbook.addWorksheet("Detalle por Empleado")
  detailSheet.columns = [
    { header: "Empleado", key: "employee", width: 25 },
    { header: "Horas Ordinarias", key: "regular", width: 18 },
    { header: "Complementarias", key: "complementary", width: 15 },
    { header: "Extra", key: "overtime", width: 10 },
    { header: "Domingos", key: "sunday", width: 12 },
    { header: "Festivos", key: "holiday", width: 12 },
    { header: "Nocturnas", key: "night", width: 12 }
  ]

  for (const employeeReport of report.employees) {
    detailSheet.addRow({
      employee: `${employeeReport.firstName} ${employeeReport.lastName}`,
      regular: employeeReport.regularHours.toFixed(2),
      complementary: employeeReport.complementaryHours.toFixed(2),
      overtime: employeeReport.overtimeHours.toFixed(2),
      sunday: employeeReport.sundayHours.toFixed(2),
      holiday: employeeReport.holidayHours.toFixed(2),
      night: employeeReport.nightHours.toFixed(2)
    })
  }

  // Retornar buffer
  return await workbook.xlsx.writeBuffer()
}
```

### Formato PDF

**Estilo:** Informe tipo nómina

**Estructura:**
- Encabezado: Logo organización, nombre empleado, mes
- Tabla: Desglose de horas por tipo
- Gráfico: Distribución semanal (opcional)
- Firmas: Empleado, Responsable

**Implementación:** Usar `pdfkit` o `react-pdf`

---

## 🧪 Fase 11: Validaciones Críticas

### Validación Pre-Asignación

```typescript
export async function validateShiftAssignment(
  shiftId: string,
  employeeId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  const contract = await prisma.employmentContract.findFirst({
    where: { employeeId, active: true }
  })

  if (!shift || !employee || !contract) {
    return { valid: false, errors: ["Datos no encontrados"] }
  }

  // 1. Validar que el contrato es SHIFT_BASED
  if (contract.workScheduleMode !== "SHIFT_BASED") {
    errors.push("El empleado no tiene un contrato de turnos")
  }

  // 2. Validar solapes
  const existingShifts = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: { date: shift.date }
    },
    include: { shift: true }
  })

  for (const existing of existingShifts) {
    if (shiftsOverlap(shift, existing.shift)) {
      errors.push(`El empleado ya tiene un turno de ${existing.shift.startTime} a ${existing.shift.endTime}`)
    }
  }

  // 3. Validar descanso mínimo
  const config = await getShiftConfiguration(shift.orgId)
  const minRestHours = config?.minRestBetweenShiftsHours ? Number(config.minRestBetweenShiftsHours) : 12

  const previousShift = await prisma.shiftAssignment.findFirst({
    where: {
      employeeId,
      shift: { date: { lt: shift.date } }
    },
    include: { shift: true },
    orderBy: { shift: { date: "desc" } }
  })

  if (previousShift) {
    const restHours = calculateRestHours(
      previousShift.shift.date,
      previousShift.shift.endTime,
      shift.date,
      shift.startTime
    )

    if (restHours < minRestHours) {
      errors.push(`Descanso insuficiente: ${restHours.toFixed(1)}h < ${minRestHours}h`)
    }
  }

  // 4. Validar límite diario
  const maxDailyHours = config?.maxDailyHours ? Number(config.maxDailyHours) : 9
  const dailyHours = await calculateDailyHours(employeeId, shift.date, shift.durationMinutes)

  if (dailyHours > maxDailyHours) {
    errors.push(`Excede límite diario: ${dailyHours.toFixed(1)}h > ${maxDailyHours}h`)
  }

  // 5. Validar límite semanal
  const maxWeeklyHours = config?.maxWeeklyHours ? Number(config.maxWeeklyHours) : 40
  const weekStart = startOfWeek(shift.date)
  const weeklyHours = await calculateWeeklyHours(employeeId, weekStart, shift.durationMinutes)

  if (weeklyHours > maxWeeklyHours) {
    errors.push(`Excede límite semanal: ${weeklyHours.toFixed(1)}h > ${maxWeeklyHours}h`)
  }

  return { valid: errors.length === 0, errors }
}
```

### Validación Pre-Publicación

```typescript
export async function validateShiftsForPublication(
  shiftIds: string[]
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const config = await getShiftConfiguration() // Asumimos orgId del contexto

  for (const shiftId of shiftIds) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { assignments: true, costCenter: true }
    })

    if (!shift) continue

    // 1. Validar empleados asignados
    if (shift.assignments.length === 0) {
      results.push({
        shiftId,
        severity: "ERROR",
        message: "No hay empleados asignados a este turno"
      })
    }

    // 2. Validar cobertura mínima
    if (shift.assignments.length < shift.requiredHeadcount) {
      const deficit = shift.requiredHeadcount - shift.assignments.length
      const severity = config?.blockPublishIfUncovered ? "ERROR" : "WARNING"
      results.push({
        shiftId,
        severity,
        message: `Cobertura insuficiente: faltan ${deficit} empleado(s)`
      })
    }

    // 3. Validar anticipación
    const daysInAdvance = Math.floor(
      (shift.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    const minAdvance = config?.minAdvancePublishDays ?? 7
    if (daysInAdvance < minAdvance) {
      results.push({
        shiftId,
        severity: "WARNING",
        message: `Publicación con poca anticipación: ${daysInAdvance} días (mínimo ${minAdvance})`
      })
    }

    // 4. Información sobre tipo de día
    if (shift.shiftType === "SUNDAY") {
      results.push({
        shiftId,
        severity: "INFO",
        message: "Este turno es en domingo"
      })
    }

    if (shift.shiftType === "HOLIDAY") {
      results.push({
        shiftId,
        severity: "INFO",
        message: "Este turno es en festivo"
      })
    }

    // 5. Validar horas complementarias cerca del límite
    for (const assignment of shift.assignments) {
      const complementary = await calculateComplementaryHours(
        assignment.employeeId,
        shift.date
      )

      if (complementary.available < 5) {
        results.push({
          shiftId,
          severity: "WARNING",
          message: `Empleado ${assignment.employeeId} cerca del límite de horas complementarias`
        })
      }
    }
  }

  return results
}
```

---

## 🎨 Fase 12: Navegación y Menú

### Actualizar `/src/navigation/sidebar/sidebar-items.ts`

```typescript
import {
  CalendarClock,
  CalendarDays,
  // ... otros iconos
} from "lucide-react"

// Añadir grupo de Gestión de Turnos
{
  groupLabel: "Gestión de Turnos",
  menus: [
    {
      label: "Gestión de Turnos",
      href: "/dashboard/shifts",
      icon: CalendarClock,
      badge: "NUEVO",
      subItems: [
        { label: "Dashboard", href: "/dashboard/shifts" },
        { label: "Calendario", href: "/dashboard/shifts/calendar" },
        { label: "Cobertura", href: "/dashboard/shifts/coverage" },
        { label: "Plantillas", href: "/dashboard/shifts/templates" },
        { label: "Publicar", href: "/dashboard/shifts/publish" },
        { label: "Aprobaciones", href: "/dashboard/shifts/approvals" },
        { label: "Informes", href: "/dashboard/shifts/reports" },
        { label: "Configuración", href: "/dashboard/shifts/settings" },
      ],
      // Visible solo para roles administrativos y planificadores
      visible: (user) => {
        return ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(user.role) ||
               user.shiftPlannerRole !== null
      }
    },
    {
      label: "Mis Turnos",
      href: "/dashboard/me/shifts",
      icon: CalendarDays,
      // Visible para empleados con contrato SHIFT_BASED
      visible: async (user) => {
        if (!user.employee) return false
        const contract = await prisma.employmentContract.findFirst({
          where: {
            employeeId: user.employee.id,
            workScheduleMode: "SHIFT_BASED",
            active: true
          }
        })
        return contract !== null
      }
    }
  ]
}
```

---

## 📚 Fase 13: Documentación

### Estructura de Documentación

```
/docs/shifts/
  ├── README.md (este archivo)
  ├── configuration.md
  ├── permissions.md
  ├── validations.md
  ├── reports.md
  ├── integration.md
  └── diagrams/
      ├── architecture-c4.mmd
      ├── workflow-publication.mmd
      └── integration-fichajes.mmd
```

### 1. README.md (Visión General)

- Descripción del módulo
- Casos de uso (retail, hospitality)
- Flujos principales
- Glosario de términos

### 2. configuration.md

- Activación del módulo
- Configuración de planificadores
- Configuración de cobertura mínima
- Configuración de horas complementarias/extra
- Calendarios de festivos

### 3. permissions.md

- Matriz de permisos por rol
- Ejemplos de asignación de planificadores
- Flujo de aprobación

### 4. validations.md

- Listado completo de validaciones
- Fórmulas de cálculo
- Ejemplos de errores y warnings

### 5. reports.md

- Tipos de informe disponibles
- Fórmulas de KPIs
- Ejemplos de exportación

### 6. integration.md

- Integración con fichajes
- Sincronización automática
- Jobs nocturnos
- Notificaciones

---

## 🚀 Orden de Implementación Sugerido

### Sprint 1: Fundamentos (1-2 semanas)

1. ✅ Crear modelos Prisma
2. ✅ Ejecutar migración: `npx prisma migrate dev --name add_shift_management_module`
3. ✅ Crear server actions básicos (CRUD turnos, plantillas, configuración)
4. ✅ Crear stores de Zustand (shifts, templates, configuration)
5. ✅ Crear pantalla: Dashboard principal (`/shifts`)
6. ✅ Crear pantalla: Gestión de plantillas (`/shifts/templates`)
7. ✅ Crear componente: Formulario de turno (dialog)

### Sprint 2: Calendario y Asignación (1-2 semanas)

8. ✅ Instalar `@dnd-kit/core` y configurar
9. ✅ Crear componente: Calendario drag & drop (`<ShiftCalendar />`)
10. ✅ Crear pantalla: Vista por empleado (`/shifts/calendar`)
11. ✅ Implementar server actions: Asignación de empleados
12. ✅ Crear store: Shift assignments
13. ✅ Implementar validaciones: Solapes, descansos, límites diarios/semanales
14. ✅ Crear componente: Resumen de empleado (`<EmployeeShiftSummary />`)

### Sprint 3: Cobertura (1 semana)

15. ✅ Implementar server actions: Análisis de cobertura
16. ✅ Crear componente: Heatmap de cobertura (`<CoverageHeatmap />`)
17. ✅ Crear pantalla: Vista por cobertura (`/shifts/coverage`)
18. ✅ Implementar CRUD requisitos de cobertura
19. ✅ Crear dialog: Configurar requisito de cobertura

### Sprint 4: Publicación y Aprobación (1-2 semanas)

20. ✅ Implementar server actions: Publicación, aprobación, validación pre-publish
21. ✅ Crear componente: Checklist de validación (`<ShiftValidationChecklist />`)
22. ✅ Crear pantalla: Publicación con workflow (`/shifts/publish`)
23. ✅ Crear pantalla: Aprobaciones pendientes (`/shifts/approvals`)
24. ✅ Implementar sistema de permisos (ShiftPlanner)
25. ✅ Crear pantalla: Configuración de planificadores (en `/shifts/settings`)
26. ✅ Implementar notificaciones (7 tipos de eventos)

### Sprint 5: Integración con Fichajes (1 semana)

27. ✅ Modificar server actions de fichajes (`clockIn`, `clockOut`)
28. ✅ Detectar turno asignado al fichar
29. ✅ Actualizar `ShiftAssignment` con datos reales
30. ✅ Detectar anomalías (retrasos, salidas anticipadas, ausencias, fuera de turno)
31. ✅ Crear job nocturno: Procesamiento de turnos completados
32. ✅ Configurar cron en Vercel

### Sprint 6: Informes y Exportes (1-2 semanas)

33. ✅ Implementar server actions: Informes por empleado/centro/organización
34. ✅ Crear pantalla: Hub de informes (`/shifts/reports`)
35. ✅ Implementar exportación CSV (por empleado)
36. ✅ Implementar exportación Excel (por centro) con `exceljs`
37. ✅ Implementar exportación PDF (opcional) con `pdfkit` o `react-pdf`
38. ✅ Crear gráficos con `recharts` (distribución, cobertura)

### Sprint 7: Configuración y Pulido (1 semana)

39. ✅ Crear pantalla: Configuración completa (`/shifts/settings`)
40. ✅ Crear pantalla: Mis turnos (`/dashboard/me/shifts`)
41. ✅ Implementar validaciones finales (horas complementarias, festivos, nocturnas)
42. ✅ Actualizar navegación (añadir menús)
43. ✅ Añadir badges y estados visuales
44. ✅ Responsive design (mobile-first)
45. ✅ Tests unitarios (validaciones, cálculos)
46. ✅ Tests de integración (flujo completo)
47. ✅ Documentación completa (README, guías)

---

## ✅ Checklist Final de Entregables

### Modelos y Base de Datos
- [ ] Modelos Prisma creados (6 modelos + 4 enums)
- [ ] Relaciones añadidas a modelos existentes
- [ ] Migración ejecutada y probada
- [ ] Seed data de ejemplo (opcional)

### Server Actions (40+ funciones)
- [ ] Configuración (5 actions)
- [ ] Plantillas (5 actions)
- [ ] Turnos CRUD (9 actions)
- [ ] Asignaciones (4 actions)
- [ ] Publicación y aprobación (6 actions)
- [ ] Cobertura (4 actions)
- [ ] Validaciones (4 actions)
- [ ] Informes (6 actions)
- [ ] Permisos (4 helpers)

### Stores de Zustand
- [ ] `shifts-store.tsx`
- [ ] `shift-templates-store.tsx`
- [ ] `shift-configuration-store.tsx`
- [ ] `shift-assignments-store.tsx`

### Pantallas Principales (9 pantallas)
- [ ] Dashboard principal (`/shifts`)
- [ ] Vista calendario (`/shifts/calendar`)
- [ ] Vista cobertura (`/shifts/coverage`)
- [ ] Gestión de plantillas (`/shifts/templates`)
- [ ] Publicación (`/shifts/publish`)
- [ ] Aprobaciones (`/shifts/approvals`)
- [ ] Informes (`/shifts/reports`)
- [ ] Configuración (`/shifts/settings`)
- [ ] Mis turnos (`/dashboard/me/shifts`)

### Componentes Reutilizables (7 componentes)
- [ ] `<ShiftCalendar />` (drag & drop)
- [ ] `<CoverageHeatmap />`
- [ ] `<ShiftFormDialog />`
- [ ] `<ShiftValidationChecklist />`
- [ ] `<EmployeeShiftSummary />`
- [ ] `<ShiftBlock />`
- [ ] `<TimeSlotPicker />`

### Sistema de Permisos
- [ ] Modelo `ShiftPlanner` implementado
- [ ] Helpers de permisos (`canUserPlanShifts`, etc.)
- [ ] Middleware de autorización en server actions
- [ ] UI condicional según permisos

### Integración con Fichajes
- [ ] Modificación de `clockIn` para detectar turno
- [ ] Modificación de `clockOut` para actualizar asignación
- [ ] Detección de anomalías (retrasos, ausencias, etc.)
- [ ] Job nocturno implementado
- [ ] Cron configurado en Vercel

### Notificaciones (7 tipos)
- [ ] `SHIFTS_PUBLISHED`
- [ ] `SHIFT_MODIFIED`
- [ ] `SHIFT_APPROVAL_REQUESTED`
- [ ] `SHIFTS_APPROVED`
- [ ] `SHIFTS_REJECTED`
- [ ] `SHIFT_ANOMALY_DETECTED`
- [ ] `SHIFT_COVERAGE_CRITICAL`

### Validaciones
- [ ] Pre-asignación (5 validaciones)
- [ ] Pre-publicación (checklist completo)
- [ ] Cálculos de horas (ordinarias, complementarias, extra)
- [ ] Validación de límites (diarios, semanales, descansos)

### Informes y Exportes
- [ ] Informe por empleado (CSV/Excel/PDF)
- [ ] Informe por centro (CSV/Excel/PDF)
- [ ] Informe por organización (CSV/Excel/PDF)
- [ ] Gráficos con Recharts
- [ ] Fórmulas de KPIs implementadas

### Configuración
- [ ] Pantalla de configuración completa
- [ ] CRUD de planificadores
- [ ] Configuración de políticas (granularidad, límites, etc.)
- [ ] Configuración de cobertura mínima

### Navegación y UX
- [ ] Menús añadidos a sidebar
- [ ] Badges "NUEVO" donde corresponda
- [ ] Permisos de visibilidad en menús
- [ ] Estados de carga (Skeletons)
- [ ] Estados vacíos (EmptyState)
- [ ] Responsive design (móvil, tablet, desktop)

### Tests
- [ ] Tests unitarios de validaciones (Jest/Vitest)
- [ ] Tests de cálculos (horas complementarias, etc.)
- [ ] Tests de integración (flujo publicación)
- [ ] Tests E2E (Playwright opcional)

### Documentación
- [ ] README.md principal
- [ ] configuration.md
- [ ] permissions.md
- [ ] validations.md
- [ ] reports.md
- [ ] integration.md
- [ ] Diagramas C4 (Mermaid)
- [ ] Capturas de pantalla

---

## 📝 Notas Finales y Consideraciones

### Rendimiento
- **Paginación:** Implementar en listados de turnos (por semana, no cargar todo el mes)
- **Virtualización:** Usar TanStack Virtual en calendario si hay +100 empleados
- **Índices:** Todos los índices Prisma están configurados correctamente
- **Caché:** Considerar Redis para análisis de cobertura en tiempo real (opcional)

### Escalabilidad
- **Multi-tenancy:** Todo filtrado por `orgId`, soporta millones de turnos
- **Multi-centro:** Soporte completo, filtros selectivos
- **Concurrencia:** Validaciones atómicas con transacciones Prisma
- **Jobs:** Cron nocturno optimizado (procesa por lotes)

### Seguridad
- **Permisos:** Validación en server actions y UI
- **Auditoría:** Todos los cambios registrados con `createdBy`, `updatedBy`
- **RGPD:** Datos personales protegidos, logs de acceso
- **Injection:** Prisma previene SQL injection automáticamente

### UX/UI
- **Drag & drop:** Intuitivo, feedback visual inmediato
- **Estados claros:** DRAFT → PENDING → PUBLISHED → CLOSED
- **Checklist visual:** Errores/Warnings/Info con iconos y colores
- **Heatmap:** Escala verde→rojo, tooltips con detalle
- **Mobile:** Responsive, colapsa a lista en móvil

### Compliance
- **Jornada laboral:** Validación de límites según legislación española
- **Descansos:** 12h mínimo entre turnos (configurable)
- **Domingos/festivos:** Marcados y reportados separadamente
- **Horas complementarias:** Límite 30% (configurable), cap mensual

### Extensibilidad Futura
- **Solicitudes de cambio de turno:** Empleados pueden solicitar intercambios
- **Confirmación de turno:** Empleados confirman asistencia (estado `CONFIRMED`)
- **Rotación automática:** Algoritmo de asignación equitativa
- **Integración con nómina:** Exportar a formato de nómina directamente
- **App móvil:** API REST lista para consumo externo

---

## 🎯 Criterios de Éxito

El módulo de gestión de turnos se considerará exitoso cuando:

1. ✅ **Funcional:** Todos los flujos (crear, publicar, aprobar, cerrar) funcionan correctamente
2. ✅ **Validado:** Todas las validaciones previenen errores de planificación
3. ✅ **Integrado:** Fichajes se sincronizan automáticamente con turnos
4. ✅ **Reportado:** Informes muestran datos precisos y exportan correctamente
5. ✅ **Performante:** Carga en <2s para calendarios de 50 empleados/semana
6. ✅ **Seguro:** Permisos correctos, sin fugas de datos entre organizaciones
7. ✅ **Usable:** UX intuitiva, feedback claro, responsive en móvil
8. ✅ **Documentado:** Guías completas para admin y usuarios finales

---

## 📞 Soporte y Contacto

Para cualquier duda o consulta sobre este plan de implementación:

- **Desarrollador:** Francisco Parra
- **Documentación:** `/docs/shifts/`
- **Issues:** Reportar en GitHub del proyecto

---

**Fin del documento**

*Última actualización: 2025-01-12*
