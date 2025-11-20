# Sistema de Responsables y Alertas - Plan de Implementación

**Fecha:** 2025-11-20
**Versión:** 1.3
**Estado:** 🚧 EN PROGRESO - FASE 3 COMPLETADA ✅, FASE 4 siguiente

---

## 📚 Índice

1. [Estado de Implementación](#-estado-de-implementación)
2. [Objetivo y Alcance](#objetivo-y-alcance)
3. [Requisitos del Cliente](#requisitos-del-cliente)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [Modelo de Datos](#modelo-de-datos)
6. [Plan de Implementación](#plan-de-implementación)
7. [Casos de Uso](#casos-de-uso)
8. [UI/UX Mockups](#uiux-mockups)

---

## 📊 Estado de Implementación

**Última actualización:** 2025-11-20

| Fase | Estado | Descripción | Tiempo |
|------|--------|-------------|--------|
| **FASE 1** | ✅ **COMPLETADO** | Modelo de datos (Team, relaciones, migración) | 3h |
| **FASE 2** | ✅ **COMPLETADO** | Sistema de visibilidad y filtrado (scope helpers, UI) | 5h |
| **FASE 3** | ✅ **COMPLETADO** | Asignación de Responsables - Centros (server + UI) | 4h |
| **FASE 4** | 🔄 **SIGUIENTE** | Asignación de Responsables - Equipos | 2h est. |
| **FASE 5** | ⏸️ PENDIENTE | Notificaciones In-App | 3h est. |

### 📄 Documentación Técnica

- **[Implementación FASE 1 y FASE 2](./IMPLEMENTACION_RESPONSABLES_FASE1_Y_FASE2.md)** - Modelo de datos + Sistema de visibilidad
- **[Implementación FASE 3 Server](./IMPLEMENTACION_RESPONSABLES_FASE3.md)** - Server actions genéricas
- **[Implementación FASE 3 UI](./IMPLEMENTACION_RESPONSABLES_FASE3_UI.md)** - UI completa de asignación de responsables
- **[Reglas de Negocio](./REGLAS_NEGOCIO_RESPONSABLES_ALERTAS.md)** - Especificación completa del sistema

### ✅ Completado

**FASE 1 - Modelo de Datos:**
- ✅ Modelo `Team` con relaciones completas
- ✅ Migración aplicada con `prisma db push`
- ✅ Extensión de modelos: Employee, CostCenter, Alert

**FASE 2 - Sistema de Visibilidad:**
- ✅ Helpers de permisos (`scope-helpers.ts`)
  - `buildScopeFilter()` - Filtrado por scope con bypass ADMIN/RRHH
  - `getUserAccessibleCostCenters()` - Centros accesibles
  - `getUserAccessibleTeams()` - Equipos accesibles
  - `hasPermission()`, `validateScopeOwnership()`, etc.
- ✅ Server actions con scope filtering
  - `getActiveAlerts()` con filtrado automático
  - `getAlertStats()` con scope
  - `getAvailableAlertFilters()` para UI dinámica
- ✅ UI Dashboard de alertas
  - Filtros dinámicos (centro, equipo, severidad, empleado)
  - Columnas optimizadas con equipo visible
  - Bypass automático para roles globales

**FASE 3 - Asignación de Responsables (Centros) ✅ COMPLETADA:**
- ✅ Server actions genéricas (`area-responsibilities.ts`)
  - `assignResponsibility()` - Asignar con suscripción opcional
  - `removeResponsibility()` - Soft delete
  - `updateResponsibility()` - Actualizar permisos
  - `getResponsiblesForArea()` - Listar responsables
  - `getUserResponsibilities()` - Responsabilidades de usuario
  - `searchUsersForResponsibility()` - Búsqueda de usuarios con filtro de roles
- ✅ Diseño genérico: Funciona con COST_CENTER, TEAM, ORGANIZATION
- ✅ UI completa en `/cost-centers/[id]`
  - Página detalle con tabs (Información, Responsables)
  - Tab Información: Datos readonly del centro
  - Tab Responsables: DataTable con gestión completa
  - `AddResponsibleDialog`: Búsqueda usuario + badges de rol + permisos (grid 2 cols) + suscripción
  - `EditPermissionsDialog`: Editar permisos existentes
  - AlertDialog de confirmación de eliminación
  - Navegación desde lista con "Ver Detalle"
- ✅ **Validaciones implementadas**:
  - No permitir duplicados (mismo usuario + mismo centro)
  - Solo MANAGER y superiores pueden ser responsables
  - Validación multi-tenant (solo usuarios de misma org)
- ✅ **Correcciones de filtros de scope**:
  - Filtro por `employmentContracts` (relación correcta)
  - Funciona con usuarios EMPLOYEE que tienen responsabilidades
- ✅ **Total: 9 archivos** (2 server actions, 6 componentes, 1 modificado)
- ✅ **~1,350 líneas** de código TypeScript/React
- ✅ **Testing manual completado**: Añadir, editar, eliminar responsables funciona correctamente

### 🔄 Siguiente

**FASE 4 - Responsables de Equipos (~2h)**

### ⏸️ Pendiente

**FASE 4: Responsables de Equipos (~2h)**
- Reutilizar server actions (sin cambios necesarios)
- Crear página `/teams/[id]` con tabs
- Crear componentes similares a cost-centers
- Testing completo

**FASE 5: Notificaciones In-App (~3h)**
- Sistema de notificaciones para responsables
- Bell icon con badge de conteo
- Dropdown de notificaciones
- Marcar como leído

**Otras tareas:**
- CRUD de Equipos (prioridad media)

---

## 🎯 Objetivo y Alcance

### Objetivo Principal

Implementar un sistema flexible de **gestión de responsables** y **notificaciones de alertas** que permita:

- Asignar responsables a centros de trabajo y equipos
- Configurar permisos granulares por ámbito
- Notificar alertas automáticamente a los responsables
- Permitir visualización general de alertas con filtros

### Alcance de la Implementación

**Incluido en esta versión:**

- ✅ Modelo de equipos (Team)
- ✅ Asignación de responsables a centros y equipos
- ✅ Permisos configurables por asignación
- ✅ Notificaciones in-app de alertas
- ✅ Dashboard general de alertas con filtros
- ✅ Resumen diario de alertas
- ✅ RRHH Global con acceso total

**NO incluido (futuro):**

- ❌ Notificaciones por email
- ❌ Departamentos como ámbito (solo Centro y Equipo)
- ❌ Más de 2 niveles de jerarquía
- ❌ Configuración avanzada de suscripciones por usuario

---

## 📋 Requisitos del Cliente

### 1. Modelo de Equipos

- **NO existe actualmente** → Crear desde cero
- Estructura: `Centro → Equipos` (2 niveles)
- Un centro puede tener miles de equipos

### 2. Asignación Flexible de Responsables

- Un manager puede tener:
  - **Centro completo** (ve todos los equipos del centro)
  - **Equipos específicos** (selecciona qué equipos gestiona)
- Permisos configurables por cada asignación

### 3. Sistema de Alertas

**Recibir alertas (notificaciones):**

- Solo el manager asignado recibe notificaciones
- Configuración de resumen diario

**Ver alertas (dashboard):**

- Todo el mundo puede ver las alertas
- Filtros por centro/equipo en panel general
- Cada usuario ve solo su ámbito asignado

### 4. Configuración de Responsables

- **En cada Centro:** `/dashboard/cost-centers/[id]` → Pestaña "Responsables"
- **En cada Equipo:** `/dashboard/teams/[id]` → Pestaña "Responsables"

### 5. UI para Equipos

- Selector con búsqueda paginada (no dropdown simple)
- Manejar miles de equipos sin lag

### 6. RRHH Global

- Existe y ve TODO (todos los centros, todos los equipos)
- Scope: `ORGANIZATION`

### 7. Notificaciones

- Solo notificaciones in-app (navbar con contador)
- Resumen diario opcional

### 8. Niveles de Jerarquía

- Por ahora: 2 niveles (Centro → Equipo)
- Futuro: Más niveles (Centro → Zona → Equipo)

---

## 🏗️ Arquitectura del Sistema

### Conceptos Fundamentales

#### 1. **Ámbito (Scope)**

Define el alcance de responsabilidad de un usuario:

```typescript
enum Scope {
  ORGANIZATION  // Ve toda la organización (RRHH Global)
  COST_CENTER   // Ve todo un centro de trabajo
  TEAM          // Ve solo un equipo específico
}
```

#### 2. **Responsable (AreaResponsible)**

Define quién puede **ver y gestionar** datos de un ámbito:

```typescript
{
  userId: "ana_garcia",
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  permissions: ["VIEW_ALERTS", "RESOLVE_ALERTS", "MANAGE_SCHEDULES"]
}
```

#### 3. **Suscripción (AlertSubscription)**

Define quién **recibe notificaciones** de alertas:

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

### Separación de Responsabilidades

```
┌─────────────────────────────────────────────────┐
│ AreaResponsible (Permisos de Gestión)          │
├─────────────────────────────────────────────────┤
│ - Ver datos (empleados, alertas, fichajes)     │
│ - Gestionar horarios                            │
│ - Resolver alertas                              │
│ - Configurar equipos                            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ AlertSubscription (Solo Notificaciones)         │
├─────────────────────────────────────────────────┤
│ - Recibir notificaciones in-app                 │
│ - Filtrar por severidad                         │
│ - Resumen diario opcional                       │
│ - NO da permisos de gestión                     │
└─────────────────────────────────────────────────┘
```

---

## 🗄️ Modelo de Datos

### 1. Team (NUEVO)

```prisma
model Team {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Información básica
  name        String
  description String?
  code        String? // Código único (ej: "VEN-A", "LOG-001")

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Centro al que pertenece
  costCenterId String
  costCenter   CostCenter @relation(fields: [costCenterId], references: [id], onDelete: Cascade)

  // Estado
  isActive Boolean @default(true)

  // Relaciones
  employees          Employee[]          @relation("EmployeeTeam")
  areaResponsibles   AreaResponsible[]   @relation("TeamResponsibles")
  alertSubscriptions AlertSubscription[] @relation("TeamAlertSubscriptions")

  @@unique([orgId, code])
  @@index([orgId])
  @@index([costCenterId])
  @@index([isActive])
  @@map("teams")
}
```

**Justificación:**

- `costCenterId` obligatorio: Todo equipo pertenece a un centro
- `code` único: Para búsquedas rápidas (ej: "LOG-001")
- Sin `teamLeaderId`: Se gestiona con `AreaResponsible`

---

### 2. AreaResponsible (NUEVO)

```prisma
model AreaResponsible {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Usuario responsable
  userId String
  user   User   @relation("UserAreaResponsibilities", fields: [userId], references: [id], onDelete: Cascade)

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Ámbito de responsabilidad (solo uno debe estar presente)
  scope String // "ORGANIZATION" | "COST_CENTER" | "TEAM"

  costCenterId String?
  costCenter   CostCenter? @relation("CostCenterResponsibles", fields: [costCenterId], references: [id], onDelete: Cascade)

  teamId String?
  team   Team?   @relation("TeamResponsibles", fields: [teamId], references: [id], onDelete: Cascade)

  // Permisos específicos para este ámbito (array de strings)
  // Ej: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS", "MANAGE_SCHEDULES"]
  permissions String[]

  // Estado
  isActive Boolean @default(true)

  @@unique([userId, scope, costCenterId, teamId])
  @@index([userId])
  @@index([orgId])
  @@index([costCenterId])
  @@index([teamId])
  @@index([isActive])
  @@map("area_responsibles")
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

---

### 3. AlertSubscription (NUEVO)

```prisma
model AlertSubscription {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Usuario suscrito
  userId String
  user   User   @relation("UserAlertSubscriptions", fields: [userId], references: [id], onDelete: Cascade)

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Ámbito de suscripción (recibe alertas de...)
  scope String // "ORGANIZATION" | "COST_CENTER" | "TEAM"

  costCenterId String?
  costCenter   CostCenter? @relation("CostCenterAlertSubscriptions", fields: [costCenterId], references: [id], onDelete: Cascade)

  teamId String?
  team   Team?   @relation("TeamAlertSubscriptions", fields: [teamId], references: [id], onDelete: Cascade)

  // Configuración de notificaciones (MVP V1: predefinidas)
  severityLevels String[] @default([]) // ["WARNING", "CRITICAL"] (vacío = todas)

  // Canales de notificación
  notifyInApp   Boolean @default(true)  // Notificación en navbar
  notifyByEmail Boolean @default(false) // Email (futuro)

  // Resumen diario
  digestMode Boolean @default(false) // Agrupar en resumen diario
  digestTime String? @default("09:00") // Hora del resumen

  // Estado
  isActive Boolean @default(true)

  @@unique([userId, scope, costCenterId, teamId])
  @@index([userId])
  @@index([orgId])
  @@index([costCenterId])
  @@index([teamId])
  @@index([isActive])
  @@map("alert_subscriptions")
}
```

---

### 4. Extensiones a Modelos Existentes

#### Employee

```prisma
model Employee {
  // ... campos existentes ...

  // NUEVO: Equipo al que pertenece (opcional)
  teamId String?
  team   Team?   @relation("EmployeeTeam", fields: [teamId], references: [id])

  @@index([teamId])
}
```

#### User

```prisma
model User {
  // ... campos existentes ...

  // NUEVO: Responsabilidades
  areaResponsibilities AreaResponsible[] @relation("UserAreaResponsibilities")

  // NUEVO: Suscripciones a alertas
  alertSubscriptions AlertSubscription[] @relation("UserAlertSubscriptions")
}
```

#### CostCenter

```prisma
model CostCenter {
  // ... campos existentes ...

  // NUEVO: Equipos del centro
  teams Team[] @relation

  // NUEVO: Responsables del centro
  areaResponsibles   AreaResponsible[]   @relation("CostCenterResponsibles")
  alertSubscriptions AlertSubscription[] @relation("CostCenterAlertSubscriptions")
}
```

#### Alert

```prisma
model Alert {
  // ... campos existentes ...

  // NUEVO: Relación con equipo (para filtrado)
  teamId String?
  team   Team?   @relation(fields: [teamId], references: [id])

  @@index([teamId])
}
```

---

## 🚀 Plan de Implementación

### FASE 1: Modelo de Datos (2-3 horas)

**Objetivo:** Crear las tablas base del sistema

**Tareas:**

1. Añadir modelo `Team` al schema de Prisma
2. Añadir modelo `AreaResponsible`
3. Añadir modelo `AlertSubscription`
4. Extender `Employee` con campo `teamId`
5. Extender `User`, `CostCenter`, `Alert` con relaciones
6. Migración: `npx prisma migrate dev --name add_teams_and_responsibilities`
7. Verificar migración exitosa

**Entregables:**

- ✅ `schema.prisma` actualizado
- ✅ Migración aplicada a base de datos
- ✅ Tipos de TypeScript regenerados

---

### FASE 2: CRUD de Equipos (4-5 horas)

**Objetivo:** Gestión completa de equipos

**Tareas:**

1. **Server Actions:**
   - `src/server/actions/teams.ts`
     - `getTeams()` - Listar equipos con filtros
     - `getTeamById(id)` - Obtener equipo por ID
     - `createTeam(data)` - Crear equipo
     - `updateTeam(id, data)` - Actualizar equipo
     - `deleteTeam(id)` - Eliminar equipo (soft delete)
     - `getTeamMembers(teamId)` - Empleados del equipo
     - `assignEmployeeToTeam(employeeId, teamId)` - Asignar empleado

2. **UI - Listado de Equipos:**
   - Página: `/dashboard/teams/page.tsx`
   - DataTable con columnas: Nombre, Código, Centro, Nº Empleados, Acciones
   - Filtros: Por centro, búsqueda por nombre/código
   - Botón "Crear Equipo"

3. **UI - Detalle de Equipo:**
   - Página: `/dashboard/teams/[id]/page.tsx`
   - Tabs:
     - "Información": Datos básicos del equipo
     - "Empleados": Listado de empleados del equipo
     - "Responsables": (Implementado en FASE 4)

**Entregables:**

- ✅ Server actions funcionales
- ✅ Página de listado de equipos
- ✅ Página de detalle de equipo
- ✅ CRUD completo

---

### FASE 3: Asignación de Responsables - CENTROS (3-4 horas)

**Objetivo:** Permitir asignar responsables a centros de trabajo

**Tareas:**

1. **Server Actions:**
   - `src/server/actions/area-responsibilities.ts`
     - `assignResponsibility(userId, scope, scopeId, permissions)` - Asignar responsable
     - `removeResponsibility(id)` - Quitar responsabilidad
     - `updateResponsibility(id, permissions)` - Actualizar permisos
     - `getResponsiblesForArea(scope, scopeId)` - Obtener responsables de un ámbito
     - `getUserResponsibilities(userId)` - Obtener ámbitos de un usuario

2. **UI - Pestaña Responsables en Centro:**
   - Ubicación: `/dashboard/cost-centers/[id]/page.tsx` → Nueva pestaña "Responsables"
   - Componente: `ResponsiblesList`
     - Lista de responsables actuales con permisos
     - Botón "Añadir Responsable"
     - Editar permisos inline
     - Eliminar responsable

   - Componente: `AddResponsibleDialog`
     - Selector de usuario (con búsqueda)
     - Checkboxes de permisos
     - Opción "Crear suscripción automática" (checked por defecto)

**Entregables:**

- ✅ Server actions de responsabilidades
- ✅ UI en centros para gestionar responsables
- ✅ Asignación funcional

---

### FASE 4: Asignación de Responsables - EQUIPOS (3-4 horas)

**Objetivo:** Permitir asignar responsables a equipos específicos

**Tareas:**

1. **UI - Pestaña Responsables en Equipo:**
   - Ubicación: `/dashboard/teams/[id]/page.tsx` → Pestaña "Responsables"
   - Reutilizar componentes de FASE 3 (misma UI)

2. **UI - Selector de Equipos (paginado):**
   - Componente: `TeamCombobox` (similar a `employee-combobox.tsx`)
   - Búsqueda con paginación infinita
   - Mostrar: Nombre equipo, código, centro
   - Manejar miles de equipos sin lag

3. **UI - Asignación Múltiple de Equipos:**
   - Componente: `AssignMultipleTeamsDialog`
   - Permite a un manager seleccionar varios equipos a la vez
   - Configurar permisos una sola vez para todos
   - Casos de uso: Manager de zona con 50 equipos

**Entregables:**

- ✅ UI en equipos para gestionar responsables
- ✅ Selector de equipos con búsqueda paginada
- ✅ Asignación múltiple de equipos

---

### FASE 5: Sistema de Filtrado de Alertas (4-5 horas)

**Objetivo:** Filtrar alertas automáticamente según ámbito del usuario

**Tareas:**

1. **Helper de Filtrado:**
   - `src/lib/permissions/scope-filter.ts`
     - `buildScopeFilter(userId)` - Construye filtro de Prisma según responsabilidades
     - `getUserScopes(userId)` - Obtiene ámbitos del usuario
     - `hasPermission(userId, permission)` - Verifica si tiene permiso

2. **Modificar Server Actions de Alertas:**
   - `src/server/actions/alert-detection.ts`
     - Al crear alerta, guardar `teamId` del empleado
     - Llamar a `notifyAlertSubscribers(alert)` automáticamente

   - `src/app/(main)/dashboard/time-tracking/alerts/page.tsx`
     - Aplicar `buildScopeFilter()` en queries
     - Añadir filtros de UI: Por centro, por equipo
     - Selector de centro/equipo con búsqueda paginada

3. **Dashboard General de Alertas:**
   - Todos pueden ver alertas (con filtros)
   - Filtros visibles:
     - Por centro (dropdown)
     - Por equipo (búsqueda paginada)
     - Por severidad
     - Por estado
     - Por fecha
   - Aplicar `buildScopeFilter()` automáticamente:
     - RRHH Global: Ve todas las alertas
     - Manager de Centro: Ve solo su centro
     - Manager de Equipo: Ve solo su equipo

**Entregables:**

- ✅ Helper de filtrado automático
- ✅ Dashboard de alertas con filtros
- ✅ Permisos aplicados correctamente

---

### FASE 6: Notificaciones In-App (5-6 horas)

**Objetivo:** Notificar a responsables cuando se crean alertas

**Tareas:**

1. **Modelo de Notificaciones:**
   - Reutilizar `PtoNotification` existente o crear `Notification` genérico
   - Campos: type, title, message, linkTo, isRead, userId

2. **Server Action de Notificaciones:**
   - `src/server/actions/alert-notifications.ts`
     - `notifyAlertSubscribers(alert)` - Notifica a todos los suscritos
     - `getSubscriptionsForAlert(alert)` - Obtiene suscripciones relevantes
     - `createAlertNotification(userId, alert)` - Crea notificación in-app
     - `markNotificationAsRead(notificationId)` - Marca como leída
     - `getUnreadNotifications(userId)` - Notificaciones sin leer

3. **Lógica de Notificación:**

   ```typescript
   // Al crear alerta en clockIn/clockOut:
   const alert = await detectAlerts(employeeId, date);
   if (alert) {
     await notifyAlertSubscribers(alert); // ← NUEVO
   }
   ```

   ```typescript
   // notifyAlertSubscribers() busca:
   // 1. Suscripciones al equipo del empleado
   // 2. Suscripciones al centro del empleado
   // 3. Suscripciones a nivel organización (RRHH)
   // 4. Filtra por severidad según config
   // 5. Crea notificación in-app para cada usuario
   ```

4. **UI - Campanita en Navbar:**
   - Componente: `AlertsBell` (ya existe en `src/components/alerts/alerts-bell.tsx`)
   - Mejorar para mostrar contador de notificaciones sin leer
   - Panel desplegable con últimas notificaciones
   - Link a dashboard de alertas

5. **Resumen Diario (Cron Job):**
   - Script: `scripts/send-daily-alert-digest.ts`
   - Ejecutar diariamente a las 9:00 AM
   - Agrupa alertas del día anterior por usuario
   - Envía notificación resumen:
     - "Resumen de ayer: 15 alertas críticas, 8 warnings"
     - Link al dashboard filtrado

**Entregables:**

- ✅ Sistema de notificaciones in-app
- ✅ Campanita en navbar con contador
- ✅ Notificaciones automáticas al crear alertas
- ✅ Resumen diario (cron)

---

## 📝 Casos de Uso

### Caso 1: Manager de Centro Completo

**Usuario:** Ana García
**Asignación:**

```typescript
{
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS", "MANAGE_SCHEDULES"]
}
```

**Suscripción:**

```typescript
{
  scope: "COST_CENTER",
  costCenterId: "madrid_norte",
  severityLevels: ["CRITICAL", "WARNING"],
  notifyInApp: true,
  digestMode: false
}
```

**Comportamiento:**

- ✅ Ve todos los empleados de Madrid Norte (todos los equipos)
- ✅ Ve todas las alertas de Madrid Norte
- ✅ Puede resolver alertas de su centro
- ✅ Recibe notificaciones inmediatas de alertas CRITICAL y WARNING
- ❌ NO ve empleados de otros centros

---

### Caso 2: Manager de Equipos Específicos

**Usuario:** Carlos Ruiz
**Asignación 1:**

```typescript
{
  scope: "TEAM",
  teamId: "team_ventas_a",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS"]
}
```

**Asignación 2:**

```typescript
{
  scope: "TEAM",
  teamId: "team_ventas_b",
  permissions: ["VIEW_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS"]
}
```

**Comportamiento:**

- ✅ Ve empleados solo de Equipo Ventas A y Ventas B
- ✅ Ve alertas solo de esos 2 equipos
- ✅ Puede resolver alertas de sus equipos
- ✅ Recibe notificaciones de sus 2 equipos
- ❌ NO ve otros equipos del mismo centro

---

### Caso 3: RRHH Global

**Usuario:** María López (role: HR_ADMIN)
**Asignación:**

```typescript
{
  scope: "ORGANIZATION",
  permissions: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "VIEW_ALERTS", "RESOLVE_ALERTS", "APPROVE_PTO_REQUESTS"]
}
```

**Comportamiento:**

- ✅ Ve TODOS los empleados de la organización
- ✅ Ve TODAS las alertas (todos los centros, todos los equipos)
- ✅ Puede gestionar cualquier cosa
- ✅ Recibe notificaciones de todas las alertas CRITICAL
- ✅ Puede filtrar por centro/equipo si quiere

---

### Caso 4: Usuario sin Responsabilidades

**Usuario:** Pedro Gómez (empleado normal)
**Asignación:** Ninguna

**Comportamiento:**

- ✅ Puede ver dashboard general de alertas (con filtros)
- ✅ Los filtros muestran todos los centros/equipos
- ✅ Puede ver las alertas aplicando filtros
- ❌ NO recibe notificaciones (no está suscrito)
- ❌ NO puede resolver alertas (no tiene permisos)

---

## 🎨 UI/UX Mockups

### 1. Configuración de Responsables - Centro

**Ubicación:** `/dashboard/cost-centers/[id]` → Pestaña "Responsables"

```
┌────────────────────────────────────────────────────────┐
│ 🏢 Centro de Trabajo: Madrid Norte                     │
├────────────────────────────────────────────────────────┤
│ [Información] [Empleados] [Responsables*] [Equipos]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 👥 Responsables de este centro                        │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 👤 Ana García                                    │  │
│ │    Permisos: ✅ Ver empleados                    │  │
│ │              ✅ Gestionar horarios               │  │
│ │              ✅ Ver alertas                      │  │
│ │              ✅ Resolver alertas                 │  │
│ │    Notificaciones: 🔔 In-App                    │  │
│ │    [Editar Permisos] [Eliminar]                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 👤 Carlos Ruiz                                   │  │
│ │    Permisos: ✅ Ver empleados                    │  │
│ │              ✅ Ver alertas                      │  │
│ │              ❌ Resolver alertas                 │  │
│ │    Notificaciones: 🔕 Sin notificaciones        │  │
│ │    [Editar Permisos] [Eliminar]                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ [+ Añadir Responsable]                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

### 2. Selector de Equipos (Paginado)

**Componente:** `TeamCombobox`

```
┌────────────────────────────────────────────────────────┐
│ Seleccionar Equipos                                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│ [🔍 Buscar equipo por nombre o código...]             │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ ✓ Equipo Ventas A (VEN-A) - Madrid Norte        │  │
│ │ ✓ Equipo Ventas B (VEN-B) - Madrid Norte        │  │
│ │   Equipo Logística 1 (LOG-001) - Madrid Norte   │  │
│ │   Equipo Logística 2 (LOG-002) - Madrid Norte   │  │
│ │   Equipo IT Backend (IT-BACK) - Barcelona       │  │
│ │                                                  │  │
│ │   ... cargando más resultados ...               │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Equipos seleccionados: 2                              │
│                                                        │
│ [Cancelar]  [Asignar Equipos]                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

### 3. Dashboard de Alertas con Filtros

**Ubicación:** `/dashboard/time-tracking/alerts`

```
┌────────────────────────────────────────────────────────┐
│ 🚨 Alertas de Fichajes                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Filtros:                                              │
│ [🏢 Centro: Todos ▼] [👥 Equipo: Buscar... ▼]       │
│ [⚠️ Severidad: Todas ▼] [📅 Fecha: Hoy ▼]           │
│                                                        │
├────────────────────────────────────────────────────────┤
│ Empleado        | Centro       | Equipo   | Alerta   │
├────────────────────────────────────────────────────────┤
│ Juan Pérez      | Madrid Norte | VEN-A    | 🔴 Entrada│
│ 19/11/2025      |              |          | tarde: 35 │
│                 |              |          | minutos   │
│                 |              |          | [Resolver]│
├────────────────────────────────────────────────────────┤
│ Laura García    | Madrid Norte | LOG-001  | ⚠️ Salida │
│ 19/11/2025      |              |          | temprana: │
│                 |              |          | 20 minutos│
│                 |              |          | [Resolver]│
├────────────────────────────────────────────────────────┤
│ ...                                                    │
└────────────────────────────────────────────────────────┘
```

---

### 4. Campanita de Notificaciones

**Componente:** Navbar → `AlertsBell`

```
┌────────────────────────────────────────────────────────┐
│ [Logo] TimeNow ERP                             🔔 (3) │
│                                                        │
│ Dashboard | Empleados | Alertas | ...         [👤]   │
└────────────────────────────────────────────────────────┘
                                                     ↓
                                    (Al hacer clic en 🔔)
                                    ┌──────────────────────┐
                                    │ 🔔 Notificaciones    │
                                    ├──────────────────────┤
                                    │ 🔴 Juan Pérez llegó  │
                                    │    tarde: 35 min     │
                                    │    Hace 5 min        │
                                    ├──────────────────────┤
                                    │ ⚠️ Laura García      │
                                    │    salió temprano    │
                                    │    Hace 15 min       │
                                    ├──────────────────────┤
                                    │ 🔴 Pedro López       │
                                    │    llegó tarde       │
                                    │    Hace 1 hora       │
                                    ├──────────────────────┤
                                    │ [Ver todas]          │
                                    └──────────────────────┘
```

---

## 🔒 Consideraciones de Seguridad

### 1. Multi-Tenancy SIEMPRE

**Regla obligatoria:** TODAS las queries DEBEN filtrar por `orgId`

```typescript
// ❌ INCORRECTO - Fuga de datos
const teams = await prisma.team.findMany();

// ✅ CORRECTO - Filtra por organización
const teams = await prisma.team.findMany({
  where: { orgId: session.user.orgId },
});
```

### 2. Validación de Permisos en Server Actions

**Template de server action seguro:**

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
    throw new Error("No tienes permiso para acceder a esta alerta");
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

### 3. Índices de Base de Datos

**CRÍTICO para rendimiento con miles de equipos:**

```prisma
model Team {
  @@index([orgId])           // Multi-tenant
  @@index([costCenterId])    // Filtrar por centro
  @@index([isActive])        // Solo equipos activos
  @@index([orgId, code])     // Búsqueda rápida por código
}

model AreaResponsible {
  @@index([userId])          // Responsabilidades de un usuario
  @@index([costCenterId])    // Responsables de un centro
  @@index([teamId])          // Responsables de un equipo
  @@index([isActive])        // Solo activos
}

model AlertSubscription {
  @@index([userId])          // Suscripciones de un usuario
  @@index([costCenterId])    // Suscritos a un centro
  @@index([teamId])          // Suscritos a un equipo
  @@index([isActive])        // Solo activas
}
```

---

## 📈 Rendimiento y Escalabilidad

### 1. Búsqueda Paginada de Equipos

**Problema:** Centro con 10,000 equipos → Dropdown simple no sirve

**Solución:** Búsqueda con paginación infinita

```typescript
// Server action
export async function searchTeams(query: string, page: number = 1, limit: number = 50) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const teams = await prisma.team.findMany({
    where: {
      orgId: session.user.orgId,
      isActive: true,
      OR: [{ name: { contains: query, mode: "insensitive" } }, { code: { contains: query, mode: "insensitive" } }],
    },
    include: {
      costCenter: { select: { name: true } },
      _count: { select: { employees: true } },
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { name: "asc" },
  });

  return teams;
}
```

### 2. Cacheo de Responsabilidades

**Problema:** `buildScopeFilter()` se ejecuta en cada query → puede ser lento

**Solución:** Cachear responsabilidades del usuario en sesión

```typescript
// Almacenar en sesión o Redis
interface UserSession {
  userId: string;
  orgId: string;
  responsibilities: {
    hasOrganizationScope: boolean;
    costCenterIds: string[];
    teamIds: string[];
    permissions: Permission[];
  };
}
```

---

## ✅ Checklist de Implementación

### FASE 1: Modelo de Datos

- [ ] Añadir modelo `Team` al schema
- [ ] Añadir modelo `AreaResponsible`
- [ ] Añadir modelo `AlertSubscription`
- [ ] Extender modelos existentes
- [ ] Crear migración de Prisma
- [ ] Verificar migración exitosa

### FASE 2: CRUD de Equipos

- [ ] Server actions de equipos
- [ ] Página de listado de equipos
- [ ] Página de detalle de equipo
- [ ] Dialog crear/editar equipo
- [ ] Asignar empleados a equipos

### FASE 3: Responsables de Centros

- [ ] Server actions de responsabilidades
- [ ] Pestaña "Responsables" en centros
- [ ] Dialog añadir responsable
- [ ] Editar permisos
- [ ] Eliminar responsable

### FASE 4: Responsables de Equipos

- [ ] Componente `TeamCombobox` (paginado)
- [ ] Pestaña "Responsables" en equipos
- [ ] Asignación múltiple de equipos
- [ ] Dialog de configuración

### FASE 5: Filtrado de Alertas

- [ ] Helper `buildScopeFilter()`
- [ ] Helper `checkPermission()`
- [ ] Aplicar filtrado en dashboard de alertas
- [ ] Añadir filtros de UI (centro/equipo)
- [ ] Guardar `teamId` en alertas

### FASE 6: Notificaciones In-App

- [ ] Server action `notifyAlertSubscribers()`
- [ ] Crear notificaciones al detectar alertas
- [ ] Componente `AlertsBell` mejorado
- [ ] Panel de notificaciones
- [ ] Marcar como leídas
- [ ] Script de resumen diario

---

## 📚 Referencias

- [Documentación Arquitectónica](./SISTEMA_PERMISOS_Y_AMBITOS.md) - Diseño completo del sistema
- [Sistema de Alertas Actual](./SISTEMA_ALERTAS_FICHAJES.md) - Detección de alertas
- [Prisma Docs](https://www.prisma.io/docs) - ORM y migraciones

---

## 🎯 Próximos Pasos

### ✅ Completado

1. ✅ Implementar FASE 1 (Modelo de Datos) - **HECHO**
2. ✅ Testing de migración - **HECHO**
3. ✅ Implementar FASE 2 (Visibilidad y Filtrado) - **HECHO**
4. ✅ Documentación técnica FASE 1-2 - **HECHO**
5. ✅ Server Actions genéricas para responsabilidades - **HECHO**
6. ✅ Documentación técnica FASE 3 - **HECHO**

### 🔄 Actual - FASE 3 UI (3.5h restantes)

**Orden de implementación:**

1. ⏸️ **Server Action** `getCostCenterById()` (15 min)
   - Obtener centro con contador de empleados y responsables
   - Include relaciones necesarias

2. ⏸️ **Página detalle** `/cost-centers/[id]/page.tsx` (30 min)
   - PermissionGuard
   - Header con navegación
   - Tarjetas resumen
   - Tabs (Información, Responsables)

3. ⏸️ **Tab Información** (dentro de page.tsx - 15 min)
   - Datos básicos del centro (readonly)

4. ⏸️ **Lista de responsables** `responsibles-list.tsx` (45 min)
   - DataTable con TanStack Table
   - Columnas: Usuario, Permisos, Fecha, Acciones
   - Estado vacío

5. ⏸️ **Dialog añadir** `add-responsible-dialog.tsx` (45 min)
   - Combobox búsqueda usuarios
   - Checkboxes permisos (grid 2 cols)
   - Switch suscripción automática

6. ⏸️ **Dialog editar** `edit-permissions-dialog.tsx` (30 min)
   - Usuario readonly
   - Permisos precargados

7. ⏸️ **Actualizar listado** de centros (15 min)
   - Añadir columna "Acciones" con link a detalle

8. ⏸️ **Testing** completo (30 min)
   - Asignar responsable
   - Editar permisos
   - Eliminar responsabilidad
   - Verificar filtrado funciona

### ⏸️ Siguiente (FASE 4) - 2h estimado

- ✅ Reutilizar server actions sin cambios (ya genéricas)
- Página `/teams/[id]` con tabs
- Copiar componentes UI cambiando scope a "TEAM"
- `TeamCombobox` paginado para selección

---

**Versión:** 1.1
**Última actualización:** 2025-11-20
**Autor:** Sistema de Planificación ERP TimeNow
**Estado:** 🚧 EN PROGRESO - Fases 1-2 COMPLETADAS, FASE 3 en curso
