# Reglas de Negocio - Sistema de Responsables y Alertas

**Fecha:** 2025-11-20
**Versión:** 1.0
**Estado:** 📋 Especificación Oficial

---

## 📚 Índice

1. [Conceptos Fundamentales](#conceptos-fundamentales)
2. [Regla 1: Independencia Ver vs Notificar](#regla-1-independencia-ver-vs-notificar)
3. [Regla 2: Vista Unificada](#regla-2-vista-unificada)
4. [Regla 3: Prioridad de Scopes](#regla-3-prioridad-de-scopes)
5. [Regla 4: Validación Multi-Tenant](#regla-4-validación-multi-tenant)
6. [Regla 5: Idempotencia de Alertas](#regla-5-idempotencia-de-alertas)
7. [Regla 6: Cierre Automático de Alertas](#regla-6-cierre-automático-de-alertas)
8. [Casos de Uso Detallados](#casos-de-uso-detallados)
9. [Validaciones Obligatorias](#validaciones-obligatorias)

---

## 🎯 Conceptos Fundamentales

### AreaResponsible - Permisos de Gestión

Define quién puede **VER y GESTIONAR** datos de un ámbito.

```typescript
{
  userId: "ana_garcia",
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS", "MANAGE_SCHEDULES"]
}
```

**Permisos disponibles:**

```typescript
enum Permission {
  VIEW_EMPLOYEES       // Ver listado de empleados
  MANAGE_EMPLOYEES     // Crear/editar empleados
  VIEW_TIME_ENTRIES    // Ver fichajes
  MANAGE_TIME_ENTRIES  // Editar/validar fichajes
  VIEW_ALERTS          // Ver alertas
  RESOLVE_ALERTS       // Resolver/justificar alertas
  VIEW_SCHEDULES       // Ver horarios
  MANAGE_SCHEDULES     // Asignar/modificar horarios
  VIEW_PTO_REQUESTS    // Ver solicitudes de ausencias
  APPROVE_PTO_REQUESTS // Aprobar/rechazar ausencias
}
```

### AlertSubscription - Notificaciones

Define quién **RECIBE NOTIFICACIONES** de alertas.

```typescript
{
  userId: "ana_garcia",
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  severityLevels: ["CRITICAL", "WARNING"],
  notifyInApp: true,
  digestMode: false
}
```

### Scopes Disponibles

```typescript
type Scope = "ORGANIZATION" | "COST_CENTER" | "TEAM";
```

- `ORGANIZATION`: Alcance global (RRHH)
- `COST_CENTER`: Centro de trabajo completo
- `TEAM`: Equipo específico dentro de un centro

---

## 📌 Regla 1: Independencia Ver vs Notificar

### Principio Fundamental

**`AreaResponsible` y `AlertSubscription` son COMPLETAMENTE INDEPENDIENTES.**

### ✅ Escenarios Permitidos

#### 1. Ver SIN recibir notificaciones

**Caso:** Manager que ve alertas en dashboard pero NO quiere notificaciones en navbar.

```typescript
// AreaResponsible: Puede ver y gestionar
{
  userId: "carlos",
  scope: "COST_CENTER",
  costCenterId: "barcelona",
  permissions: ["VIEW_ALERTS", "RESOLVE_ALERTS"]
}

// AlertSubscription: NO existe
// Resultado: Carlos ve alertas en dashboard pero NO recibe notificaciones
```

#### 2. Recibir notificaciones SIN ser responsable

**Caso:** Técnico de PRL que NO gestiona empleados pero DEBE recibir alertas críticas.

```typescript
// AreaResponsible: NO existe (no gestiona empleados)

// AlertSubscription: Recibe solo CRITICAL
{
  userId: "tecnico_prl",
  scope: "ORGANIZATION",
  severityLevels: ["CRITICAL"],
  notifyInApp: true
}

// Resultado: Técnico recibe notificaciones CRITICAL pero NO puede ver dashboard de empleados
```

#### 3. Ver Y recibir (caso común)

**Caso:** Manager estándar.

```typescript
// AreaResponsible: Puede ver y gestionar
{
  userId: "ana",
  scope: "COST_CENTER",
  costCenterId: "madrid",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS"]
}

// AlertSubscription: Recibe notificaciones
{
  userId: "ana",
  scope: "COST_CENTER",
  costCenterId: "madrid",
  severityLevels: [], // Todas
  notifyInApp: true
}

// Resultado: Ana ve dashboard Y recibe notificaciones
```

### 🚫 Restricción Importante

**NO puedes recibir notificaciones de un ámbito MÁS AMPLIO que tus permisos de visibilidad.**

❌ **INVÁLIDO:**

```typescript
// AreaResponsible: Solo puede ver equipo A
{
  userId: "carlos",
  scope: "TEAM",
  teamId: "equipo_a",
  permissions: ["VIEW_ALERTS"]
}

// AlertSubscription: Intenta recibir TODO el centro
{
  userId: "carlos",
  scope: "COST_CENTER", // ❌ MÁS AMPLIO que su AreaResponsible
  costCenterId: "madrid"
}
```

**Validación en server actions:**

```typescript
async function createAlertSubscription(userId, scope, scopeId) {
  // Verificar que el usuario tiene AreaResponsible del mismo scope o superior
  const hasPermission = await checkUserHasScope(userId, scope, scopeId);
  if (!hasPermission) {
    throw new Error("No puedes suscribirte a alertas de un ámbito que no gestionas");
  }
  // Continuar...
}
```

---

## 📌 Regla 2: Vista Unificada

### Principio Fundamental

**Cuando un usuario tiene MÚLTIPLES responsabilidades, ve TODAS las alertas/empleados de TODOS sus ámbitos MEZCLADAS en una sola vista.**

### ✅ Comportamiento

#### Usuario con múltiples responsabilidades

```typescript
// Usuario "maria_lopez" tiene:
AreaResponsible[] = [
  { scope: "ORGANIZATION", permissions: ["VIEW_ALERTS", "RESOLVE_ALERTS"] }, // RRHH Global
  { scope: "COST_CENTER", costCenterId: "madrid", permissions: ["MANAGE_SCHEDULES"] }, // Manager Madrid
  { scope: "TEAM", teamId: "equipo_a", permissions: ["VIEW_EMPLOYEES"] } // Team Lead Equipo A
]
```

**Al entrar al dashboard de alertas:**

- Ve TODAS las alertas de la organización (por scope ORGANIZATION)
- Ve TODAS las alertas de Madrid (por scope COST_CENTER)
- Ve TODAS las alertas del Equipo A (por scope TEAM)
- **Resultado:** Vista unificada con TODAS las alertas mezcladas

### 🔍 Filtrado Manual

El usuario puede filtrar DESPUÉS con dropdowns:

- **Por centro:** "Todos" | "Madrid" | "Barcelona"
- **Por equipo:** "Todos" | "Equipo A" | "Equipo B"
- **Por severidad:** "Todas" | "CRITICAL" | "WARNING" | "INFO"
- **Por estado:** "Todas" | "ACTIVE" | "RESOLVED" | "DISMISSED"

**NO hay selector de "contexto activo"** ni tabs tipo "Ver como RRHH" vs "Ver como Manager".

---

## 📌 Regla 3: Prioridad de Scopes

### Para Queries de Base de Datos

Cuando se construye el filtro de Prisma, se usa **OR** entre todos los scopes del usuario:

```typescript
// buildScopeFilter(userId) retorna:
{
  OR: [
    { orgId: "org_123" }, // Si tiene ORGANIZATION
    { costCenterId: { in: ["madrid", "bcn"] } }, // Si tiene COST_CENTER
    { teamId: { in: ["equipo_a"] } }, // Si tiene TEAM
  ];
}
```

**NO hay prioridad: se mezclan todos.**

### Para Permisos Específicos

Cuando se valida si puede realizar una acción (ej: `RESOLVE_ALERTS`), se busca en **todos sus AreaResponsible**:

```typescript
async function hasPermission(userId: string, permission: Permission, resourceId?: string) {
  const responsibilities = await prisma.areaResponsible.findMany({
    where: {
      userId,
      isActive: true,
      permissions: { has: permission },
    },
  });

  // Si tiene el permiso en CUALQUIER scope que cubra el recurso, retorna true
  return responsibilities.some((r) => {
    if (r.scope === "ORGANIZATION") return true; // Global
    if (resourceId) {
      // Verificar si el recurso pertenece a ese scope
      return checkResourceBelongsToScope(resourceId, r.scope, r.costCenterId, r.teamId);
    }
    return true;
  });
}
```

---

## 📌 Regla 4: Validación Multi-Tenant

### Principio Fundamental

**NUNCA confiar en IDs del cliente sin validar `orgId`.**

### ✅ Template de Server Action Seguro

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

  // 2. Verificar orgId (multi-tenant)
  if (alert.orgId !== session.user.orgId) {
    throw new Error("Acceso denegado");
  }

  // 3. Verificar scope (ámbito del usuario)
  const scopeFilter = await buildScopeFilter(session.user.id);
  const hasAccess = await prisma.employee.findFirst({
    where: {
      id: alert.employeeId,
      ...scopeFilter,
    },
  });

  if (!hasAccess) {
    throw new Error("No tienes acceso a esta alerta");
  }

  // 4. Verificar permiso RESOLVE_ALERTS
  const hasPermission = await checkPermission(session.user.id, "RESOLVE_ALERTS");
  if (!hasPermission) {
    throw new Error("No tienes permiso para resolver alertas");
  }

  // 5. Ejecutar acción
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

### 🔒 Validaciones Obligatorias en TODOS los Server Actions

```typescript
// Helper obligatorio
async function validateScopeOwnership(userId: string, scope: Scope, scopeId: string | null): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  // Validar orgId del scope
  if (scope === "COST_CENTER" && scopeId) {
    const center = await prisma.costCenter.findUnique({
      where: { id: scopeId },
      select: { orgId: true },
    });
    if (!center || center.orgId !== session.user.orgId) {
      return false;
    }
  }

  if (scope === "TEAM" && scopeId) {
    const team = await prisma.team.findUnique({
      where: { id: scopeId },
      select: { orgId: true },
    });
    if (!team || team.orgId !== session.user.orgId) {
      return false;
    }
  }

  return true;
}
```

---

## 📌 Regla 5: Idempotencia de Alertas

### Principio Fundamental

**Una alerta por tipo, empleado y fecha.**

### Constraint Único

```prisma
model Alert {
  @@unique([employeeId, date, type])
}
```

### Comportamiento al Detectar Alerta

```typescript
// Al fichar entrada tarde
async function detectLateArrival(employeeId: string, date: Date, minutes: number) {
  const alertType = minutes > 30 ? "CRITICAL_LATE_ARRIVAL" : "LATE_ARRIVAL";

  // Intenta crear alerta
  const alert = await prisma.alert.upsert({
    where: {
      employeeId_date_type: {
        employeeId,
        date: startOfDay(date),
        type: alertType,
      },
    },
    update: {
      // Si ya existe, actualiza desviación
      deviationMinutes: minutes,
      title: `Entrada tarde: ${minutes} minutos de retraso`,
      status: "ACTIVE", // Reactivar si estaba cerrada
    },
    create: {
      employeeId,
      date: startOfDay(date),
      type: alertType,
      severity: minutes > 30 ? "CRITICAL" : "WARNING",
      deviationMinutes: minutes,
      title: `Entrada tarde: ${minutes} minutos de retraso`,
      orgId: session.user.orgId,
      costCenterId: employee.contract?.costCenterId,
      teamId: employee.teamId,
    },
  });

  return alert;
}
```

### Deduplicación Inteligente

**Si se corrige el fichaje (Regla 6), la alerta se cierra automáticamente.**

---

## 📌 Regla 6: Cierre Automático de Alertas

### Principio Fundamental

**Cuando se corrige la causa de una alerta, la alerta se cierra automáticamente con estado `RESOLVED` y comentario automático.**

### Casos de Cierre Automático

#### 1. Corrección de Fichaje Manual

**Escenario:**

1. Empleado llega tarde (10:35 en lugar de 09:00) → Alerta `LATE_ARRIVAL` creada
2. Manager aprueba solicitud de fichaje manual con entrada a 09:00
3. Al crear el fichaje manual, se cierra la alerta automáticamente

```typescript
async function approveManualTimeEntry(requestId: string) {
  // ... validaciones ...

  // Crear fichajes manuales
  await createManualClockIn(...);

  // CERRAR alerta automáticamente
  const closedAlerts = await prisma.alert.updateMany({
    where: {
      employeeId: request.employeeId,
      date: startOfDay(request.date),
      type: { in: ["LATE_ARRIVAL", "CRITICAL_LATE_ARRIVAL", "EARLY_DEPARTURE"] },
      status: "ACTIVE"
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedBy: session.user.id,
      resolutionComment: "Cerrada automáticamente: fichaje manual aprobado"
    }
  });

  return { success: true, alertsClosed: closedAlerts.count };
}
```

#### 2. Aprobación de Solicitud de PTO

**Escenario:**

1. Empleado ausente sin justificar → Alerta `ABSENCE_NO_JUSTIFY` creada
2. Se aprueba solicitud de PTO retroactiva
3. Alerta cerrada automáticamente

```typescript
async function approvePtoRequest(requestId: string) {
  // ... validaciones ...

  // Aprobar PTO
  await prisma.ptoRequest.update(...);

  // CERRAR alertas de ausencia para esas fechas
  await prisma.alert.updateMany({
    where: {
      employeeId: request.employeeId,
      date: { gte: request.startDate, lte: request.endDate },
      type: { in: ["ABSENCE_NO_JUSTIFY", "ABSENCE"] },
      status: "ACTIVE"
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolutionComment: "Cerrada automáticamente: ausencia justificada con PTO"
    }
  });
}
```

#### 3. Corrección de Fichaje de Salida

**Escenario:**

1. Empleado sale temprano (16:00 en lugar de 18:00) → Alerta `EARLY_DEPARTURE`
2. Manager edita fichaje de salida a 18:00
3. Alerta cerrada automáticamente

```typescript
async function updateTimeEntry(entryId: string, newTimestamp: Date) {
  // ... validaciones y actualización ...

  // Recalcular desviación del día
  const summary = await recalculateWorkdaySummary(employeeId, date);

  // Si ya no hay desviación significativa, cerrar alerta
  if (Math.abs(summary.deviationMinutes ?? 0) < toleranceMinutes) {
    await prisma.alert.updateMany({
      where: {
        workdaySummaryId: summary.id,
        status: "ACTIVE",
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionComment: "Cerrada automáticamente: fichaje corregido",
      },
    });
  }
}
```

### 🚫 Casos donde NO se cierra automáticamente

- Manager resuelve manualmente con comentario → Estado `RESOLVED` manual
- Empleado descarta notificación → Estado `DISMISSED` (no afecta la alerta)
- Alerta de resumen diario → Solo se cierra manualmente

---

## 📚 Casos de Uso Detallados

### Caso 1: Manager de Centro con Suscripción Parcial

**Perfil:** Ana García, Manager de Madrid Norte

```typescript
// AreaResponsible: Gestiona TODO Madrid Norte
{
  userId: "ana",
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  permissions: [
    "VIEW_EMPLOYEES",
    "VIEW_ALERTS",
    "RESOLVE_ALERTS",
    "MANAGE_SCHEDULES",
    "APPROVE_PTO_REQUESTS"
  ]
}

// AlertSubscription: Solo quiere CRITICAL
{
  userId: "ana",
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  severityLevels: ["CRITICAL"],
  notifyInApp: true,
  digestMode: false
}
```

**Comportamiento:**

- ✅ Ve TODAS las alertas de Madrid Norte en dashboard (incluye WARNING, INFO)
- ✅ Puede resolver CUALQUIER alerta de Madrid Norte
- ✅ Recibe notificaciones solo de alertas CRITICAL
- ❌ NO recibe notificaciones de WARNING (no le molestan)

---

### Caso 2: Técnico PRL sin Gestión de Empleados

**Perfil:** Pedro Gómez, Técnico de Prevención de Riesgos Laborales

```typescript
// AreaResponsible: NO existe (no gestiona empleados)

// AlertSubscription: Recibe CRITICAL de toda la organización
{
  userId: "pedro_prl",
  scope: "ORGANIZATION",
  severityLevels: ["CRITICAL"],
  alertTypes: ["EXCESSIVE_TIME"], // Solo fichajes excesivos (>150% jornada)
  notifyInApp: true,
  digestMode: false
}
```

**Comportamiento:**

- ✅ Recibe notificaciones de fichajes excesivos en TODA la organización
- ❌ NO puede acceder al dashboard de alertas (no tiene `VIEW_ALERTS`)
- ❌ NO puede ver empleados (no tiene `VIEW_EMPLOYEES`)
- ✅ Puede hacer click en notificación → redirige a detalle del empleado (si RRHH le da permiso)

---

### Caso 3: RRHH Global que NO quiere Notificaciones

**Perfil:** María López, RRHH

```typescript
// AreaResponsible: Ve TODO
{
  userId: "maria_rrhh",
  scope: "ORGANIZATION",
  permissions: [
    "VIEW_EMPLOYEES",
    "MANAGE_EMPLOYEES",
    "VIEW_ALERTS",
    "RESOLVE_ALERTS",
    "APPROVE_PTO_REQUESTS"
  ]
}

// AlertSubscription: NO existe (prefiere revisar dashboard manualmente)
```

**Comportamiento:**

- ✅ Ve TODAS las alertas de TODA la organización en dashboard
- ✅ Puede resolver CUALQUIER alerta
- ❌ NO recibe notificaciones en navbar (prefiere revisión activa)
- ✅ Entra al dashboard cuando quiere, filtra por centro/equipo

---

### Caso 4: Manager de Múltiples Equipos

**Perfil:** Carlos Ruiz, Manager de Equipo A y Equipo B (ambos en Madrid Norte)

```typescript
// AreaResponsible #1: Equipo A
{
  userId: "carlos",
  scope: "TEAM",
  teamId: "equipo_a",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS"]
}

// AreaResponsible #2: Equipo B
{
  userId: "carlos",
  scope: "TEAM",
  teamId: "equipo_b",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS"]
}

// AlertSubscription: Recibe de ambos equipos
{
  userId: "carlos",
  scope: "TEAM",
  teamId: "equipo_a",
  severityLevels: ["CRITICAL", "WARNING"],
  notifyInApp: true
}
{
  userId: "carlos",
  scope: "TEAM",
  teamId: "equipo_b",
  severityLevels: ["CRITICAL", "WARNING"],
  notifyInApp: true
}
```

**Comportamiento:**

- ✅ Ve alertas de Equipo A y Equipo B mezcladas en dashboard
- ✅ Puede filtrar manualmente: "Equipo: Equipo A" o "Equipo: Equipo B"
- ✅ Recibe notificaciones de ambos equipos
- ❌ NO ve alertas de otros equipos de Madrid Norte

---

## ✅ Validaciones Obligatorias en Server Actions

### Checklist por Server Action

#### `assignResponsibility()`

- [ ] Validar `orgId` del usuario coincide con `orgId` del scope
- [ ] Validar `costCenterId` pertenece a `orgId`
- [ ] Validar `teamId` pertenece a `orgId` y `costCenterId`
- [ ] Validar que `permissions[]` son válidos
- [ ] Validar unicidad: no duplicar `[userId, scope, costCenterId, teamId]`

#### `createAlertSubscription()`

- [ ] Validar `orgId` del usuario coincide con `orgId` del scope
- [ ] Validar `costCenterId` pertenece a `orgId`
- [ ] Validar `teamId` pertenece a `orgId`
- [ ] Validar que `severityLevels[]` son válidos (`WARNING`, `CRITICAL`, `INFO`)
- [ ] **OPCIONAL:** Validar que el usuario tiene `AreaResponsible` del mismo scope o superior (según tu decisión de si se permite suscribirse sin ser responsable)

#### `resolveAlert()`

- [ ] Validar `orgId` de la alerta coincide con `orgId` del usuario
- [ ] Validar que el usuario tiene acceso al empleado de la alerta (usar `buildScopeFilter`)
- [ ] Validar permiso `RESOLVE_ALERTS`
- [ ] Actualizar `status`, `resolvedAt`, `resolvedBy`, `resolutionComment`

#### `buildScopeFilter()`

- [ ] Obtener todos los `AreaResponsible` del usuario
- [ ] Construir `OR` con todos los scopes
- [ ] Retornar objeto Prisma `where` clause

---

## 🔧 Helpers Obligatorios

### `/src/lib/permissions/scope-helpers.ts`

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Construye filtro de Prisma basado en los scopes del usuario
 */
export async function buildScopeFilter(userId: string) {
  const responsibilities = await prisma.areaResponsible.findMany({
    where: { userId, isActive: true },
    select: { scope: true, costCenterId: true, teamId: true },
  });

  if (responsibilities.length === 0) {
    return { id: "never" }; // Sin acceso
  }

  const filters = responsibilities.map((r) => {
    if (r.scope === "ORGANIZATION") {
      return {}; // Ve todo
    }
    if (r.scope === "COST_CENTER") {
      return { costCenterId: r.costCenterId };
    }
    if (r.scope === "TEAM") {
      return { teamId: r.teamId };
    }
    return {};
  });

  return { OR: filters };
}

/**
 * Obtiene todos los scopes del usuario
 */
export async function getUserScopes(userId: string) {
  return await prisma.areaResponsible.findMany({
    where: { userId, isActive: true },
    include: { costCenter: true, team: true },
  });
}

/**
 * Verifica si el usuario tiene un permiso específico
 */
export async function hasPermission(userId: string, permission: string, resourceId?: string): Promise<boolean> {
  const responsibilities = await prisma.areaResponsible.findMany({
    where: {
      userId,
      isActive: true,
      permissions: { has: permission },
    },
  });

  if (responsibilities.length === 0) return false;

  // Si tiene permiso a nivel ORGANIZATION, retorna true
  if (responsibilities.some((r) => r.scope === "ORGANIZATION")) {
    return true;
  }

  // Si se especifica resourceId, validar que el recurso pertenece a algún scope
  if (resourceId) {
    // TODO: Implementar validación de recurso por scope
    return true; // Simplificado para MVP
  }

  return true;
}

/**
 * Obtiene suscripciones de alertas del usuario
 */
export async function getUserAlertSubscriptions(userId: string) {
  return await prisma.alertSubscription.findMany({
    where: { userId, isActive: true },
    include: { costCenter: true, team: true },
  });
}

/**
 * Valida que un scope pertenece a la organización del usuario
 */
export async function validateScopeOwnership(orgId: string, scope: string, scopeId: string | null): Promise<boolean> {
  if (scope === "ORGANIZATION") return true;

  if (scope === "COST_CENTER" && scopeId) {
    const center = await prisma.costCenter.findUnique({
      where: { id: scopeId },
      select: { orgId: true },
    });
    return center?.orgId === orgId;
  }

  if (scope === "TEAM" && scopeId) {
    const team = await prisma.team.findUnique({
      where: { id: scopeId },
      select: { orgId: true },
    });
    return team?.orgId === orgId;
  }

  return false;
}
```

---

## 🎯 Resumen de Reglas

| Regla                              | Descripción                             | Impacto                                       |
| ---------------------------------- | --------------------------------------- | --------------------------------------------- |
| **1. Independencia Ver/Notificar** | `AreaResponsible` ≠ `AlertSubscription` | Puedes ver sin recibir, recibir sin gestionar |
| **2. Vista Unificada**             | Múltiples scopes → Vista mezclada       | NO hay selector de contexto                   |
| **3. Prioridad de Scopes**         | OR entre todos los scopes               | No hay jerarquía, se mezclan                  |
| **4. Multi-Tenant**                | SIEMPRE validar `orgId`                 | Seguridad crítica                             |
| **5. Idempotencia**                | `@@unique([employeeId, date, type])`    | Solo UNA alerta por tipo/día                  |
| **6. Cierre Automático**           | Corregir causa → Cerrar alerta          | UX fluida                                     |

---

**Versión:** 1.0
**Última actualización:** 2025-11-20
**Autor:** Sistema ERP TimeNow
**Estado:** 📋 Especificación Oficial - Implementación en Curso 🚀
