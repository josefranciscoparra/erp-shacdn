# Módulo de Gestión de Turnos - Documentación Completa

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Base de Datos](#base-de-datos)
4. [Flujos de Trabajo](#flujos-de-trabajo)
5. [Funcionalidades](#funcionalidades)
6. [API Reference](#api-reference)
7. [Navegación](#navegación)

---

## Visión General

Sistema completo de gestión de turnos para empresas de retail, hostelería y servicios con turnos rotativos. Incluye planificación visual, análisis de cobertura, aprobación de turnos, integración con fichajes, informes y exportación.

### Características Principales

- 📅 **Planificación Visual**: Calendario drag & drop con vista semanal
- 👥 **Vista de Empleados**: Gestión de disponibilidad y turnos por empleado
- 📊 **Análisis de Cobertura**: Heatmap que muestra déficits y excesos de personal
- ✅ **Workflow de Aprobación**: Draft → Pending → Approved → Published → Closed
- 🕒 **Integración con Fichajes**: Detección automática de turnos al fichar
- 📈 **Informes Profesionales**: Estadísticas, gráficos y exportación CSV/Excel
- ⚙️ **Configuración Flexible**: Límites de jornada, descansos, horas complementarias

---

## Arquitectura

### Stack Tecnológico

- **Frontend**: Next.js 15 App Router, React 19, TypeScript
- **UI**: shadcn/ui components, Tailwind CSS v4
- **DnD**: @dnd-kit para drag & drop
- **Gráficos**: Recharts para visualizaciones
- **Estado**: React hooks + Server Actions
- **Backend**: Next.js Server Actions
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Cron Jobs**: Vercel Cron para procesamiento nocturno

### Estructura de Archivos

```
src/
├── app/(main)/dashboard/shifts/
│   ├── page.tsx                          # Dashboard principal
│   ├── calendar/
│   │   ├── page.tsx                      # Calendario de planificación
│   │   └── _components/
│   │       ├── shift-calendar.tsx        # Componente principal drag & drop
│   │       ├── employee-shift-view.tsx   # Vista por empleado
│   │       └── shift-form.tsx            # Formulario de crear/editar turno
│   ├── coverage/
│   │   ├── page.tsx                      # Análisis de cobertura
│   │   └── _components/
│   │       └── coverage-heatmap.tsx      # Heatmap de cobertura
│   ├── publish/
│   │   ├── page.tsx                      # Publicación de turnos
│   │   └── _components/
│   │       └── publish-shifts-form.tsx   # Formulario de publicación
│   ├── approvals/
│   │   ├── page.tsx                      # Aprobaciones pendientes
│   │   └── _components/
│   │       └── approvals-list.tsx        # Lista de turnos pendientes
│   ├── reports/
│   │   ├── page.tsx                      # Hub de informes
│   │   └── _components/
│   │       ├── organization-stats-tab.tsx      # Estadísticas generales
│   │       ├── employee-reports-tab.tsx        # Informes por empleado
│   │       ├── cost-center-reports-tab.tsx     # Informes por centro
│   │       └── compliance-chart-tab.tsx        # Gráficos de cumplimiento
│   └── settings/
│       ├── page.tsx                      # Configuración de turnos
│       └── _components/
│           ├── shift-settings-form.tsx   # Formulario de configuración
│           └── shift-system-stats.tsx    # Estadísticas del sistema
│
├── server/actions/
│   ├── shift-calendar.ts               # CRUD de turnos
│   ├── shift-coverage.ts               # Análisis de cobertura
│   ├── shift-publish.ts                # Publicación y aprobación
│   ├── shift-reports.ts                # Generación de informes
│   └── shift-settings.ts               # Configuración del sistema
│
├── lib/shifts/
│   ├── shift-integration.ts            # Integración con fichajes
│   ├── shift-notifications.ts          # Sistema de notificaciones
│   ├── validations.ts                  # Validaciones de turnos
│   └── export-utils.ts                 # Exportación CSV/Excel
│
└── app/api/cron/
    └── process-shifts/
        └── route.ts                     # Job nocturno (2 AM diario)
```

---

## Base de Datos

### Modelos Principales

#### `ShiftConfiguration`
Configuración global del sistema de turnos (1 por organización)

```prisma
model ShiftConfiguration {
  id                           String   @id @default(cuid())
  orgId                        String   @unique

  // Granularidad
  planningGranularityMinutes   Int      @default(30)    // 15, 30, 60
  weekStartDay                 Int      @default(1)     // 0=dom, 1=lun

  // Límites de jornada
  maxDailyHours                Decimal  @default(9)
  maxWeeklyHours               Decimal  @default(40)
  minRestBetweenShiftsHours    Decimal  @default(12)

  // Horas complementarias (part-time)
  complementaryHoursEnabled    Boolean  @default(true)
  complementaryHoursLimitPercent  Decimal?              // % sobre jornada
  complementaryHoursMonthlyCap    Decimal?              // Cap mensual

  // Políticas de publicación
  publishRequiresApproval      Boolean  @default(true)
  minAdvancePublishDays        Int      @default(7)
  allowEditAfterPublish        Boolean  @default(false)

  // Validación de cobertura
  enforceMinimumCoverage       Boolean  @default(true)
  blockPublishIfUncovered      Boolean  @default(false)
}
```

#### `Shift`
Turno de trabajo

```prisma
model Shift {
  id                  String      @id @default(cuid())
  orgId               String
  costCenterId        String
  positionId          String?
  date                DateTime                        // Fecha del turno
  startTime           String                          // "08:00"
  endTime             String                          // "16:00"
  durationMinutes     Int
  requiredEmployees   Int         @default(1)
  status              ShiftStatus @default(DRAFT)
  type                ShiftType   @default(REGULAR)
  notes               String?

  // Workflow
  createdById         String
  publishedById       String?
  publishedAt         DateTime?
  approvedById        String?
  approvedAt          DateTime?
  rejectedById        String?
  rejectedAt          DateTime?
  rejectionReason     String?
  closedById          String?
  closedAt            DateTime?

  // Relaciones
  assignments         ShiftAssignment[]
  coverageRequirements ShiftCoverageRequirement[]
}

enum ShiftStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PUBLISHED
  REJECTED
  CLOSED
}

enum ShiftType {
  REGULAR
  NIGHT
  HOLIDAY
  WEEKEND
}
```

#### `ShiftAssignment`
Asignación de empleado a turno

```prisma
model ShiftAssignment {
  id                      String   @id @default(cuid())
  shiftId                 String
  employeeId              String
  status                  ShiftAssignmentStatus @default(PENDING)

  // Planning
  plannedMinutes          Int

  // Fichajes reales
  actualClockIn           DateTime?
  actualClockOut          DateTime?
  actualWorkedMinutes     Int?

  // Anomalías
  wasAbsent               Boolean  @default(false)
  hasDelay                Boolean  @default(false)
  delayMinutes            Int      @default(0)
  hasEarlyDeparture       Boolean  @default(false)
  earlyDepartureMinutes   Int      @default(0)
  workedOutsideShift      Boolean  @default(false)

  // Workflow
  assignedById            String
  assignedAt              DateTime @default(now())

  @@unique([shiftId, employeeId])
}

enum ShiftAssignmentStatus {
  PENDING      // Asignado pero no fichado
  CONFIRMED    // Fichó entrada
  COMPLETED    // Completado (fichó entrada y salida)
  ABSENT       // No se presentó
}
```

#### `ShiftCoverageRequirement`
Requisitos de cobertura por posición

```prisma
model ShiftCoverageRequirement {
  id            String   @id @default(cuid())
  orgId         String
  costCenterId  String
  positionId    String?
  dayOfWeek     Int                               // 0-6
  startTime     String
  endTime       String
  requiredCount Int      @default(1)
  shiftId       String?                           // Opcional: vincular a turno específico
}
```

#### `ShiftPlanner`
Usuarios con permisos de planificación

```prisma
model ShiftPlanner {
  id            String   @id @default(cuid())
  orgId         String
  userId        String
  costCenterId  String?                           // null = global
  isGlobal      Boolean  @default(false)
  canCreate     Boolean  @default(true)
  canEdit       Boolean  @default(true)
  canDelete     Boolean  @default(false)
  canPublish    Boolean  @default(false)
  canApprove    Boolean  @default(false)
  active        Boolean  @default(true)

  @@unique([orgId, userId, costCenterId])
}
```

---

## Flujos de Trabajo

### 1. Creación de Turnos (Sprint 2)

```
┌─────────────────────────────────────────────────────────────┐
│                    PLANIFICACIÓN                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Planner crea turno       │
            │  (Drag & Drop o Form)     │
            │  Estado: DRAFT            │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Asigna empleados         │
            │  (1 o más empleados)      │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Validaciones:            │
            │  - Horas diarias OK       │
            │  - Horas semanales OK     │
            │  - Descanso entre turnos  │
            │  - Sin solapes            │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Turno guardado           │
            │  Estado: DRAFT            │
            └───────────────────────────┘
```

### 2. Análisis de Cobertura (Sprint 3)

```
┌─────────────────────────────────────────────────────────────┐
│                   ANÁLISIS DE COBERTURA                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Obtener requisitos de    │
            │  cobertura configurados   │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Calcular personal        │
            │  asignado por hora        │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Comparar:                │
            │  Requerido vs Asignado    │
            └───────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Generar heatmap:         │
            │  🟢 Cubierto              │
            │  🟡 Cerca del límite      │
            │  🔴 Descubierto           │
            │  🟣 Exceso                │
            └───────────────────────────┘
```

### 3. Publicación y Aprobación (Sprint 4)

```
┌─────────────────────────────────────────────────────────────┐
│               PUBLICACIÓN Y APROBACIÓN                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │  Planner: "Publicar"      │
            │  Turnos seleccionados     │
            └───────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  publishRequiresApproval == true?     │
        └───────────────────────────────────────┘
              │                         │
              │ Sí                      │ No
              ▼                         ▼
    ┌─────────────────┐    ┌─────────────────────┐
    │ PENDING_APPROVAL│    │ PUBLISHED           │
    └─────────────────┘    │ Notifica empleados  │
              │             └─────────────────────┘
              ▼
    ┌─────────────────┐
    │ Approver revisa │
    └─────────────────┘
              │
              ▼
        ┌─────────┐
        │ Aprobar │ ─────► APPROVED → PUBLISHED
        │  o      │
        │ Rechazar│ ─────► REJECTED
        └─────────┘
```

### 4. Integración con Fichajes (Sprint 5)

```
┌─────────────────────────────────────────────────────────────┐
│              INTEGRACIÓN CON FICHAJES                        │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────────────────────┐
        │  Empleado ficha entrada (Clock In)│
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Detectar turno asignado:         │
        │  - Mismo día                      │
        │  - Hora dentro de rango (±30min)  │
        └───────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │ ¿Turno encontrado?        │
              └─────────────┬─────────────┘
                    │                 │
                    │ Sí              │ No
                    ▼                 ▼
        ┌───────────────────┐  ┌───────────────┐
        │ Actualizar        │  │ Fichaje normal│
        │ ShiftAssignment:  │  │ sin turno     │
        │ - actualClockIn   │  └───────────────┘
        │ - hasDelay (>5min)│
        │ - status=CONFIRMED│
        └───────────────────┘
                    │
                    ▼
        ┌───────────────────┐
        │ Empleado ficha    │
        │ salida (Clock Out)│
        └───────────────────┘
                    │
                    ▼
        ┌───────────────────┐
        │ Calcular anomalías│
        │ - Salida anticipada│
        │ - Fuera de turno  │
        │ - Horas trabajadas│
        └───────────────────┘
                    │
                    ▼
        ┌───────────────────┐
        │ status=COMPLETED  │
        └───────────────────┘
```

### 5. Procesamiento Nocturno (Sprint 5 - Cron Job)

```
┌─────────────────────────────────────────────────────────────┐
│           CRON JOB - 2:00 AM DIARIO                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Obtener turnos PUBLISHED         │
        │  del día anterior                 │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Para cada turno:                 │
        │  1. Revisar asignaciones          │
        │  2. Marcar ausencias              │
        │  3. Contar anomalías              │
        │  4. Cerrar turno (status=CLOSED)  │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Generar notificaciones:          │
        │  - Ausencias                      │
        │  - Retrasos >15min                │
        │  - Trabajo fuera de turno         │
        └───────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Notificar a managers:            │
        │  - Planners con canApprove        │
        │  - Admins de la organización      │
        └───────────────────────────────────┘
```

---

## Funcionalidades

### Sprint 1: Base de Datos ✅
- 6 modelos Prisma creados
- 4 enums para estados
- Relaciones configuradas
- Índices de rendimiento

### Sprint 2: Calendario de Planificación ✅
- Calendario drag & drop con @dnd-kit
- Vista semanal y diaria
- Crear/editar/eliminar turnos
- Asignación múltiple de empleados
- Vista por empleado con sus turnos
- Validaciones en tiempo real

### Sprint 3: Análisis de Cobertura ✅
- Heatmap visual por hora/día
- Colores indicativos de cobertura
- Estadísticas de déficit/exceso
- Configuración de requisitos

### Sprint 4: Publicación y Aprobación ✅
- Workflow de aprobación configurable
- Publicación masiva
- Notificaciones a empleados
- Listado de pendientes de aprobación

### Sprint 5: Integración con Fichajes ✅
- Detección automática al fichar
- Cálculo de anomalías (retrasos, ausencias)
- Job nocturno para cerrar turnos
- Sistema de notificaciones

### Sprint 6: Informes y Exportes ✅
- Estadísticas generales de organización
- Informes por empleado con detalle
- Informes por centro de coste
- Gráficos de cumplimiento (recharts)
- Ranking de empleados
- Exportación CSV y Excel con formato

### Sprint 7: Configuración y Pulido ✅
- Pantalla de configuración completa
- Validaciones finales
- Índices de rendimiento en BD
- Documentación

---

## API Reference

### Server Actions

#### shift-calendar.ts

```typescript
// Obtener turnos de una semana
getShiftsForWeek(startDate: Date, costCenterId?: string): Promise<Shift[]>

// Obtener turnos de un empleado
getEmployeeShifts(employeeId: string, startDate: Date): Promise<Shift[]>

// Crear turno
createShift(data: ShiftFormData): Promise<{ success: boolean, shift?: Shift }>

// Actualizar turno
updateShift(shiftId: string, data: ShiftFormData): Promise<{ success: boolean }>

// Eliminar turno
deleteShift(shiftId: string): Promise<{ success: boolean }>

// Asignar empleados
assignEmployeesToShift(shiftId: string, employeeIds: string[]): Promise<{ success: boolean }>
```

#### shift-coverage.ts

```typescript
// Análisis de cobertura
analyzeCoverage(
  costCenterId: string,
  startDate: Date,
  endDate: Date
): Promise<CoverageAnalysis>

// Obtener requisitos de cobertura
getCoverageRequirements(costCenterId: string): Promise<CoverageRequirement[]>

// Guardar requisitos
saveCoverageRequirements(
  costCenterId: string,
  requirements: CoverageRequirement[]
): Promise<{ success: boolean }>
```

#### shift-publish.ts

```typescript
// Publicar turnos
publishShifts(shiftIds: string[]): Promise<{ success: boolean }>

// Aprobar turno
approveShift(shiftId: string): Promise<{ success: boolean }>

// Rechazar turno
rejectShift(shiftId: string, reason: string): Promise<{ success: boolean }>

// Obtener turnos pendientes de aprobación
getPendingApprovals(): Promise<Shift[]>
```

#### shift-reports.ts

```typescript
// Estadísticas de organización
getShiftStatsForOrg(startDate: Date, endDate: Date): Promise<OrgStats>

// Informe por empleado
getShiftReportByEmployee(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<EmployeeReport>

// Informe por centro
getShiftReportByCostCenter(
  costCenterId: string,
  startDate: Date,
  endDate: Date
): Promise<CostCenterReport>

// Datos para gráficos
getComplianceChartData(
  startDate: Date,
  endDate: Date,
  costCenterId?: string
): Promise<ChartData[]>

// Ranking de empleados
getEmployeeComplianceRanking(
  startDate: Date,
  endDate: Date,
  limit: number
): Promise<RankingItem[]>
```

#### shift-settings.ts

```typescript
// Obtener configuración
getShiftSettings(): Promise<ShiftConfiguration>

// Actualizar configuración
updateShiftSettings(data: Partial<ShiftConfiguration>): Promise<{ success: boolean }>

// Estadísticas del sistema
getShiftSystemStats(): Promise<SystemStats>
```

---

## Navegación

### Sidebar > Turnos

```
📅 Turnos
   ├── Dashboard               /dashboard/shifts
   ├── Calendario             /dashboard/shifts/calendar
   ├── Cobertura              /dashboard/shifts/coverage
   ├── Publicar               /dashboard/shifts/publish
   ├── Aprobaciones           /dashboard/shifts/approvals
   ├── Informes               /dashboard/shifts/reports
   ├── Plantillas             /dashboard/shifts/templates (pendiente)
   └── Configuración          /dashboard/shifts/settings
```

### Vista de Empleado

```
👤 Mi Espacio
   └── Mis Turnos             /dashboard/me/shifts
```

---

## Configuración Recomendada

### Para Retail

```typescript
{
  planningGranularityMinutes: 30,
  maxDailyHours: 8,
  maxWeeklyHours: 40,
  minRestBetweenShiftsHours: 12,
  complementaryHoursEnabled: true,
  complementaryHoursLimitPercent: 30,
  publishRequiresApproval: true,
  minAdvancePublishDays: 7,
  enforceMinimumCoverage: true,
  blockPublishIfUncovered: false
}
```

### Para Hostelería

```typescript
{
  planningGranularityMinutes: 60,
  maxDailyHours: 9,
  maxWeeklyHours: 40,
  minRestBetweenShiftsHours: 12,
  complementaryHoursEnabled: true,
  complementaryHoursLimitPercent: 50,
  publishRequiresApproval: false,
  minAdvancePublishDays: 3,
  enforceMinimumCoverage: true,
  blockPublishIfUncovered: true
}
```

---

## Próximos Pasos Sugeridos

1. **Plantillas de Turnos**: Crear turnos recurrentes automáticamente
2. **Intercambio de Turnos**: Empleados pueden intercambiar turnos entre sí
3. **Turnos Nocturnos**: Soporte para turnos que cruzan medianoche
4. **Festivos**: Detección automática de días festivos
5. **App Móvil**: Notificaciones push y vista móvil optimizada
6. **Predicción con IA**: Sugerir planificación óptima basada en histórico

---

## Soporte

Para dudas o problemas:
- Revisar logs del cron job en Vercel Dashboard
- Verificar notificaciones en `/dashboard/notifications`
- Comprobar permisos en `ShiftPlanner`
- Revisar configuración en `/dashboard/shifts/settings`

---

**Módulo completado**: ✅ Sprint 1-7
**Estado**: Producción
**Última actualización**: Noviembre 2025
