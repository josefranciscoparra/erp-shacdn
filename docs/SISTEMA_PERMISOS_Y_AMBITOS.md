# Sistema de Permisos por Ámbito y Alertas Flexibles

**Fecha:** 2025-11-19
**Versión:** 1.0
**Estado:** Diseño Arquitectónico 📐

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)
← [Ver Sistema de Alertas](./VALIDACIONES_Y_CONFIGURACION.md)

---

## 📚 Índice

1. [Objetivo y Filosofía](#objetivo-y-filosofía)
2. [Conceptos Fundamentales](#conceptos-fundamentales)
3. [Modelo de Datos](#modelo-de-datos)
4. [Sistema de Responsabilidades](#sistema-de-responsabilidades)
5. [Sistema de Alertas Flexible](#sistema-de-alertas-flexible)
6. [Sistema de Notificaciones Granular](#sistema-de-notificaciones-granular)
7. [Filtrado Automático de Datos](#filtrado-automático-de-datos)
8. [Casos de Uso Completos](#casos-de-uso-completos)
9. [Plan de Implementación](#plan-de-implementación)
10. [Consideraciones de Seguridad](#consideraciones-de-seguridad)

---

## 🎯 Objetivo y Filosofía

### Problema a Resolver

En una organización con múltiples centros de trabajo, departamentos y equipos, **no todos los usuarios deben ver toda la información**:

- ❌ Un manager de centro NO debe ver otros centros
- ❌ Un manager de departamento NO debe ver otros departamentos
- ❌ Un responsable de equipo NO debe ver otros equipos
- ✅ RRHH Global puede ver TODO
- ✅ Cada usuario ve solo lo que le corresponde según su ámbito

### Filosofía del Sistema

**"Permisos basados en ámbito organizacional, no en roles genéricos"**

En lugar de:

```
❌ Role: "MANAGER" → ¿Manager de qué? ¿Ve todo?
```

Hacemos:

```
✅ User: "Ana García"
   └─ Responsable de: CostCenter "Madrid Norte"
   └─ Ámbito de visibilidad: Solo empleados/alertas/fichajes de Madrid Norte
   └─ Permisos: VIEW_EMPLOYEES, VIEW_ALERTS, MANAGE_SCHEDULES
```

---

## 🧩 Conceptos Fundamentales

### 1. Ámbito (Scope)

Define el **alcance de visibilidad** de un usuario en el sistema.

```typescript
enum Scope {
  ORGANIZATION  // Ve TODA la organización (RRHH Global, Admin)
  COST_CENTER   // Ve solo un centro de trabajo específico
  DEPARTMENT    // Ve solo un departamento específico
  TEAM          // Ve solo un equipo específico
  SELF          // Solo ve sus propios datos (empleado normal)
}
```

**Jerarquía de ámbitos (de mayor a menor alcance):**

```
ORGANIZATION
  ├─ COST_CENTER (Madrid Norte)
  │   ├─ DEPARTMENT (Ventas)
  │   │   └─ TEAM (Equipo A)
  │   └─ DEPARTMENT (IT)
  │       └─ TEAM (Equipo B)
  └─ COST_CENTER (Barcelona Este)
      └─ DEPARTMENT (Logística)
```

---

### 2. Responsabilidad (Responsibility)

**Una persona puede ser responsable de múltiples ámbitos:**

```typescript
👤 Ana García:
  - Responsable de: CostCenter "Madrid Norte" (scope: COST_CENTER)
  - Responsable de: Department "Ventas" (scope: DEPARTMENT)
  → Ve: Empleados de Madrid Norte + Empleados de Ventas
  → Alertas: De Madrid Norte + De Ventas
```

**Una entidad puede tener múltiples responsables:**

```typescript
🏢 CostCenter "Madrid Norte":
  - Responsables: [Ana García, Carlos Ruiz, RRHH Global]
  → Alertas de este centro notifican a: Ana, Carlos, RRHH
```

---

### 3. Permiso (Permission)

**Acciones específicas que un usuario puede realizar en su ámbito:**

```typescript
enum Permission {
  // Empleados
  VIEW_EMPLOYEES        // Ver listado de empleados
  MANAGE_EMPLOYEES      // Crear/editar empleados

  // Fichajes
  VIEW_TIME_ENTRIES     // Ver fichajes
  MANAGE_TIME_ENTRIES   // Editar/validar fichajes

  // Alertas
  VIEW_ALERTS           // Ver alertas
  RESOLVE_ALERTS        // Resolver/justificar alertas

  // Horarios
  VIEW_SCHEDULES        // Ver horarios
  MANAGE_SCHEDULES      // Asignar/modificar horarios

  // Ausencias
  VIEW_PTO_REQUESTS     // Ver solicitudes de ausencias
  APPROVE_PTO_REQUESTS  // Aprobar/rechazar ausencias

  // Configuración
  MANAGE_SETTINGS       // Modificar configuración del ámbito
}
```

---

## 🗄️ Modelo de Datos

### Nuevas Tablas

#### 1. `AreaResponsible` - Asignación de Responsabilidades

```prisma
model AreaResponsible {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Usuario responsable
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Organización
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Ámbito de responsabilidad (solo uno debe estar presente)
  scope String // "COST_CENTER" | "DEPARTMENT" | "TEAM" | "ORGANIZATION"

  costCenterId String?
  costCenter   CostCenter? @relation(fields: [costCenterId], references: [id], onDelete: Cascade)

  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  teamId String?
  team   Team? @relation(fields: [teamId], references: [id], onDelete: Cascade)

  // Permisos específicos para este ámbito
  permissions String[] // ["VIEW_EMPLOYEES", "MANAGE_SCHEDULES", etc.]

  // Estado
  isActive Boolean @default(true)

  @@unique([userId, scope, costCenterId, departmentId, teamId])
  @@index([userId])
  @@index([costCenterId])
  @@index([departmentId])
  @@index([teamId])
}
```

**Ejemplos de uso:**

```typescript
// Ana García es responsable de Madrid Norte con permisos completos
{
  userId: "user_ana",
  orgId: "org_timenow",
  scope: "COST_CENTER",
  costCenterId: "cc_madrid_norte",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "MANAGE_SCHEDULES", "RESOLVE_ALERTS"],
  isActive: true
}

// Pedro Ruiz es responsable del Departamento de Ventas (solo lectura)
{
  userId: "user_pedro",
  orgId: "org_timenow",
  scope: "DEPARTMENT",
  departmentId: "dept_ventas",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS"],
  isActive: true
}

// María López (RRHH) tiene acceso a toda la organización
{
  userId: "user_maria",
  orgId: "org_timenow",
  scope: "ORGANIZATION",
  permissions: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS", "APPROVE_PTO_REQUESTS"],
  isActive: true
}
```

---

#### 2. `AlertSubscription` - Suscripciones a Notificaciones de Alertas

```prisma
model AlertSubscription {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Usuario suscrito
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Organización
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Ámbito de suscripción (recibe alertas de...)
  scope String // "COST_CENTER" | "DEPARTMENT" | "TEAM" | "ORGANIZATION"

  costCenterId String?
  costCenter   CostCenter? @relation(fields: [costCenterId], references: [id], onDelete: Cascade)

  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  teamId String?
  team   Team? @relation(fields: [teamId], references: [id], onDelete: Cascade)

  // Configuración de notificaciones
  alertTypes     String[] // ["LATE_ARRIVAL", "EARLY_DEPARTURE", "ABSENCE", etc.]
  severityLevels String[] // ["WARNING", "CRITICAL"] (si vacío, todas)

  // Canales de notificación
  notifyInApp   Boolean @default(true)  // Notificación en navbar
  notifyByEmail Boolean @default(false) // Email automático

  // Estado
  isActive Boolean @default(true)

  @@unique([userId, scope, costCenterId, departmentId, teamId])
  @@index([userId])
  @@index([costCenterId])
  @@index([departmentId])
  @@index([teamId])
}
```

**Ejemplos de uso:**

```typescript
// Ana García recibe alertas críticas del Centro Madrid Norte por email
{
  userId: "user_ana",
  orgId: "org_timenow",
  scope: "COST_CENTER",
  costCenterId: "cc_madrid_norte",
  alertTypes: ["LATE_ARRIVAL", "EARLY_DEPARTURE", "ABSENCE"],
  severityLevels: ["CRITICAL"], // Solo críticas
  notifyInApp: true,
  notifyByEmail: true,
  isActive: true
}

// RRHH recibe TODAS las alertas de la organización (solo in-app)
{
  userId: "user_rrhh",
  orgId: "org_timenow",
  scope: "ORGANIZATION",
  alertTypes: [], // Todos los tipos
  severityLevels: [], // Todas las severidades
  notifyInApp: true,
  notifyByEmail: false,
  isActive: true
}
```

---

#### 3. `Team` - Equipos dentro de Departamentos (NUEVO)

```prisma
model Team {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Información básica
  name        String
  description String?
  code        String? // Código corto (ej: "VEN-A", "IT-BACKEND")

  // Organización
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Departamento al que pertenece
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  // Centro de trabajo (opcional, puede heredar del departamento)
  costCenterId String?
  costCenter   CostCenter? @relation(fields: [costCenterId], references: [id])

  // Líder del equipo (usuario responsable principal)
  teamLeaderId String?
  teamLeader   User?   @relation("TeamLeader", fields: [teamLeaderId], references: [id])

  // Estado
  isActive Boolean @default(true)

  // Relaciones
  employees          Employee[]          @relation("EmployeeTeam")
  areaResponsibles   AreaResponsible[]
  alertSubscriptions AlertSubscription[]

  @@unique([orgId, code])
  @@index([orgId])
  @@index([departmentId])
  @@index([costCenterId])
  @@index([teamLeaderId])
}
```

---

### Modificaciones a Tablas Existentes

#### Extensión de `User`

```prisma
model User {
  // ... campos existentes ...

  // Responsabilidades (ámbitos de los que es responsable)
  areaResponsibilities AreaResponsible[]

  // Suscripciones a alertas
  alertSubscriptions AlertSubscription[]

  // Equipos que lidera
  ledTeams Team[] @relation("TeamLeader")
}
```

---

#### Extensión de `Employee`

```prisma
model Employee {
  // ... campos existentes ...

  // Equipo al que pertenece (opcional)
  teamId String?
  team   Team?   @relation("EmployeeTeam", fields: [teamId], references: [id])
}
```

---

#### Extensión de `CostCenter`

```prisma
model CostCenter {
  // ... campos existentes ...

  // Responsables de este centro
  areaResponsibles   AreaResponsible[]
  alertSubscriptions AlertSubscription[]

  // Equipos del centro
  teams Team[]
}
```

---

#### Extensión de `Department`

```prisma
model Department {
  // ... campos existentes ...

  // Responsables de este departamento
  areaResponsibles   AreaResponsible[]
  alertSubscriptions AlertSubscription[]

  // Equipos del departamento
  teams Team[]
}
```

---

## 👥 Sistema de Responsabilidades

### Asignación de Responsables

**Flujo de asignación:**

1. **Admin/RRHH** va a configuración de centros/departamentos/equipos
2. Selecciona **personas responsables** de esa entidad
3. Define **permisos específicos** para cada responsable
4. Sistema crea registros en `AreaResponsible`

**Interfaz de configuración (ejemplo):**

```
┌────────────────────────────────────────────────────────┐
│ 🏢 Centro de Trabajo: Madrid Norte                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 👥 Responsables de este centro:                       │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 👤 Ana García                                    │  │
│ │    Permisos: ✅ Ver empleados                    │  │
│ │              ✅ Gestionar horarios               │  │
│ │              ✅ Ver alertas                      │  │
│ │              ✅ Resolver alertas                 │  │
│ │    [Editar] [Eliminar]                           │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 👤 Carlos Ruiz                                   │  │
│ │    Permisos: ✅ Ver empleados                    │  │
│ │              ✅ Ver alertas                      │  │
│ │              ❌ Gestionar horarios               │  │
│ │    [Editar] [Eliminar]                           │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ [+ Añadir Responsable]                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

### Consulta de Responsabilidades

**Helper para obtener ámbitos de un usuario:**

```typescript
/**
 * Obtiene todos los ámbitos de los que un usuario es responsable
 */
async function getUserResponsibilities(userId: string) {
  const responsibilities = await prisma.areaResponsible.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      costCenter: true,
      department: true,
      team: true,
    },
  });

  return {
    hasOrganizationScope: responsibilities.some((r) => r.scope === "ORGANIZATION"),
    costCenters: responsibilities.filter((r) => r.scope === "COST_CENTER").map((r) => r.costCenter),
    departments: responsibilities.filter((r) => r.scope === "DEPARTMENT").map((r) => r.department),
    teams: responsibilities.filter((r) => r.scope === "TEAM").map((r) => r.team),
    permissions: [...new Set(responsibilities.flatMap((r) => r.permissions))],
  };
}
```

**Ejemplo de resultado:**

```typescript
{
  hasOrganizationScope: false,
  costCenters: [
    { id: "cc_madrid", name: "Madrid Norte" }
  ],
  departments: [
    { id: "dept_ventas", name: "Ventas" }
  ],
  teams: [],
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS", "MANAGE_SCHEDULES"]
}
```

---

## 🚨 Sistema de Alertas Flexible

### Tipos de Alertas

```typescript
enum AlertType {
  LATE_ARRIVAL          // Entrada tarde (supera tolerancia)
  CRITICAL_LATE_ARRIVAL // Entrada muy tarde (supera umbral crítico)
  EARLY_DEPARTURE       // Salida temprana (supera tolerancia)
  CRITICAL_EARLY_DEPARTURE // Salida muy temprana (umbral crítico)
  VERY_EARLY_ARRIVAL    // Entrada muy anticipada
  VERY_LATE_DEPARTURE   // Salida muy tardía
  ABSENCE_NO_JUSTIFY    // Ausencia sin justificar
  WORKDAY_INCOMPLETE    // Jornada incompleta sin justificar
  NON_WORKDAY_CLOCK     // Fichaje en día no laboral
  PATTERN_DETECTED      // Patrón detectado (ej: 3 retrasos consecutivos)
}
```

---

### Severidad de Alertas

```typescript
enum AlertSeverity {
  INFO     // Informativa (entrada anticipada, salida tardía dentro de límites)
  WARNING  // Advertencia (supera tolerancia, no crítico)
  CRITICAL // Crítica (supera umbral crítico, requiere atención)
}
```

---

### Modelo de Alerta

```prisma
model Alert {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Organización
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Empleado afectado
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  // Tipo y severidad
  type     String // AlertType
  severity String // AlertSeverity

  // Detalles
  title       String  // "Entrada tarde: 35 minutos de retraso"
  description String? // Descripción detallada
  date        DateTime // Fecha del evento

  // Contexto (opcional)
  timeEntryId String?
  timeEntry   TimeEntry? @relation(fields: [timeEntryId], references: [id])

  workdaySummaryId String?
  workdaySummary   WorkdaySummary? @relation(fields: [workdaySummaryId], references: [id])

  // Datos de desviación
  deviationMinutes Int? // Minutos de desviación (si aplica)

  // Ámbito de la alerta (para filtrado)
  costCenterId String?
  costCenter   CostCenter? @relation(fields: [costCenterId], references: [id])

  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])

  teamId String?
  team   Team? @relation(fields: [teamId], references: [id])

  // Estado
  status String @default("ACTIVE") // "ACTIVE" | "RESOLVED" | "DISMISSED"

  resolvedAt DateTime?
  resolvedBy String?
  resolver   User?     @relation("AlertResolver", fields: [resolvedBy], references: [id])

  resolutionComment String? // Justificación al resolver

  // Notificaciones enviadas
  notifiedUsers String[] // IDs de usuarios notificados

  @@index([orgId])
  @@index([employeeId])
  @@index([costCenterId])
  @@index([departmentId])
  @@index([teamId])
  @@index([status])
  @@index([severity])
  @@index([type])
  @@index([date])
}
```

---

### Detección de Alertas

**Server Action: `detectAlerts()`**

```typescript
/**
 * Analiza fichajes y genera alertas según configuración
 */
export async function detectAlerts(employeeId: string, date: Date): Promise<Alert[]> {
  // 1. Obtener empleado con contexto organizacional
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      organization: {
        select: {
          clockInToleranceMinutes: true,
          clockOutToleranceMinutes: true,
          criticalLateArrivalMinutes: true,
          criticalEarlyDepartureMinutes: true,
          alertsEnabled: true,
        },
      },
      costCenter: true,
      department: true,
      team: true,
    },
  });

  if (!employee.organization.alertsEnabled) {
    return []; // Sistema de alertas desactivado
  }

  // 2. Obtener fichajes del día
  const timeEntries = await getTimeEntriesForDate(employeeId, date);

  // 3. Obtener horario efectivo del día
  const schedule = await getEffectiveSchedule(employeeId, date);

  // 4. Analizar y generar alertas
  const alerts: Alert[] = [];

  // Analizar entrada tarde
  const clockIn = timeEntries.find((e) => e.entryType === "CLOCK_IN");
  if (clockIn && schedule.isWorkingDay && schedule.expectedStart) {
    const deviation = calculateMinutesDifference(clockIn.timestamp, schedule.expectedStart);

    if (deviation > employee.organization.criticalLateArrivalMinutes) {
      // CRITICAL: Supera umbral crítico
      alerts.push({
        type: "CRITICAL_LATE_ARRIVAL",
        severity: "CRITICAL",
        title: `Entrada muy tarde: ${deviation} minutos de retraso`,
        deviationMinutes: deviation,
        costCenterId: employee.costCenterId,
        departmentId: employee.departmentId,
        teamId: employee.teamId,
      });
    } else if (deviation > employee.organization.clockInToleranceMinutes) {
      // WARNING: Supera tolerancia
      alerts.push({
        type: "LATE_ARRIVAL",
        severity: "WARNING",
        title: `Entrada tarde: ${deviation} minutos de retraso`,
        deviationMinutes: deviation,
        costCenterId: employee.costCenterId,
        departmentId: employee.departmentId,
        teamId: employee.teamId,
      });
    }
  }

  // Analizar salida temprana (similar)
  // Analizar ausencias sin justificar
  // Detectar patrones (3 retrasos consecutivos)

  // 5. Guardar alertas en BD
  for (const alertData of alerts) {
    await prisma.alert.create({
      data: {
        orgId: employee.orgId,
        employeeId: employee.id,
        date,
        timeEntryId: clockIn?.id,
        status: "ACTIVE",
        ...alertData,
      },
    });
  }

  return alerts;
}
```

---

## 📬 Sistema de Notificaciones Granular

### Lógica de Notificación

**Cuando se crea una alerta:**

1. Sistema determina **ámbito de la alerta** (costCenter, department, team)
2. Busca **usuarios suscritos** a ese ámbito en `AlertSubscription`
3. Filtra por **tipo de alerta** y **severidad** según suscripción
4. Envía notificación por **canales configurados** (in-app, email)

**Server Action: `notifyAlertSubscribers()`**

```typescript
/**
 * Notifica a todos los usuarios suscritos sobre una nueva alerta
 */
async function notifyAlertSubscribers(alert: Alert) {
  // 1. Obtener suscripciones relevantes según ámbito de la alerta
  const subscriptions = await prisma.alertSubscription.findMany({
    where: {
      orgId: alert.orgId,
      isActive: true,
      OR: [
        // Suscripciones a nivel organización (RRHH ve todo)
        { scope: "ORGANIZATION" },

        // Suscripciones al centro de la alerta
        { scope: "COST_CENTER", costCenterId: alert.costCenterId },

        // Suscripciones al departamento
        { scope: "DEPARTMENT", departmentId: alert.departmentId },

        // Suscripciones al equipo
        { scope: "TEAM", teamId: alert.teamId },
      ],
    },
    include: {
      user: true,
    },
  });

  // 2. Filtrar por tipo de alerta y severidad
  const relevantSubscriptions = subscriptions.filter((sub) => {
    // Si no especifica tipos, recibe todos
    const matchesType = sub.alertTypes.length === 0 || sub.alertTypes.includes(alert.type);

    // Si no especifica severidades, recibe todas
    const matchesSeverity = sub.severityLevels.length === 0 || sub.severityLevels.includes(alert.severity);

    return matchesType && matchesSeverity;
  });

  // 3. Enviar notificaciones
  const notifiedUserIds: string[] = [];

  for (const sub of relevantSubscriptions) {
    // In-app notification
    if (sub.notifyInApp) {
      await createInAppNotification({
        userId: sub.userId,
        type: "ALERT",
        title: alert.title,
        description: alert.description,
        linkTo: `/dashboard/time-tracking/alerts/${alert.id}`,
      });
      notifiedUserIds.push(sub.userId);
    }

    // Email notification
    if (sub.notifyByEmail) {
      await sendAlertEmail({
        to: sub.user.email,
        alert,
        employee: alert.employee,
      });
    }
  }

  // 4. Actualizar alerta con usuarios notificados
  await prisma.alert.update({
    where: { id: alert.id },
    data: { notifiedUsers: notifiedUserIds },
  });
}
```

---

### Configuración de Suscripciones (UI)

**Página: `/dashboard/settings/notifications`**

```
┌──────────────────────────────────────────────────────────┐
│ 🔔 Configuración de Notificaciones de Alertas            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Recibes alertas de:                                     │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 🏢 Centro Madrid Norte                             │  │
│ │    Tipos: ☑ Entradas tarde  ☑ Salidas temprano    │  │
│ │    Severidad: ☑ WARNING  ☑ CRITICAL                │  │
│ │    Canales: ☑ In-App  ☑ Email                      │  │
│ │    [Editar] [Eliminar]                              │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 🏬 Departamento Ventas                             │  │
│ │    Tipos: ☑ Todas                                  │  │
│ │    Severidad: ☑ Solo CRITICAL                      │  │
│ │    Canales: ☑ In-App  ☐ Email                      │  │
│ │    [Editar] [Eliminar]                              │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [+ Añadir Suscripción]                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔍 Filtrado Automático de Datos

### Middleware de Scope

**Helper: `buildScopeFilter()`**

```typescript
/**
 * Construye filtro de Prisma según los ámbitos del usuario
 */
async function buildScopeFilter(userId: string): Promise<Prisma.EmployeeWhereInput> {
  const responsibilities = await getUserResponsibilities(userId);

  // Si tiene scope de organización, ve TODO
  if (responsibilities.hasOrganizationScope) {
    return {}; // Sin filtro
  }

  // Construir filtro combinado (OR)
  const filters: Prisma.EmployeeWhereInput[] = [];

  // Filtro por centros de trabajo
  if (responsibilities.costCenters.length > 0) {
    filters.push({
      costCenterId: {
        in: responsibilities.costCenters.map((cc) => cc.id),
      },
    });
  }

  // Filtro por departamentos
  if (responsibilities.departments.length > 0) {
    filters.push({
      departmentId: {
        in: responsibilities.departments.map((d) => d.id),
      },
    });
  }

  // Filtro por equipos
  if (responsibilities.teams.length > 0) {
    filters.push({
      teamId: {
        in: responsibilities.teams.map((t) => t.id),
      },
    });
  }

  // Si no tiene ningún ámbito, no ve nada (solo SELF)
  if (filters.length === 0) {
    return { id: "none" }; // Filtro que no matchea nada
  }

  return {
    OR: filters,
  };
}
```

---

### Aplicación en Server Actions

**Ejemplo: `getEmployees()` con filtrado automático**

```typescript
export async function getEmployees() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  // Construir filtro según ámbito del usuario
  const scopeFilter = await buildScopeFilter(session.user.id);

  const employees = await prisma.employee.findMany({
    where: {
      orgId: session.user.orgId,
      ...scopeFilter, // ← Filtro automático por ámbito
    },
    include: {
      costCenter: true,
      department: true,
      team: true,
    },
  });

  return employees;
}
```

**Resultado:**

```typescript
// Usuario con scope ORGANIZATION (RRHH)
→ Ve: TODOS los empleados

// Usuario responsable de "Madrid Norte"
→ Ve: Solo empleados de Madrid Norte

// Usuario responsable de "Ventas" + "IT"
→ Ve: Empleados de Ventas + Empleados de IT

// Usuario sin responsabilidades
→ Ve: [] (nada)
```

---

### Aplicación en Dashboard de Alertas

**Ejemplo: `getAlerts()` con filtrado**

```typescript
export async function getAlerts(filters?: {
  status?: string;
  severity?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const scopeFilter = await buildScopeFilter(session.user.id);

  const alerts = await prisma.alert.findMany({
    where: {
      orgId: session.user.orgId,
      status: filters?.status,
      severity: filters?.severity,
      type: filters?.type,
      date: {
        gte: filters?.dateFrom,
        lte: filters?.dateTo,
      },
      employee: scopeFilter, // ← Filtrado por ámbito del usuario
    },
    include: {
      employee: {
        include: {
          costCenter: true,
          department: true,
        },
      },
      resolver: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return alerts;
}
```

---

## 📋 Casos de Uso Completos

### Caso 1: Manager de Centro "Madrid Norte"

**Usuario:** Ana García
**Responsabilidad:** CostCenter "Madrid Norte"
**Permisos:** `VIEW_EMPLOYEES`, `VIEW_ALERTS`, `RESOLVE_ALERTS`, `MANAGE_SCHEDULES`

**Flujo:**

1. **Login** → Sistema carga sus responsabilidades
2. **Dashboard** → Ve solo empleados de Madrid Norte (10 empleados)
3. **Alertas** → Ve alertas SOLO de Madrid Norte
   - Pedro llegó 35 min tarde → Alerta CRITICAL
   - Laura salió 20 min antes → Alerta WARNING
4. **Notificación** → Recibe notificación in-app cuando hay alerta crítica en su centro
5. **Resolver alerta** → Puede añadir comentario y marcar como resuelta
6. **Horarios** → Puede asignar/modificar horarios de empleados de Madrid Norte
7. **Restricción** → NO puede ver empleados de "Barcelona Este"

---

### Caso 2: Manager de Departamento "Ventas"

**Usuario:** Pedro Ruiz
**Responsabilidad:** Department "Ventas" (distribuido en varios centros)
**Permisos:** `VIEW_EMPLOYEES`, `VIEW_ALERTS`

**Flujo:**

1. **Dashboard** → Ve empleados de Ventas de TODOS los centros (25 empleados)
   - Madrid Norte: 10 empleados de Ventas
   - Barcelona Este: 8 empleados de Ventas
   - Sevilla: 7 empleados de Ventas
2. **Alertas** → Ve alertas de cualquier empleado de Ventas, independiente del centro
3. **Notificación** → Configuró recibir solo alertas CRITICAL por email
4. **Restricción** → Puede ver, pero NO puede resolver alertas (no tiene ese permiso)
5. **Restricción** → NO puede ver empleados de otros departamentos (IT, Logística)

---

### Caso 3: RRHH Global

**Usuario:** María López
**Responsabilidad:** ORGANIZATION (scope completo)
**Permisos:** Todos

**Flujo:**

1. **Dashboard** → Ve TODOS los empleados de la organización (150 empleados)
2. **Alertas** → Ve TODAS las alertas de todos los centros/departamentos
3. **Filtrado opcional** → Puede filtrar por centro/departamento si quiere
4. **Notificación** → Recibe todas las alertas CRITICAL de toda la org
5. **Gestión** → Puede asignar responsables a centros/departamentos
6. **Configuración** → Puede modificar configuración global de alertas

---

### Caso 4: Líder de Equipo "Ventas A"

**Usuario:** Carlos Fernández
**Responsabilidad:** Team "Ventas A" (dentro de Dept Ventas, dentro de Centro Madrid)
**Permisos:** `VIEW_EMPLOYEES`, `VIEW_ALERTS`

**Flujo:**

1. **Dashboard** → Ve solo empleados de su equipo "Ventas A" (5 empleados)
2. **Alertas** → Ve solo alertas de esos 5 empleados
3. **Notificación** → Recibe alertas WARNING y CRITICAL de su equipo
4. **Restricción** → NO ve otros equipos de Ventas (Equipo B, C, etc.)
5. **Restricción** → NO ve empleados de otros departamentos

---

### Caso 5: Usuario con Múltiples Responsabilidades

**Usuario:** Lucía Martín
**Responsabilidades:**

- CostCenter "Madrid Norte"
- Department "IT" (distribuido en varios centros)

**Flujo:**

1. **Dashboard** → Ve:
   - TODOS los empleados de Madrid Norte (incluye Ventas, IT, Logística)
   - MÁS todos los empleados de IT de otros centros
   - Total: 30 empleados
2. **Alertas** → Ve alertas de:
   - Madrid Norte (cualquier departamento)
   - IT (cualquier centro)
3. **Notificaciones** → Configuró 2 suscripciones:
   - Madrid Norte: Solo CRITICAL por email
   - IT: Todas las alertas in-app
4. **Resultado** → Usuario muy flexible y potente

---

## 🚀 Plan de Implementación

### Fase 1: Modelo de Datos (Prioritaria)

**Tareas:**

- [ ] Crear modelo `AreaResponsible`
- [ ] Crear modelo `AlertSubscription`
- [ ] Crear modelo `Team`
- [ ] Crear modelo `Alert`
- [ ] Extender modelos existentes (User, Employee, CostCenter, Department)
- [ ] Migración de base de datos: `npx prisma migrate dev --name add_permissions_and_alerts_system`

**Tiempo estimado:** 2 horas

---

### Fase 2: Sistema de Responsabilidades

**Tareas:**

- [ ] Server actions para gestionar `AreaResponsible`
  - `assignResponsibility()` - Asignar usuario como responsable
  - `removeResponsibility()` - Quitar responsabilidad
  - `getUserResponsibilities()` - Obtener ámbitos de un usuario
  - `getResponsiblesForArea()` - Obtener responsables de un centro/depto
- [ ] Helper `buildScopeFilter()` para filtrado automático
- [ ] UI en configuración de centros/departamentos para asignar responsables

**Tiempo estimado:** 3 horas

---

### Fase 3: Sistema de Detección de Alertas

**Tareas:**

- [ ] Server action `detectAlerts()` - Analizar fichajes y generar alertas
- [ ] Integración automática en `clockIn()` / `clockOut()` para detectar alertas en tiempo real
- [ ] Detección de patrones (retrasos consecutivos)
- [ ] Detección de ausencias sin justificar

**Tiempo estimado:** 3 horas

---

### Fase 4: Dashboard de Alertas

**Tareas:**

- [ ] Página `/dashboard/time-tracking/alerts`
- [ ] DataTable con filtros (estado, severidad, tipo, empleado, fecha)
- [ ] Filtrado automático según ámbito del usuario (usa `buildScopeFilter`)
- [ ] Modal para resolver alertas (añadir comentario)
- [ ] Estadísticas: alertas por tipo, empleados con más alertas

**Tiempo estimado:** 4 horas

---

### Fase 5: Sistema de Notificaciones

**Tareas:**

- [ ] Modelo `Notification` (notificaciones in-app)
- [ ] Server action `notifyAlertSubscribers()` - Enviar notificaciones
- [ ] Componente en navbar con contador de notificaciones
- [ ] Panel desplegable de notificaciones
- [ ] Marcar notificaciones como leídas
- [ ] Opcional: Sistema de envío de emails (usando Resend o similar)

**Tiempo estimado:** 5 horas

---

### Fase 6: Configuración de Suscripciones

**Tareas:**

- [ ] Página `/dashboard/settings/notifications`
- [ ] CRUD de `AlertSubscription`
- [ ] UI para configurar tipos de alertas, severidades, canales
- [ ] Previsualización de qué alertas recibiría con la config actual

**Tiempo estimado:** 3 horas

---

### Fase 7: Indicadores Visuales

**Tareas:**

- [ ] Badges de alertas en `DayCard`
- [ ] Columna de alertas en tabla de empleados (contador)
- [ ] Link directo a filtro de alertas del empleado
- [ ] Tooltips con detalles

**Tiempo estimado:** 2 horas

---

### Fase 8: Gestión de Equipos (opcional)

**Tareas:**

- [ ] CRUD de equipos
- [ ] Asignación de empleados a equipos
- [ ] Asignación de líderes de equipo
- [ ] Integración en sistema de responsabilidades

**Tiempo estimado:** 3 horas

---

**Tiempo total estimado:** 25 horas (aprox. 3-4 días de trabajo)

---

## 🔒 Consideraciones de Seguridad

### 1. Validación de Permisos en Server Actions

**SIEMPRE validar antes de ejecutar acciones:**

```typescript
export async function resolveAlert(alertId: string, comment: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  // 1. Obtener alerta
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { employee: true },
  });

  if (!alert) throw new Error("Alerta no encontrada");

  // 2. Verificar que el usuario tiene permiso para ver esta alerta
  const scopeFilter = await buildScopeFilter(session.user.id);
  const hasAccess = await prisma.employee.findFirst({
    where: {
      id: alert.employeeId,
      ...scopeFilter,
    },
  });

  if (!hasAccess) {
    throw new Error("No tienes permiso para acceder a esta alerta");
  }

  // 3. Verificar que tiene permiso RESOLVE_ALERTS
  const responsibilities = await getUserResponsibilities(session.user.id);
  if (!responsibilities.permissions.includes("RESOLVE_ALERTS")) {
    throw new Error("No tienes permiso para resolver alertas");
  }

  // 4. Ejecutar acción
  await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedBy: session.user.id,
      resolutionComment: comment,
    },
  });

  return { success: true };
}
```

---

### 2. Filtrado en Queries de Listado

**NUNCA confiar en filtros del cliente, SIEMPRE aplicar en servidor:**

```typescript
// ❌ INCORRECTO - No valida permisos
export async function getEmployees() {
  return await prisma.employee.findMany();
}

// ✅ CORRECTO - Filtra por ámbito del usuario
export async function getEmployees() {
  const session = await auth();
  const scopeFilter = await buildScopeFilter(session.user.id);

  return await prisma.employee.findMany({
    where: {
      orgId: session.user.orgId,
      ...scopeFilter, // ← FILTRO OBLIGATORIO
    },
  });
}
```

---

### 3. Auditoría de Acciones

**Registrar quién hace qué:**

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id])

  orgId        String
  organization Organization @relation(fields: [orgId], references: [id])

  action     String // "RESOLVE_ALERT", "ASSIGN_RESPONSIBILITY", etc.
  entityType String // "Alert", "AreaResponsible", etc.
  entityId   String

  details Json? // Detalles adicionales

  @@index([userId])
  @@index([orgId])
  @@index([createdAt])
}
```

---

### 4. Rate Limiting en Notificaciones

**Evitar spam de notificaciones:**

- Agrupar alertas similares (ej: "5 empleados llegaron tarde hoy")
- Limitar emails a 1 por hora por usuario
- Configuración de "no molestar" en horarios

---

---

## ⚠️ ADENDA: Aclaraciones Críticas

**Esta sección cubre puntos fundamentales que NO deben implementarse sin estar 100% claros.**

---

### 🔑 1. Responsables vs "Cualquier Persona" - Separación Total

**CRÍTICO:** Diferenciar claramente entre:

#### A) `AreaResponsible` = Permisos de Acceso y Gestión

```typescript
// Ana es RESPONSABLE de Madrid Norte
// → Puede VER datos del centro
// → Puede GESTIONAR horarios, resolver alertas, etc.
{
  userId: "ana_garcia",
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  permissions: ["VIEW_EMPLOYEES", "MANAGE_SCHEDULES", "RESOLVE_ALERTS"]
}
```

**Consecuencias:**

- ✅ Puede acceder al dashboard del centro
- ✅ Puede ver empleados del centro
- ✅ Puede gestionar según permisos
- ✅ También recibe alertas por defecto (pero configurable)

---

#### B) `AlertSubscription` = Solo Recibir Notificaciones (SIN permisos)

```typescript
// Paco de PRL recibe alertas CRITICAL de Madrid Norte
// → NO puede ver el dashboard
// → NO puede gestionar nada
// → SOLO recibe notificaciones
{
  userId: "paco_prl",
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  severityLevels: ["CRITICAL"],
  notifyByEmail: true,
  notifyInApp: true
}
```

**Consecuencias:**

- ✅ Recibe notificaciones de alertas CRITICAL del centro
- ❌ NO puede acceder al dashboard de alertas
- ❌ NO puede ver empleados del centro
- ❌ NO puede resolver alertas

---

#### Regla de Oro:

```
Ver datos (AreaResponsible con permisos) ≠ Recibir alertas (AlertSubscription)
```

**Ejemplos combinados:**

```typescript
// Caso 1: Ana (Manager) - Responsable + Suscrita
AreaResponsible: { costCenterId: "madrid", permissions: [...] }
AlertSubscription: { costCenterId: "madrid", severityLevels: ["CRITICAL"], notifyByEmail: true }
→ Ve el dashboard + Recibe alertas críticas por email

// Caso 2: Paco (PRL) - Solo Suscrito
AlertSubscription: { costCenterId: "madrid", severityLevels: ["CRITICAL"], notifyByEmail: true }
→ NO ve el dashboard, SOLO recibe emails de alertas críticas

// Caso 3: Carlos (Consultor) - Solo Responsable, Sin alertas
AreaResponsible: { costCenterId: "madrid", permissions: ["VIEW_EMPLOYEES"] }
→ Ve el dashboard, NO recibe notificaciones (desactivó suscripción)
```

---

#### Implementación en UI:

**Configuración de Centro "Madrid Norte":**

```
┌────────────────────────────────────────────────────────────┐
│ 🏢 Centro de Trabajo: Madrid Norte                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 👥 RESPONSABLES (pueden ver/gestionar datos del centro)   │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ 👤 Ana García     [Editar permisos] [Eliminar]       │  │
│ │ 👤 Carlos Ruiz    [Editar permisos] [Eliminar]       │  │
│ └──────────────────────────────────────────────────────┘  │
│ [+ Añadir Responsable]                                    │
│                                                            │
│ ─────────────────────────────────────────────────────────  │
│                                                            │
│ 🔔 DESTINATARIOS DE ALERTAS (solo reciben notificaciones) │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ 👤 Paco PRL       (CRITICAL, email)   [Editar] [X]   │  │
│ │ 👤 María RRHH     (Todas, in-app)     [Editar] [X]   │  │
│ └──────────────────────────────────────────────────────┘  │
│ [+ Añadir Destinatario]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 🎯 2. Contexto Activo para Multi-Scope Users

**Problema:** Un usuario con múltiples responsabilidades (ej: Manager de 3 centros + RRHH) necesita cambiar de "contexto" para no ver todo mezclado.

#### Modelo de Contexto Activo

**Nuevo campo en sesión del usuario:**

```typescript
interface UserSession {
  userId: string;
  orgId: string;

  // NUEVO: Contexto activo
  activeContext: {
    scope: "ORGANIZATION" | "COST_CENTER" | "DEPARTMENT" | "TEAM";
    scopeId?: string; // ID del centro/depto/equipo activo
    scopeName?: string; // Nombre para mostrar en UI
  };

  // Todos los scopes disponibles (para cambiar)
  availableContexts: Array<{
    scope: string;
    scopeId?: string;
    scopeName: string;
    permissions: string[];
  }>;
}
```

---

#### Ejemplo de Usuario con Múltiples Scopes:

```typescript
// Ana García: RRHH Global + Manager de Madrid Norte + Manager de Ventas
{
  userId: "ana_garcia",
  activeContext: {
    scope: "ORGANIZATION", // Contexto por defecto: RRHH Global
    scopeName: "Vista Global (RRHH)"
  },
  availableContexts: [
    {
      scope: "ORGANIZATION",
      scopeName: "Vista Global (RRHH)",
      permissions: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "APPROVE_PTO", ...]
    },
    {
      scope: "COST_CENTER",
      scopeId: "madrid_norte",
      scopeName: "Centro Madrid Norte",
      permissions: ["VIEW_EMPLOYEES", "MANAGE_SCHEDULES", "RESOLVE_ALERTS"]
    },
    {
      scope: "DEPARTMENT",
      scopeId: "ventas",
      scopeName: "Departamento Ventas",
      permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS"]
    }
  ]
}
```

---

#### Selector de Contexto en UI:

**Navbar del dashboard:**

```tsx
┌──────────────────────────────────────────────────────────┐
│ [Logo] TimeNow ERP                                       │
│                                                          │
│ 🔍 Contexto activo: [Vista Global (RRHH) ▼]            │
│     ┌────────────────────────────────────────┐          │
│     │ ✓ Vista Global (RRHH)                 │          │
│     │   Centro Madrid Norte                 │          │
│     │   Departamento Ventas                 │          │
│     └────────────────────────────────────────┘          │
│                                                          │
│ Dashboard | Empleados | Alertas | ...         [👤]     │
└──────────────────────────────────────────────────────────┘
```

---

#### Lógica de Filtrado según Contexto:

```typescript
async function buildScopeFilter(userId: string, activeContext: ActiveContext) {
  // Si contexto es ORGANIZATION, ve TODO
  if (activeContext.scope === "ORGANIZATION") {
    return {}; // Sin filtro
  }

  // Si contexto es específico, filtrar por ese ámbito
  if (activeContext.scope === "COST_CENTER") {
    return {
      costCenterId: activeContext.scopeId,
    };
  }

  if (activeContext.scope === "DEPARTMENT") {
    return {
      departmentId: activeContext.scopeId,
    };
  }

  if (activeContext.scope === "TEAM") {
    return {
      teamId: activeContext.scopeId,
    };
  }

  return { id: "none" }; // No ve nada
}
```

---

#### Cambio de Contexto (Server Action):

```typescript
export async function switchContext(scope: string, scopeId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  // Verificar que el usuario tiene acceso a este contexto
  const hasAccess = await prisma.areaResponsible.findFirst({
    where: {
      userId: session.user.id,
      scope,
      ...(scope === "COST_CENTER" && { costCenterId: scopeId }),
      ...(scope === "DEPARTMENT" && { departmentId: scopeId }),
      ...(scope === "TEAM" && { teamId: scopeId }),
      isActive: true,
    },
  });

  if (!hasAccess && scope !== "ORGANIZATION") {
    throw new Error("No tienes acceso a este contexto");
  }

  // Actualizar sesión (en cookie/DB)
  await updateSessionContext(session.user.id, { scope, scopeId });

  return { success: true };
}
```

---

### 🚨 3. Reglas de Negocio para Casos Borderline

#### A) Centro sin Responsables / Sin Suscripciones

**Regla 1:** Cuando se crea una alerta en un centro SIN suscriptores:

```typescript
// Fallback automático a RRHH Global
async function notifyAlertSubscribers(alert: Alert) {
  const subscriptions = await getSubscriptionsForAlert(alert);

  if (subscriptions.length === 0) {
    // NO HAY SUSCRIPTORES → Fallback a RRHH Global
    const hrGlobalUsers = await prisma.areaResponsible.findMany({
      where: {
        orgId: alert.orgId,
        scope: "ORGANIZATION",
        isActive: true,
      },
      include: { user: true },
    });

    // Notificar a RRHH Global automáticamente
    for (const responsible of hrGlobalUsers) {
      await createInAppNotification({
        userId: responsible.userId,
        type: "ALERT_ORPHAN", // Tipo especial: alerta sin responsable
        title: `[Sin responsable] ${alert.title}`,
        description: `Centro ${alert.costCenter?.name} no tiene responsables configurados`,
      });
    }

    // Log de auditoría
    console.warn(`Alert ${alert.id} has no subscribers, fallback to HR Global`);
  }
}
```

**Regla 2:** Al crear un centro nuevo, asignar RRHH Global automáticamente:

```typescript
async function createCostCenter(data: CostCenterData) {
  const costCenter = await prisma.costCenter.create({ data });

  // Auto-asignar RRHH Global como responsable por defecto
  const hrGlobalUsers = await prisma.areaResponsible.findMany({
    where: { orgId: data.orgId, scope: "ORGANIZATION" },
  });

  for (const hr of hrGlobalUsers) {
    await prisma.alertSubscription.create({
      data: {
        userId: hr.userId,
        orgId: data.orgId,
        scope: "COST_CENTER",
        costCenterId: costCenter.id,
        alertTypes: [], // Todas
        severityLevels: ["CRITICAL"], // Solo críticas por defecto
        notifyInApp: true,
        notifyByEmail: false,
      },
    });
  }

  return costCenter;
}
```

---

#### B) Cambio de Centro/Departamento de un Empleado

**Problema:** Juan trabajaba en "Madrid Norte", ahora se muda a "Barcelona Este". ¿Qué pasa con las alertas históricas?

**Regla 3:** Alertas históricas NO se mueven (se quedan en el centro/depto original)

```typescript
model Alert {
  // ... campos existentes ...

  // Centro/Depto en el MOMENTO de crear la alerta (inmutable)
  originalCostCenterId String?
  originalDepartmentId String?

  // Centro/Depto ACTUAL del empleado (puede cambiar)
  employee Employee @relation(...)

  @@index([originalCostCenterId])
  @@index([originalDepartmentId])
}
```

**Lógica al crear alerta:**

```typescript
await prisma.alert.create({
  data: {
    employeeId: employee.id,
    type: "LATE_ARRIVAL",
    severity: "CRITICAL",

    // Guardar centro/depto en el momento de la alerta
    originalCostCenterId: employee.costCenterId,
    originalDepartmentId: employee.departmentId,
    originalTeamId: employee.teamId,

    // Referencia actual (para filtrado)
    costCenterId: employee.costCenterId,
    departmentId: employee.departmentId,
    teamId: employee.teamId,
  },
});
```

**Filtrado en dashboard:**

```typescript
// Manager de Madrid Norte ve:
// 1. Alertas actuales de empleados en Madrid Norte
// 2. Alertas históricas que se generaron cuando el empleado estaba en Madrid Norte

const alerts = await prisma.alert.findMany({
  where: {
    OR: [
      { costCenterId: "madrid_norte" }, // Alertas actuales
      { originalCostCenterId: "madrid_norte" }, // Alertas históricas
    ],
  },
});
```

---

#### C) Usuario con Muchas Responsabilidades (Sobrecarga)

**Problema:** Ana es responsable de 5 centros + 3 departamentos → recibe cientos de alertas al día.

**Regla 4:** Límites y Filtros por Defecto

```typescript
// Configuración en AlertSubscription
model AlertSubscription {
  // ... campos existentes ...

  // NUEVO: Configuración de volumen
  maxAlertsPerDay Int? // Límite diario (ej: 50 alertas/día)
  digestMode Boolean @default(false) // Agrupar en resumen diario
  digestTime String? // "09:00" - Enviar resumen a las 9am

  onlyFirstOccurrence Boolean @default(false) // Solo notificar la primera vez, no repetir
}
```

**Lógica de agrupación (Digest Mode):**

```typescript
// En lugar de enviar 50 emails individuales, enviar 1 resumen a las 9am
async function sendDailyDigest(userId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const alerts = await prisma.alert.findMany({
    where: {
      createdAt: { gte: yesterday },
      notifiedUsers: { has: userId },
    },
  });

  // Agrupar por tipo y severidad
  const summary = {
    critical: alerts.filter((a) => a.severity === "CRITICAL").length,
    warning: alerts.filter((a) => a.severity === "WARNING").length,
    byType: groupBy(alerts, "type"),
  };

  await sendEmail({
    to: user.email,
    subject: `Resumen de alertas: ${summary.critical} críticas, ${summary.warning} avisos`,
    template: "daily-digest",
    data: summary,
  });
}
```

**Regla 5:** Paginación y filtros por defecto en dashboard

```typescript
// Dashboard de alertas con filtros por defecto según volumen
export async function getAlerts(userId: string, filters?: AlertFilters) {
  const responsibilities = await getUserResponsibilities(userId);

  // Si tiene muchas responsabilidades, aplicar filtro por defecto
  const defaultFilters =
    responsibilities.costCenters.length > 3
      ? { severity: "CRITICAL" } // Solo críticas por defecto
      : {}; // Todas

  const alerts = await prisma.alert.findMany({
    where: {
      ...buildScopeFilter(userId),
      ...(filters ?? defaultFilters),
    },
    take: 50, // Paginación: 50 por página
    orderBy: { createdAt: "desc" },
  });

  return alerts;
}
```

---

### ⚙️ 4. Detalles Operativos del Motor de Alertas

#### A) Cuándo se Ejecuta `detectAlerts()`

**Estrategia Híbrida: Tiempo Real + Batch Diario**

**1. Tiempo Real (al fichar):**

```typescript
// En clockIn() / clockOut()
export async function clockIn(...) {
  // Crear fichaje
  const entry = await prisma.timeEntry.create({ ... });

  // DETECTAR ALERTAS INMEDIATAMENTE
  await detectAlerts(employeeId, new Date());

  return entry;
}
```

**Ventajas:**

- ✅ Notificaciones instantáneas
- ✅ Managers ven alertas en tiempo real

**Desventajas:**

- ⚠️ Solo detecta alertas de fichajes (LATE_ARRIVAL, EARLY_DEPARTURE)
- ❌ NO detecta ausencias sin justificar (empleado no fichó)

---

**2. Batch Diario (cron job):**

```typescript
// Ejecutar diariamente a las 23:00 (fin del día laboral)
// Detecta: ausencias, jornadas incompletas, patrones

export async function detectDailyAlerts() {
  const today = new Date();
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
  });

  for (const employee of employees) {
    // Detectar ausencias sin justificar
    await detectAbsenceAlerts(employee.id, today);

    // Detectar jornadas incompletas
    await detectIncompleteWorkdayAlerts(employee.id, today);

    // Detectar patrones (3 retrasos consecutivos, etc.)
    await detectPatternAlerts(employee.id, today);
  }
}
```

**Ventajas:**

- ✅ Detecta ausencias (empleado no fichó en todo el día)
- ✅ Detecta patrones (analiza últimos 7 días)
- ✅ Cierre automático de alertas (si se corrigió)

**Configuración del cron:**

```typescript
// En package.json o docker-compose.yml
{
  "scripts": {
    "detect-alerts": "node scripts/detect-daily-alerts.ts"
  }
}

// Cron: todos los días a las 23:00
0 23 * * * npm run detect-alerts
```

---

#### B) Deduplicación: Clave Única por Alerta

**Problema:** Si ejecutas `detectAlerts()` varias veces sobre el mismo día, puede duplicar alertas.

**Solución: Constraint UNIQUE en base de datos**

```prisma
model Alert {
  // ... campos existentes ...

  // UNIQUE constraint: solo 1 alerta por (empleado, fecha, tipo)
  @@unique([employeeId, date, type])
}
```

**Lógica con `upsert`:**

```typescript
async function createOrUpdateAlert(alertData: AlertData) {
  return await prisma.alert.upsert({
    where: {
      // Clave única compuesta
      employeeId_date_type: {
        employeeId: alertData.employeeId,
        date: alertData.date,
        type: alertData.type,
      },
    },
    update: {
      // Si ya existe, actualizar severidad/descripción
      severity: alertData.severity,
      description: alertData.description,
      deviationMinutes: alertData.deviationMinutes,
    },
    create: {
      // Si no existe, crear nueva
      ...alertData,
      status: "ACTIVE",
    },
  });
}
```

**Ejemplo:**

```typescript
// Primera ejecución: Crea alerta
await createOrUpdateAlert({
  employeeId: "juan",
  date: "2025-11-19",
  type: "LATE_ARRIVAL",
  severity: "WARNING", // 20 min tarde
  deviationMinutes: 20,
});

// Segunda ejecución: Actualiza severidad (si empeoró)
await createOrUpdateAlert({
  employeeId: "juan",
  date: "2025-11-19",
  type: "LATE_ARRIVAL",
  severity: "CRITICAL", // Ahora 35 min tarde (escaló)
  deviationMinutes: 35,
});

// Resultado: 1 sola alerta actualizada, no 2 alertas duplicadas
```

---

#### C) Ventana Temporal para Detección de Patrones

**Ejemplo: Detectar "3 retrasos consecutivos en 7 días"**

```typescript
async function detectPatternAlerts(employeeId: string, date: Date) {
  const last7Days = new Date(date);
  last7Days.setDate(last7Days.getDate() - 7);

  // Obtener alertas de entrada tarde en últimos 7 días
  const lateArrivals = await prisma.alert.findMany({
    where: {
      employeeId,
      type: { in: ["LATE_ARRIVAL", "CRITICAL_LATE_ARRIVAL"] },
      date: { gte: last7Days, lte: date },
      status: "ACTIVE", // Solo alertas no resueltas
    },
    orderBy: { date: "desc" },
  });

  // Detectar si hay 3 o más retrasos
  if (lateArrivals.length >= 3) {
    // Verificar si son consecutivos (días consecutivos)
    const dates = lateArrivals.map((a) => a.date.toISOString().split("T")[0]);
    const areConsecutive = checkConsecutiveDates(dates);

    if (areConsecutive) {
      await createOrUpdateAlert({
        employeeId,
        date,
        type: "PATTERN_DETECTED",
        severity: "CRITICAL",
        title: `Patrón detectado: 3 retrasos consecutivos`,
        description: `Últimos 7 días: ${dates.join(", ")}`,
      });
    }
  }
}
```

**Configuración de ventanas (en Organization):**

```prisma
model Organization {
  // ... campos existentes ...

  // Configuración de detección de patrones
  patternDetectionEnabled Boolean @default(true)
  patternWindowDays Int @default(7) // Ventana de análisis
  patternMinOccurrences Int @default(3) // Mínimo de ocurrencias
}
```

---

#### D) Escalado de Severidad

**Regla:** Una alerta WARNING que se repite X veces pasa a CRITICAL

```typescript
async function escalateAlertSeverity(employeeId: string, type: string) {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const warnings = await prisma.alert.count({
    where: {
      employeeId,
      type,
      severity: "WARNING",
      date: { gte: last30Days },
      status: "ACTIVE",
    },
  });

  // Si tiene 5 o más warnings del mismo tipo en 30 días, escalar
  if (warnings >= 5) {
    await createOrUpdateAlert({
      employeeId,
      date: new Date(),
      type: `ESCALATED_${type}`,
      severity: "CRITICAL",
      title: `Escalado: ${warnings} ocurrencias de ${type} en 30 días`,
    });
  }
}
```

---

#### E) Cierre Automático al Corregir Fichajes

**Problema:** Manager corrige un fichaje (marca presencia donde había ausencia) → la alerta debería cerrarse automáticamente.

**Solución: Hook en `updateTimeEntry()`**

```typescript
export async function updateTimeEntry(entryId: string, data: UpdateData) {
  const entry = await prisma.timeEntry.update({
    where: { id: entryId },
    data,
  });

  // RE-DETECTAR ALERTAS (puede cerrar automáticamente)
  await detectAlerts(entry.employeeId, entry.timestamp);

  return entry;
}

// Lógica de cierre en detectAlerts()
async function detectAlerts(employeeId: string, date: Date) {
  // ... lógica de detección ...

  // Cerrar alertas que ya no aplican
  const schedule = await getEffectiveSchedule(employeeId, date);
  const entries = await getTimeEntriesForDate(employeeId, date);

  // Si ahora tiene presencia completa, cerrar alerta de ausencia
  if (entries.some((e) => e.entryType === "CLOCK_IN")) {
    await prisma.alert.updateMany({
      where: {
        employeeId,
        date,
        type: "ABSENCE_NO_JUSTIFY",
        status: "ACTIVE",
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionComment: "Auto-cerrado: presencia registrada",
      },
    });
  }
}
```

---

### 📋 5. Prioridad de Reglas en Suscripciones

**Problema:** Usuario tiene múltiples suscripciones que pueden contradecirse.

#### Reglas de Prioridad (de mayor a menor):

**Regla 1: Suscripción directa a userId tiene prioridad máxima**

```typescript
// Si existe una suscripción específica del usuario, ignorar las demás
const userSubscription = await prisma.alertSubscription.findFirst({
  where: {
    userId,
    scope: "COST_CENTER",
    costCenterId: alert.costCenterId,
  },
});

if (userSubscription) {
  // Usar esta configuración, ignorar defaults del centro
  return [userSubscription];
}
```

---

**Regla 2: Orden de especificidad (más específico > más general)**

```
Prioridad de scopes:
1. TEAM (más específico)
2. DEPARTMENT
3. COST_CENTER
4. ORGANIZATION (más general)
```

**Lógica:**

```typescript
async function getEffectiveSubscription(userId: string, alert: Alert) {
  // Buscar suscripciones del usuario, ordenadas por especificidad
  const subscriptions = await prisma.alertSubscription.findMany({
    where: {
      userId,
      OR: [
        { scope: "TEAM", teamId: alert.teamId },
        { scope: "DEPARTMENT", departmentId: alert.departmentId },
        { scope: "COST_CENTER", costCenterId: alert.costCenterId },
        { scope: "ORGANIZATION" },
      ],
    },
  });

  // Devolver la más específica
  if (subscriptions.find((s) => s.scope === "TEAM")) return subscriptions.find((s) => s.scope === "TEAM");
  if (subscriptions.find((s) => s.scope === "DEPARTMENT")) return subscriptions.find((s) => s.scope === "DEPARTMENT");
  if (subscriptions.find((s) => s.scope === "COST_CENTER")) return subscriptions.find((s) => s.scope === "COST_CENTER");
  return subscriptions.find((s) => s.scope === "ORGANIZATION");
}
```

---

**Regla 3: Conflicto de canales → Usar superset (unión)**

```typescript
// Si una suscripción dice "solo in-app" y otra dice "solo email"
// → Enviar AMBOS canales

const subscriptions = getSubscriptionsForAlert(alert, userId);

const notifyInApp = subscriptions.some(s => s.notifyInApp);
const notifyByEmail = subscriptions.some(s => s.notifyByEmail);

if (notifyInApp) {
  await createInAppNotification(...);
}

if (notifyByEmail) {
  await sendAlertEmail(...);
}
```

---

#### Defaults al Crear Centro/Departamento

**Regla 4: Auto-crear suscripción para RRHH Global**

```typescript
async function createCostCenter(data: CostCenterData) {
  const center = await prisma.costCenter.create({ data });

  // Buscar RRHH Global
  const hrUsers = await prisma.areaResponsible.findMany({
    where: { orgId: data.orgId, scope: "ORGANIZATION" },
  });

  // Crear suscripción automática para cada RRHH
  for (const hr of hrUsers) {
    await prisma.alertSubscription.create({
      data: {
        userId: hr.userId,
        orgId: data.orgId,
        scope: "COST_CENTER",
        costCenterId: center.id,
        alertTypes: [], // Todas
        severityLevels: ["CRITICAL"], // Solo críticas
        notifyInApp: true,
        notifyByEmail: false,
      },
    });
  }
}
```

---

#### Sobrescritura de Usuario

**Regla 5: Usuario puede desactivar suscripciones heredadas**

```prisma
model AlertSubscription {
  // ... campos existentes ...

  // NUEVO: Permite al usuario anular suscripciones automáticas
  isUserOverride Boolean @default(false) // True si el usuario la modificó manualmente
  isDisabled Boolean @default(false) // True si el usuario la desactivó explícitamente
}
```

**Lógica:**

```typescript
// Al notificar, respetar overrides del usuario
const subscription = await getEffectiveSubscription(userId, alert);

if (subscription?.isDisabled) {
  // Usuario desactivó esta suscripción explícitamente
  return; // No notificar
}

// Proceder con notificación
```

---

### 🔒 6. Multi-Tenant y Seguridad - CRÍTICO

#### A) orgId en TODAS las Tablas (sin excepción)

**Verificación de schema:**

```prisma
// ✅ CORRECTO - Todas tienen orgId
model Alert {
  id String @id
  orgId String
  organization Organization @relation(...)
  // ...
}

model AlertSubscription {
  id String @id
  orgId String
  organization Organization @relation(...)
  // ...
}

model AreaResponsible {
  id String @id
  orgId String
  organization Organization @relation(...)
  // ...
}

model Team {
  id String @id
  orgId String
  organization Organization @relation(...)
  // ...
}
```

---

#### B) buildScopeFilter() SIEMPRE incluye orgId

**Helper actualizado:**

```typescript
async function buildScopeFilter(userId: string, activeContext: ActiveContext) {
  const session = await auth();
  if (!session?.user?.orgId) throw new Error("No autenticado");

  // BASE FILTER: SIEMPRE incluir orgId (multi-tenant)
  const baseFilter: Prisma.EmployeeWhereInput = {
    orgId: session.user.orgId, // ← OBLIGATORIO
  };

  // Si contexto es ORGANIZATION, solo filtrar por orgId
  if (activeContext.scope === "ORGANIZATION") {
    return baseFilter;
  }

  // Añadir filtros específicos del contexto
  if (activeContext.scope === "COST_CENTER") {
    return {
      ...baseFilter,
      costCenterId: activeContext.scopeId,
    };
  }

  // ... otros scopes

  return baseFilter;
}
```

---

#### C) Tests de Seguridad Multi-Tenant

**Tests obligatorios antes de deploy:**

```typescript
describe("Multi-Tenant Security", () => {
  it("User from Org A cannot see employees from Org B", async () => {
    const userOrgA = await createUser({ orgId: "org_a" });
    const employeeOrgB = await createEmployee({ orgId: "org_b" });

    const result = await getEmployees(userOrgA.id);

    expect(result).not.toContainEqual(expect.objectContaining({ id: employeeOrgB.id }));
  });

  it("User from Org A cannot see alerts from Org B", async () => {
    const userOrgA = await createUser({ orgId: "org_a" });
    const alertOrgB = await createAlert({ orgId: "org_b" });

    const result = await getAlerts(userOrgA.id);

    expect(result).not.toContainEqual(expect.objectContaining({ id: alertOrgB.id }));
  });

  it("User cannot resolve alert from another org even with direct ID", async () => {
    const userOrgA = await createUser({ orgId: "org_a" });
    const alertOrgB = await createAlert({ orgId: "org_b" });

    await expect(resolveAlert(userOrgA.id, alertOrgB.id, "comment")).rejects.toThrow("No tienes permiso");
  });

  it("buildScopeFilter always includes orgId", async () => {
    const user = await createUser({ orgId: "org_a" });
    const filter = await buildScopeFilter(user.id, { scope: "ORGANIZATION" });

    expect(filter).toHaveProperty("orgId", "org_a");
  });
});
```

---

#### D) Validación en Server Actions

**Template de server action seguro:**

```typescript
export async function getSensitiveData(filters?: any) {
  // 1. AUTH: Verificar autenticación
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  // 2. MULTI-TENANT: Filtrar por orgId SIEMPRE
  const baseFilter = {
    orgId: session.user.orgId, // ← OBLIGATORIO
  };

  // 3. SCOPE: Filtrar por ámbito del usuario
  const scopeFilter = await buildScopeFilter(session.user.id, session.user.activeContext);

  // 4. PERMISSIONS: Verificar permiso específico
  const responsibilities = await getUserResponsibilities(session.user.id);
  if (!responsibilities.permissions.includes("VIEW_SENSITIVE_DATA")) {
    throw new Error("No tienes permiso");
  }

  // 5. QUERY: Ejecutar con todos los filtros
  const data = await prisma.sensitiveData.findMany({
    where: {
      ...baseFilter, // Multi-tenant
      ...scopeFilter, // Ámbito del usuario
      ...filters, // Filtros adicionales
    },
  });

  return data;
}
```

---

### ⚡ 7. Rendimiento y Volumen

#### A) Índices en Alert (CRÍTICO)

```prisma
model Alert {
  // ... campos existentes ...

  @@index([orgId]) // Multi-tenant
  @@index([employeeId]) // Alertas por empleado
  @@index([costCenterId]) // Filtrado por centro
  @@index([departmentId]) // Filtrado por departamento
  @@index([teamId]) // Filtrado por equipo
  @@index([status]) // Filtrar activas/resueltas
  @@index([severity]) // Filtrar por severidad
  @@index([type]) // Filtrar por tipo
  @@index([date]) // Ordenar/filtrar por fecha
  @@index([createdAt]) // Ordenar por creación

  // Índices compuestos para queries comunes
  @@index([orgId, status, severity]) // Dashboard principal
  @@index([costCenterId, status, date]) // Dashboard de centro
  @@index([employeeId, date, type]) // Detectar duplicados
}
```

---

#### B) Archivado de Alertas Antiguas

**Tabla de archivo:**

```prisma
model AlertArchive {
  // Misma estructura que Alert
  // Pero en tabla separada para no afectar rendimiento

  id String @id
  // ... todos los campos de Alert
  archivedAt DateTime @default(now())

  @@index([orgId, employeeId, archivedAt])
}
```

**Job de archivado (mensual):**

```typescript
// Archivar alertas resueltas con más de 1 año
async function archiveOldAlerts() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const oldAlerts = await prisma.alert.findMany({
    where: {
      status: "RESOLVED",
      resolvedAt: { lt: oneYearAgo },
    },
  });

  // Copiar a tabla de archivo
  await prisma.alertArchive.createMany({
    data: oldAlerts.map((alert) => ({
      ...alert,
      archivedAt: new Date(),
    })),
  });

  // Eliminar de tabla principal
  await prisma.alert.deleteMany({
    where: {
      id: { in: oldAlerts.map((a) => a.id) },
    },
  });

  console.log(`Archived ${oldAlerts.length} old alerts`);
}
```

---

#### C) Patrones de Optimización del Filtrado

**Pattern 1: withScopeFilter() wrapper**

```typescript
async function withScopeFilter<T>(query: Prisma.AlertFindManyArgs, userId: string): Promise<T[]> {
  const session = await auth();
  const scopeFilter = await buildScopeFilter(userId, session.user.activeContext);

  return await prisma.alert.findMany({
    ...query,
    where: {
      ...query.where,
      orgId: session.user.orgId, // Multi-tenant
      employee: scopeFilter, // Scope del usuario
    },
  });
}

// Uso
const alerts = await withScopeFilter<Alert>(
  {
    where: { severity: "CRITICAL" },
    orderBy: { date: "desc" },
    take: 50,
  },
  userId,
);
```

---

### 🎨 8. UX y Complejidad - Plan de MVP

#### Versión 1 (MVP) - Semanas 1-2

**Alcance:**

- ✅ Solo managers de centro + RRHH Global
- ✅ Sin equipos (Team model opcional)
- ✅ Suscripciones predefinidas (no configurables por usuario)
- ✅ Detección básica de alertas (LATE_ARRIVAL, EARLY_DEPARTURE, ABSENCE)
- ✅ Dashboard simple de alertas (filtros básicos)

**Modelo simplificado:**

```prisma
// Solo 2 scopes: ORGANIZATION y COST_CENTER
model AreaResponsible {
  scope String // "ORGANIZATION" | "COST_CENTER"
  costCenterId String? // Solo si scope = COST_CENTER
}

// Suscripciones automáticas (no configurables)
// RRHH → Recibe todas las alertas CRITICAL
// Manager de centro → Recibe alertas de su centro (todas las severidades)
```

**UI mínima:**

- Configuración de centros: Asignar responsables (sin permisos granulares)
- Dashboard de alertas: Lista con filtros básicos (estado, severidad)
- Notificaciones: Solo in-app (sin email)

---

#### Versión 2 - Semanas 3-4

**Alcance:**

- ✅ Añadir departamentos y equipos
- ✅ Configuración básica de suscripciones (por centro/depto)
- ✅ Permisos granulares (VIEW, MANAGE, RESOLVE)
- ✅ Detección de patrones (PATTERN_DETECTED)
- ✅ Notificaciones por email (opcional)

**Modelo completo:**

```prisma
model AreaResponsible {
  scope String // "ORGANIZATION" | "COST_CENTER" | "DEPARTMENT" | "TEAM"
  permissions String[] // Permisos específicos
}

model AlertSubscription {
  // Configuración por usuario/ámbito
  severityLevels String[] // Filtrar por severidad
  notifyByEmail Boolean // Email opcional
}
```

**UI mejorada:**

- Configuración de suscripciones (por ámbito, severidad)
- Dashboard avanzado (filtros por tipo, empleado, fecha)
- Gestión de equipos

---

#### Versión 3 - Semanas 5-6

**Alcance:**

- ✅ Filtrado avanzado por usuario (alertTypes, severityLevels)
- ✅ Digest mode (resúmenes diarios)
- ✅ Contexto activo (cambio de scope)
- ✅ Detección avanzada (escalado de severidad)
- ✅ Archivado de alertas antiguas

**Modelo completo:**

```prisma
model AlertSubscription {
  alertTypes String[] // Filtrar por tipos específicos
  maxAlertsPerDay Int? // Límite de volumen
  digestMode Boolean // Resumen diario
}

model UserSession {
  activeContext Json // Contexto activo del usuario
}
```

**UI completa:**

- Selector de contexto en navbar
- Configuración avanzada de suscripciones
- Dashboard con estadísticas y métricas
- Panel de notificaciones con contador

---

## 📚 Documentos Relacionados

- [Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md) - Documentación completa del sistema
- [Sistema de Alertas](./VALIDACIONES_Y_CONFIGURACION.md) - Validaciones y alertas básicas
- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md) - Lógica de validación de fichajes

---

**Versión:** 1.1 (Con Adenda de Aclaraciones Críticas)
**Última actualización:** 2025-11-19
**Autor:** Sistema de Planificación ERP TimeNow

**Estado:** 📐 Diseño Arquitectónico Completo - Listo para Implementación MVP
