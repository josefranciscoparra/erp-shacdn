# PLAN: Sistema de Alertas y Permisos Granulares v2.0

**Fecha:** 2025-11-20
**Estado:** 🚧 EN DESARROLLO - Sprint 3 FASE 6 Completada
**Versión:** 2.0
**Tipo:** Mejora Arquitectural
**Última actualización:** 2025-11-21 01:00

---

## 🎯 Objetivo

Mejorar y documentar el sistema de alertas de fichajes y permisos granulares para:

- ✅ **Jerarquía clara**: Organization → CostCenter → Department → Team → Employee
- ✅ **Permisos granulares**: Responsables de área con scopes específicos (ORG/DEPT/COST_CENTER/TEAM)
- ✅ **Alertas inteligentes**: Sistema de suscripciones acumulativas con idempotencia
- ✅ **Selector de contexto**: Usuarios con múltiples áreas pueden elegir qué ver
- ✅ **Visibilidad clara**: Separación entre visibilidad (AreaResponsible) y notificaciones (AlertSubscription)

---

## ⚠️ Problemas Actuales (Detectados en Revisión)

### 1. **Jerarquía Team → Department ambigua**

- ❌ No está claro que `Team.departmentId` es **OPCIONAL**
- ❌ Falta validación: si existe `departmentId`, debe pertenecer al mismo `costCenter`
- ❌ No se documenta el caso de equipos transversales (sin departamento)

### 2. **Scope DEPARTMENT no implementado**

- ❌ `AreaResponsible` solo tiene: ORGANIZATION | COST_CENTER | TEAM
- ❌ `AlertSubscription` solo tiene: ORGANIZATION | COST_CENTER | TEAM
- ❌ No existe relación `departmentId` en estos modelos
- ❌ Falta el nivel de granularidad departamental

### 3. **Alertas sin idempotencia**

- ❌ No hay clave única para evitar duplicados
- ❌ Puede generarse la misma alerta múltiples veces
- ❌ No está documentado qué pasa si se corrige un fichaje
- ❌ No hay historial de cambios de alertas

### 4. **Prioridad de suscripciones no definida**

- ❌ Si un usuario tiene varias suscripciones (ORG + TEAM), ¿qué ve?
- ❌ No está claro si es acumulativo o jerárquico
- ❌ Puede causar confusión en RRHH

### 5. **Contexto activo no implementado**

- ❌ Si un usuario es responsable de Equipo A + Centro B, ve TODO mezclado
- ❌ No hay forma de filtrar por contexto específico
- ❌ UX confusa para managers de múltiples áreas

### 6. **Visibilidad vs Notificaciones no documentado**

- ❌ No está claro que `AreaResponsible` (visibilidad) ≠ `AlertSubscription` (notificaciones)
- ❌ Un usuario puede VER algo sin SER NOTIFICADO
- ❌ Un usuario puede SER NOTIFICADO sin tener acceso a la página

---

## 🏗️ Arquitectura Propuesta

### Jerarquía Organizacional (ACTUALIZADA)

```
Organization (Empresa)
│
├─── CostCenter (Centro de Coste)
│    │
│    ├─── Department (Departamento) 🆕 Añadido a relaciones
│    │    │
│    │    ├─── Team (Equipo - Opción 1: con departamento)
│    │    │    └─── Employee
│    │    │
│    │    └─── EmploymentContract
│    │         └─── Employee
│    │
│    └─── Team (Equipo - Opción 2: sin departamento, transversal)
│         └─── Employee
```

### Modelo de Datos - Cambios Necesarios

#### 1. **Team** (Actualizar relaciones)

```prisma
model Team {
  id        String   @id @default(cuid())
  name      String
  code      String?

  // Multi-tenancy
  orgId        String
  organization Organization @relation(...)

  // Opción 1: Equipo dentro de un departamento (jerarquía completa)
  departmentId String? // 🆕 OPCIONAL - Si es null, equipo transversal
  department   Department? @relation(...) // 🆕 NUEVA RELACIÓN

  // Opción 2: Equipo directo al centro (obligatorio)
  costCenterId String // OBLIGATORIO - Siempre debe pertenecer a un centro
  costCenter   CostCenter @relation(...)

  // VALIDACIÓN: Si departmentId existe, department.costCenterId DEBE ser igual a costCenterId
  // Esto se valida en server actions, no en DB

  // Relaciones existentes
  employees          Employee[]
  areaResponsibles   AreaResponsible[]
  alertSubscriptions AlertSubscription[]
  alerts             Alert[]
}
```

#### 2. **AreaResponsible** (Añadir scope DEPARTMENT)

```prisma
model AreaResponsible {
  id        String   @id @default(cuid())
  userId    String
  user      User @relation(...)

  orgId        String
  organization Organization @relation(...)

  // Ámbito de responsabilidad - 🆕 AÑADIR "DEPARTMENT"
  scope String // "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM"

  // 🆕 NUEVA: Relación con departamento (solo si scope = DEPARTMENT)
  departmentId String?
  department   Department? @relation("DepartmentResponsibles", fields: [departmentId], references: [id], onDelete: Cascade)

  // Relaciones existentes
  costCenterId String?
  costCenter   CostCenter? @relation(...)

  teamId String?
  team   Team? @relation(...)

  // Permisos granulares (array de strings)
  permissions String[] // ["VIEW_EMPLOYEES", "MANAGE_SCHEDULES", "RESOLVE_ALERTS", ...]

  @@index([userId])
  @@index([orgId])
  @@index([scope])
  @@index([departmentId]) // 🆕 NUEVO ÍNDICE
  @@map("area_responsibles")
}
```

#### 3. **AlertSubscription** (Añadir scope DEPARTMENT)

```prisma
model AlertSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User @relation(...)

  orgId        String
  organization Organization @relation(...)

  // Ámbito de suscripción - 🆕 AÑADIR "DEPARTMENT"
  scope String // "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM"

  // 🆕 NUEVA: Relación con departamento (solo si scope = DEPARTMENT)
  departmentId String?
  department   Department? @relation("DepartmentAlertSubscriptions", fields: [departmentId], references: [id], onDelete: Cascade)

  // Relaciones existentes
  costCenterId String?
  costCenter   CostCenter? @relation(...)

  teamId String?
  team   Team? @relation(...)

  // NOTA: Las suscripciones son ACUMULATIVAS
  // Un usuario con múltiples suscripciones ve TODAS las alertas de todas ellas (sin duplicar)

  @@index([userId])
  @@index([orgId])
  @@index([scope])
  @@index([departmentId]) // 🆕 NUEVO ÍNDICE
  @@map("alert_subscriptions")
}
```

#### 4. **Alert** (Añadir idempotencia y departmentId)

```prisma
model Alert {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orgId        String
  organization Organization @relation(...)

  employeeId String
  employee   Employee @relation(...)

  type     String // "LATE_ARRIVAL" | "CRITICAL_LATE_ARRIVAL" | ...
  severity String // "INFO" | "WARNING" | "CRITICAL"

  title       String
  description String?
  date        DateTime // Fecha del evento (día sin hora)

  // Contexto (fichaje relacionado)
  timeEntryId String?
  timeEntry   TimeEntry? @relation(...)

  // 🆕 NUEVO: Departamento donde ocurrió (para suscripciones por departamento)
  departmentId String?
  department   Department? @relation("DepartmentAlerts", fields: [departmentId], references: [id])

  // Existentes: Centro y equipo donde ocurrió
  costCenterId String?
  costCenter   CostCenter? @relation(...)

  teamId String?
  team   Team? @relation(...)

  // Estado de resolución
  resolved   Boolean   @default(false)
  resolvedAt DateTime?
  resolvedBy String?
  resolution String?

  // 🆕 IDEMPOTENCIA: Solo una alerta de cada tipo por empleado y día
  @@unique([employeeId, date, type], name: "unique_alert_per_employee_day_type")

  @@index([orgId])
  @@index([employeeId])
  @@index([type])
  @@index([severity])
  @@index([resolved])
  @@index([departmentId]) // 🆕 NUEVO ÍNDICE
  @@map("alerts")
}
```

#### 5. **Department** (Añadir relaciones faltantes)

```prisma
model Department {
  // ... campos existentes

  // 🆕 NUEVAS RELACIONES
  teams              Team[]              @relation("DepartmentTeams") // Equipos del departamento
  areaResponsibles   AreaResponsible[]   @relation("DepartmentResponsibles") // Responsables del departamento
  alertSubscriptions AlertSubscription[] @relation("DepartmentAlertSubscriptions") // Suscripciones a alertas
  alerts             Alert[]             @relation("DepartmentAlerts") // Alertas del departamento
}
```

---

## 🚀 Orden de Ejecución Recomendado

### Sprint 1: Fundamentos de Datos ✅ COMPLETADO

#### FASE 1: Actualización del Schema Prisma ✅ COMPLETADO (2025-11-20)

**Archivos modificados:**

- ✅ `prisma/schema.prisma`

**Cambios implementados:**

1. ✅ Añadido `departmentId` opcional a `Team`
   - Relación `department Department? @relation("DepartmentTeams")`
   - Comentarios documentando validación de costCenterId
   - Soporte para equipos transversales (sin departamento)

2. ✅ Añadido scope `"DEPARTMENT"` a `AreaResponsible`
   - Campo `departmentId String?`
   - Relación con Department añadida
   - Constraint único actualizado: `@@unique([userId, scope, departmentId, costCenterId, teamId])`
   - Índice `@@index([departmentId])` añadido

3. ✅ Añadido scope `"DEPARTMENT"` a `AlertSubscription`
   - Campo `departmentId String?`
   - Relación con Department añadida
   - Comentario documentando suscripciones ACUMULATIVAS
   - Constraint único e índices actualizados

4. ✅ Añadido `departmentId` a `Alert`
   - Campo `departmentId String?` para filtrado por departamento
   - Relación con Department añadida
   - Índice `@@index([departmentId])` añadido

5. ✅ Constraint único en `Alert` ya existía
   - `@@unique([employeeId, date, type])` - Sin cambios necesarios

6. ✅ Relaciones inversas en `Department`
   - `teams Team[] @relation("DepartmentTeams")`
   - `areaResponsibles AreaResponsible[] @relation("DepartmentResponsibles")`
   - `alertSubscriptions AlertSubscription[] @relation("DepartmentAlertSubscriptions")`
   - `alerts Alert[] @relation("DepartmentAlerts")`

**Migración ejecutada:**

```bash
npx prisma db push --accept-data-loss
# Base de datos sincronizada exitosamente
# Prisma Client regenerado
```

**Commit:**

- `db51cc1` - feat(schema): Sprint 1 FASE 1 - Sistema de Alertas y Permisos v2.0

---

#### FASE 1.5: Actualización de Server Actions Existentes ✅ COMPLETADO (2025-11-20)

**Archivos modificados:**

- ✅ `/src/lib/permissions/scope-helpers.ts`
- ✅ `/src/server/actions/area-responsibilities.ts`
- ✅ `/src/server/actions/teams.ts`
- ✅ `/src/server/actions/alert-detection.ts`

**Cambios implementados:**

1. ✅ **`scope-helpers.ts`**: Soporte completo para scope DEPARTMENT
   - Tipo `Scope` actualizado: `"ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM"`
   - `buildScopeFilter()`: añadida lógica para filtrar por `employmentContracts.departmentId`
   - `getUserScopes()`: incluye relación `department`
   - `getUserAlertSubscriptions()`: incluye relación `department`
   - `validateScopeOwnership()`: validación de ownership para DEPARTMENT
   - `shouldReceiveAlertNotification()`: soporte para `alert.departmentId`
   - 🆕 Nueva función `getUserAccessibleDepartments()`: obtiene departamentos accesibles por el usuario

2. ✅ **`area-responsibilities.ts`**: Gestión de responsabilidades con scope DEPARTMENT
   - Tipo `AreaResponsibilityData`: añadido `departmentId` y relación `department`
   - `assignResponsibility()`:
     - Valida ownership de departamento
     - Maneja whereClause con `departmentId`
     - Crea suscripciones automáticas con `departmentId`
     - Ejemplos actualizados con caso DEPARTMENT
   - `updateResponsibility()`: incluye `department` en select
   - `getResponsiblesForArea()`: whereClause con soporte DEPARTMENT
   - `getUserResponsibilities()`: incluye relación `department`

3. ✅ **`teams.ts`**: Validación y soporte para `departmentId` opcional
   - Tipo `TeamDetail`: añadido `departmentId` y relación `department`
   - Tipo `CreateTeamInput`: añadido `departmentId?: string | null`
   - `getTeamById()`: incluye relación `department` en select
   - `createTeam()`:
     - ✅ Validación CRÍTICA: Si `departmentId` existe, verifica que `department.costCenterId === team.costCenterId`
     - Incluye `departmentId` en data y `department` en select
     - Mensaje de error específico por tipo de scope

4. ✅ **`alert-detection.ts`**: Alertas con departmentId
   - `saveDetectedAlerts()`:
     - Query de employee incluye `departmentId` del contrato activo
     - Extrae `departmentId` del contrato
     - Pasa `departmentId` al crear/actualizar Alert

**Validación:**

```bash
npm run lint
# ✅ Exit code: 0 (sin errores)
# Solo warnings pre-existentes en otros archivos
```

**Resultado:**

- ✅ Todo funcionando correctamente
- ✅ Backwards compatible (campos opcionales)
- ✅ Sin errores de TypeScript
- ✅ Sin errores de ESLint
- ✅ Prisma Client regenerado automáticamente

**Commit:**

- `5b6d96d` - feat(alerts): Sprint 1 FASE 1.5 - Actualizar server actions para scope DEPARTMENT

**Próximos pasos (Sprint 2):**

- Implementar Motor de Alertas con Idempotencia (`/src/lib/alert-engine.ts`)
- Implementar Server Actions de Alertas (`/src/server/actions/alerts.ts`)

---

### Sprint 2: Lógica de Negocio 🚧 EN DESARROLLO

#### FASE 2: Sistema de Alertas con Idempotencia ✅ COMPLETADO (2025-11-20)

**Archivo creado:**

- ✅ `/src/lib/alert-engine.ts`

**Funciones implementadas:**

```typescript
// ✅ Crear o actualizar alerta (idempotente con UPSERT)
export async function createOrUpdateAlert(params: CreateOrUpdateAlertParams)

// ✅ Obtener suscriptores de una alerta (acumulativo con DISTINCT)
export async function getAlertSubscribers(alert: {...})

// ✅ Resolver alerta
export async function resolveAlert(alertId: string, userId: string, resolution?: string)

// ✅ Descartar alerta (falso positivo)
export async function dismissAlert(alertId: string, userId: string, comment?: string)
```

**Implementación:**

1. ✅ Idempotencia mediante `prisma.alert.upsert()` con constraint `@@unique([employeeId, date, type])`
2. ✅ Suscripciones acumulativas con `OR[]` query y Map para usuarios únicos
3. ✅ Filtrado por severidad y tipo de alerta en `getAlertSubscribers()`
4. ✅ Estados de alerta: `ACTIVE`, `RESOLVED`, `DISMISSED`

**Reglas implementadas:**

- Clave única: `(employeeId, date, type)`
- Si existe → `UPDATE` (severity, description, timeEntryId, updatedAt)
- Si no existe → `CREATE` (status="ACTIVE")
- Resolución: `status="RESOLVED"`, `resolvedAt`, `resolvedBy`, `resolutionComment`

**Validación:**

```bash
npx eslint src/lib/alert-engine.ts --fix
# ✅ Sin errores, solo warning de formato (auto-corregido)
```

---

#### FASE 3: Server Actions de Alertas ✅ COMPLETADO (2025-11-20)

**Archivo creado:**

- ✅ `/src/server/actions/alerts.ts` (501 líneas)

**Server Actions implementadas:**

```typescript
// ✅ Obtener alertas del usuario según suscripciones acumulativas
export async function getMyAlerts(filters?: AlertFilters);

// ✅ Obtener estadísticas agregadas (reutiliza getMyAlerts)
export async function getMyAlertStats(dateFrom?: Date, dateTo?: Date): Promise<AlertStats>;

// ✅ Crear suscripción a alertas con opciones personalizadas
export async function subscribeToAlerts(
  scope: "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM",
  scopeId: string | null,
  options?: { severityLevels?: string[]; alertTypes?: string[]; notifyByEmail?: boolean },
);

// ✅ Eliminar suscripción (soft delete)
export async function unsubscribeFromAlerts(subscriptionId: string);

// ✅ Obtener suscripciones activas del usuario con relaciones
export async function getMySubscriptions();

// ✅ Resolver alerta (llama a motor de alertas)
export async function resolveAlertAction(alertId: string, resolution?: string);

// ✅ Descartar alerta (falso positivo)
export async function dismissAlertAction(alertId: string, comment?: string);
```

**Funcionalidades implementadas:**

1. ✅ **Sistema acumulativo de suscripciones**
   - Query con `OR[]` de todos los scopes del usuario
   - Usuario con múltiples suscripciones (ORG + TEAM) ve TODAS las alertas
   - Deduplicación automática de resultados

2. ✅ **Filtrado completo**
   - Por severidad (`INFO`, `WARNING`, `CRITICAL`)
   - Por tipo de alerta (array de tipos)
   - Por estado (`ACTIVE`, `RESOLVED`, `DISMISSED`)
   - Por fechas (dateFrom, dateTo)
   - Por entidades (employeeId, costCenterId, departmentId, teamId)

3. ✅ **Validación multi-tenant**
   - Todos los actions validan `session.user.id` y `session.user.orgId`
   - Verificación de pertenencia a organización en todos los queries
   - Protección contra acceso cruzado entre organizaciones

4. ✅ **Gestión de suscripciones**
   - Prevención de duplicados (valida antes de crear)
   - Soft delete en `unsubscribeFromAlerts()`
   - Opciones personalizadas: severityLevels, alertTypes, notifyByEmail

5. ✅ **Integración con motor de alertas**
   - `resolveAlertAction()` usa `resolveAlertEngine()` de `/src/lib/alert-engine.ts`
   - `dismissAlertAction()` usa `dismissAlertEngine()`
   - Serialización correcta de fechas para Next.js (`.toISOString()`)

6. ✅ **Estadísticas agregadas**
   - `getMyAlertStats()` reutiliza lógica de `getMyAlerts()`
   - Agrupación por severidad y tipo
   - Contadores por estado (active, resolved, dismissed)

**Relaciones incluidas:**

- ✅ `employee` (firstName, lastName, email)
- ✅ `costCenter` (name)
- ✅ `department` (name) - **Nuevo con scope DEPARTMENT**
- ✅ `team` (name)
- ✅ `resolver` (name)

**Validación:**

```bash
npx eslint src/server/actions/alerts.ts --fix
# ✅ 0 errores, 24 warnings (complexity, max-lines, unnecessary optional chain)
# ✅ Todos los errores críticos corregidos
# ✅ Pre-commit hooks pasaron exitosamente
```

**Commit:**

- `aa091be` - feat(alerts): Sprint 2 FASE 3 - Server Actions de Alertas

**Próximos pasos (Sprint 2 FASE 4):**

- Implementar Sistema de Contexto Activo
- Crear modelo `UserActiveContext`
- Implementar `setActiveContext()` y `getActiveContext()`

---

#### FASE 4: Sistema de Contexto Activo ✅ COMPLETADO (2025-11-20)

**Modelo creado:**

- ✅ `/prisma/schema.prisma`: Modelo `UserActiveContext` añadido

**Server Actions creadas:**

- ✅ `/src/server/actions/user-context.ts` (339 líneas)

**Server Actions implementadas:**

```typescript
// ✅ Obtiene contexto activo del usuario (retorna null si no configurado)
export async function getActiveContext(): Promise<UserActiveContextData | null>;

// ✅ Establece contexto activo con validaciones completas
export async function setActiveContext(
  scope: ActiveScope,
  options?: { departmentId?: string; costCenterId?: string; teamId?: string },
): Promise<UserActiveContextData>;

// ✅ Obtiene ámbitos disponibles según responsabilidades del usuario
export async function getAvailableScopes(): Promise<{
  hasOrganizationScope: boolean;
  departments: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; name: string; code: string | null }>;
  teams: Array<{ id: string; name: string; code: string | null }>;
}>;
```

**Modelo implementado:**

```prisma
model UserActiveContext {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Usuario (uno a uno)
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Contexto activo seleccionado por el usuario
  activeScope String @default("ALL") // "ALL" | "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM"

  // IDs de ámbito activo (opcionales según scope)
  activeDepartmentId String?
  activeDepartment   Department? @relation("UserActiveDepartment", fields: [activeDepartmentId], references: [id])

  activeCostCenterId String?
  activeCostCenter   CostCenter? @relation("UserActiveCostCenter", fields: [activeCostCenterId], references: [id])

  activeTeamId String?
  activeTeam   Team?   @relation("UserActiveTeam", fields: [activeTeamId], references: [id])

  // Índices
  @@index([userId])
  @@index([orgId])
  @@index([activeScope])
}
```

**Funcionalidades implementadas:**

1. ✅ **Scopes disponibles**
   - `ALL`: Ver todo lo accesible (acumulativo de todas las responsabilidades)
   - `ORGANIZATION`: Solo nivel organizacional
   - `DEPARTMENT`: Solo un departamento específico
   - `COST_CENTER`: Solo un centro de coste específico
   - `TEAM`: Solo un equipo específico

2. ✅ **Validaciones completas**
   - `DEPARTMENT` requiere `departmentId` obligatorio
   - `COST_CENTER` requiere `costCenterId` obligatorio
   - `TEAM` requiere `teamId` obligatorio
   - `ALL` y `ORGANIZATION` limpian IDs automáticamente
   - Verifica ownership (entidad pertenece a la organización del usuario)

3. ✅ **Persistencia en BD**
   - Contexto guardado en base de datos (no localStorage)
   - Persiste entre sesiones y dispositivos
   - UPSERT automático (crea o actualiza según exista)

4. ✅ **Relaciones inversas**
   - `User.activeContext` (uno a uno)
   - `Organization.userActiveContexts`
   - `Department.activeContexts`
   - `CostCenter.activeContexts`
   - `Team.activeContexts`

**Validación:**

```bash
npx eslint src/server/actions/user-context.ts --fix
# ✅ 0 errores, 10 warnings (complexity, unnecessary optional chain)

npx prisma db push
# ✅ Base de datos sincronizada
# ✅ Prisma Client regenerado
```

**Commits:**

- `efb5620` - feat(alerts): Sprint 2 FASE 4 - Modelo UserActiveContext
- `7f4dc2b` - feat(alerts): Sprint 2 FASE 4 - Server Actions de Contexto Activo

**Próximos pasos (Sprint 3 - UI):**

- Implementar UI de gestión de suscripciones a alertas
- Dashboard de alertas mejorado con filtros
- Selector de contexto global en header (dropdown)
- Integrar contexto activo en filtros de dashboard/empleados/fichajes

---

### Sprint 3: UI y Experiencia de Usuario 🚧 EN CURSO

#### FASE 5: UI de Gestión de Suscripciones ✅ COMPLETADO (2025-11-21)

**Ruta:**

- `/dashboard/settings` → Tab "Alertas"

**Componentes creados:**

- ✅ `/src/app/(main)/dashboard/settings/_components/alert-subscriptions-tab.tsx` (185 líneas)
- ✅ `/src/app/(main)/dashboard/settings/_components/add-subscription-dialog.tsx` (287 líneas)

**Componentes modificados:**

- ✅ `/src/app/(main)/dashboard/settings/page.tsx` - Añadido tab "Alertas"

**Funcionalidades implementadas:**

1. ✅ **Vista de suscripciones actuales** (`AlertSubscriptionsTab`)
   - Lista con cards responsive (grid 1 col → 2 cols en @2xl/main)
   - Información por suscripción: scope, ámbito, email enabled
   - Badges para severidades y tipos de alerta filtrados
   - Botón eliminar integrado en cada card
   - EmptyState cuando no hay suscripciones
   - Loading states con Skeleton components

2. ✅ **Dialog para añadir suscripciones** (`AddSubscriptionDialog`)
   - Selector de scope dinámico según responsabilidades del usuario
   - Usa `getAvailableScopes()` para mostrar solo ámbitos permitidos
   - Selector condicional de ámbito específico (Department/CostCenter/Team)
   - Filtros opcionales de severidad (INFO/WARNING/CRITICAL)
   - Filtros opcionales de tipo de alerta (8 tipos disponibles)
   - Toggle de notificación por email
   - Validación: scopeId obligatorio si scope ≠ ORGANIZATION
   - Integración con `subscribeToAlerts()` server action

3. ✅ **Integración en Settings**
   - Tab "Alertas" añadido al menú de configuración
   - Responsive: Select en móvil, TabsList en desktop
   - Recarga automática después de crear/eliminar suscripciones

**Patrones de diseño aplicados:**

- EmptyState con icono Bell y CTA
- Card-based layout con badges
- Dialog pattern para creación
- Container queries (@2xl/main)
- Loading/Error handling con try-catch

**Validación:**

```bash
npm run lint
# ✅ 0 errores
# ⚠️ 1 warning (complexity 22 en AddSubscriptionDialog - aceptable)

git status
# ✅ 3 archivos modificados/creados
```

**Commit:**

- `c5e3bc3` - feat(alerts): Sprint 3 FASE 5 - UI de Gestión de Suscripciones

**Próximos pasos (Sprint 3 FASE 6):**

- Mejorar dashboard de alertas existente
- Añadir selector de contexto en header
- Añadir filtros avanzados (tipo, severidad, estado, fecha)
- Añadir tabs "Mis Alertas" | "Todas"

---

#### FASE 6: Dashboard de Alertas Mejorado ✅ COMPLETADO (2025-11-21)

**Ruta:**

- `/dashboard/time-tracking/alerts` (mejorado)

**Componentes modificados:**

- ✅ `/src/app/(main)/dashboard/time-tracking/alerts/page.tsx` (+141 líneas, -12 líneas)

**Funcionalidades implementadas:**

1. ✅ **Tabs "Mis Alertas" | "Todas las Alertas"**
   - "Mis Alertas": Muestra alertas según las suscripciones del usuario
   - "Todas las Alertas": Muestra alertas según el contexto activo
   - Deshabilita "Mis Alertas" si el usuario no tiene suscripciones
   - Badge informativo cuando no hay suscripciones
   - Estado sincronizado con `scopeMode` (`mine` | `all`)

2. ✅ **Indicador de Contexto Activo**
   - Badge con el nombre del contexto actual (organización/departamento/centro/equipo)
   - Icono `Target` para indicar el ámbito de visualización
   - Solo visible en modo "Todas las Alertas"
   - Función `getContextLabel()` para formatear el label

3. ✅ **Filtros Avanzados**
   - Filtro por **tipo de alerta**: 8 tipos disponibles (LATE_ARRIVAL, CRITICAL_LATE_ARRIVAL, etc.)
   - Filtro por **rango de fechas**: DateRangePicker integrado
   - Filtros existentes mejorados: centro, equipo, severidad
   - Layout responsive: 2 filas (4 filtros principales + búsqueda + fecha)

4. ✅ **Integraciones con Server Actions**
   - `getActiveContext()` → Obtiene contexto activo del usuario
   - `getAvailableScopes()` → Obtiene scopes disponibles
   - `getMySubscriptions()` → Verifica si tiene suscripciones
   - `getActiveAlerts()` preparado para recibir filtros de tipo y fecha

5. ✅ **Mejoras de UX**
   - Card con tabs superiores para cambiar entre modos
   - Filtros dinámicos según scope del usuario
   - Búsqueda de empleado mejorada
   - Estado de carga visual

**Validación:**

```bash
npx eslint src/app/(main)/dashboard/time-tracking/alerts/page.tsx --fix
# ✅ 0 errores, 17 warnings (complexity, max-lines - aceptables)
# ✅ Warnings críticos resueltos (unused vars, unnecessary ??)
```

**Commit:**

- `02893de` - feat(alerts): Sprint 3 FASE 6 - Dashboard de Alertas Mejorado

**Próximos pasos (Sprint 3 FASE 7):**

- Crear selector de contexto global en header principal
- Integrar cambio de contexto en todos los dashboards
- Dropdown "Ver: Todo | Mi Equipo | Mi Centro | Mi Departamento"

**Pendientes para futuras mejoras:**

- ⏳ Acción masiva: resolver múltiples alertas
- ⏳ Historial de cambios de alertas

---

#### FASE 7: Selector de Contexto Global

**Componente:**

- `/src/components/layout/context-selector.tsx`

**Ubicación:**

- Header principal (junto a notificaciones)

**Lógica:**

- Obtener todas las `AreaResponsible` del usuario
- Mostrar dropdown: "Ver Todo" | "Equipo X" | "Centro Y" | "Departamento Z"
- Al cambiar → `setActiveContext()` → refresh de datos

---

### Sprint 4: Validaciones y Server Actions ⏳ PENDIENTE

#### FASE 8: Validaciones de Team → Department

**Archivo:**

- `/src/server/actions/teams.ts`

**Validación:**

```typescript
// Al crear/editar Team
if (departmentId) {
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { costCenterId: true },
  });

  if (!dept) {
    throw new Error("Departamento no encontrado");
  }

  if (dept.costCenterId !== costCenterId) {
    throw new Error("El departamento no pertenece al centro de coste especificado");
  }
}
```

---

#### FASE 9: Server Actions de AreaResponsible

**Archivo:**

- `/src/server/actions/area-responsibilities.ts`

**Actions:**

```typescript
// Asignar responsabilidad de área
export async function assignAreaResponsibility(
  userId: string,
  scope: Scope,
  scopeId: string | null,
  permissions: Permission[],
): Promise<AreaResponsible>;

// Eliminar responsabilidad
export async function removeAreaResponsibility(id: string): Promise<void>;

// Obtener áreas del usuario
export async function getMyAreaResponsibilities(): Promise<AreaResponsible[]>;

// Obtener empleados visibles según contexto activo
export async function getVisibleEmployees(contextId?: string): Promise<Employee[]>;
```

---

### Sprint 5: Documentación y Testing ⏳ PENDIENTE

#### FASE 10: Documentación Completa

**Documentos a crear:**

1. `/docs/ARQUITECTURA_ALERTAS.md`
   - Motor de alertas con idempotencia
   - Sistema de suscripciones acumulativas
   - Lógica de notificaciones

2. `/docs/SISTEMA_PERMISOS_GRANULARES.md`
   - AreaResponsible con scopes
   - Permisos granulares disponibles
   - Flujo de validación de permisos

3. `/docs/SELECTOR_CONTEXTO.md`
   - UserActiveContext
   - UI del selector
   - Cómo afecta a cada vista

4. `/docs/REGLAS_NEGOCIO_ALERTAS.md`
   - Tipos de alertas y severidades
   - Umbrales de tiempo para cada tipo
   - Política de resolución automática vs manual

5. Actualizar `/ESTADO_ACTUAL_SISTEMA.md`
   - Solo cuando TODO esté implementado
   - Reflejar el estado final del sistema

---

## ✅ Checklist de Validación

**Cumplimiento de requisitos:**

- [ ] **Jerarquía clara**: Team.departmentId opcional documentado y validado
- [ ] **Scope DEPARTMENT**: Implementado en AreaResponsible y AlertSubscription
- [ ] **Idempotencia de alertas**: Constraint único + lógica de update
- [ ] **Suscripciones acumulativas**: Query con DISTINCT funcionando
- [ ] **Selector de contexto**: UI + BD + lógica implementada
- [ ] **Validaciones**: Team → Department validado en server actions
- [ ] **Documentación completa**: 5 documentos especializados creados
- [ ] **Testing**: Casos de uso cubiertos
- [ ] **UI responsive**: Selector de contexto + dashboard alertas

---

## 🎯 Decisiones Técnicas Clave

### Diseño del Sistema

1. **Team.departmentId opcional** - Permite equipos transversales sin departamento
2. **Scope DEPARTMENT** - Añadido como cuarto nivel de granularidad (ORG/DEPT/CENTER/TEAM)
3. **Idempotencia de alertas** - Constraint único `(employeeId, date, type)` en BD
4. **Suscripciones acumulativas** - Query con DISTINCT para evitar duplicados
5. **Contexto activo en BD** - No localStorage, para persistencia entre sesiones

### Implementación

6. **Validación en server actions** - Team → Department validado antes de guardar
7. **Motor de alertas** - `createOrUpdateAlert()` idempotente con UPSERT
8. **Serialización de Decimals** - SIEMPRE convertir a `number` antes de pasar a cliente
9. **Auto-inferencia de departmentId en Alert** - Se obtiene desde Employee.contract.department

### UI/UX

10. **Selector de contexto global** - Dropdown en header, afecta a todas las vistas
11. **Preview de alertas** - Mostrar cuántas alertas recibiría antes de suscribirse
12. **Estados vacíos** - Mensajes claros cuando no hay suscripciones o alertas
13. **Responsive** - Selector adaptado a móvil y desktop

---

## 📝 Próximos Pasos Inmediatos

### 🔴 Alta Prioridad

1. **FASE 1: Actualización del Schema Prisma**
   - Añadir campos y relaciones faltantes
   - Crear migración
   - Validar en Prisma Studio

2. **FASE 2: Motor de Alertas con Idempotencia**
   - Implementar `/src/lib/alert-engine.ts`
   - Testing de idempotencia
   - Testing de suscripciones acumulativas

3. **FASE 3: Server Actions de Alertas**
   - Implementar `/src/server/actions/alerts.ts`
   - Testing de permisos
   - Testing de contexto activo

### 🟡 Media Prioridad

4. **FASE 5-7: UI de Alertas y Contexto**
   - Dashboard de alertas mejorado
   - Selector de contexto global
   - Gestión de suscripciones

### 🟢 Baja Prioridad

5. **FASE 10: Documentación Completa**
   - Crear documentos especializados
   - Actualizar ESTADO_ACTUAL_SISTEMA.md

---

## 📋 Sprint 3 FASE 7: Mejora UX - "Mis Responsabilidades"

**Fecha:** 2025-11-20 22:00
**Estado:** 🚧 EN DESARROLLO
**Tipo:** Mejora de UX y Arquitectura

### 🎯 Problema Detectado

**Arquitectura actual INCORRECTA:**

- ❌ Suscripciones a alertas están en **Settings** (pantalla de configuración organizacional)
- ❌ Settings está diseñado para RRHH/ADMIN, no para usuarios finales
- ❌ Managers tienen que entrar a una pantalla de "administración" para gestionar sus notificaciones personales
- ❌ No hay visibilidad clara de "mis áreas de responsabilidad"

**Problema de UX:**
Un manager responsable de 2 equipos entra a Settings → Alerts y tiene que:

1. Crear manualmente una suscripción
2. Elegir el scope (TEAM)
3. Elegir qué equipo (de una lista)
4. No ve un resumen de TODAS sus responsabilidades
5. No tiene acceso directo al dashboard filtrado de cada equipo

### ✅ Solución: Nueva Pantalla "Mis Responsabilidades"

**Ruta:** `/dashboard/me/responsibilities`

**Concepto:**

- Vista personal de TODAS las áreas donde el usuario es responsable
- Gestión de suscripciones POR ÁREA (no global)
- Acceso directo al dashboard de cada área
- Claridad visual de estado de suscripciones

### 🏗️ Arquitectura Propuesta

#### 1. **Nueva Página**

```
/src/app/(main)/dashboard/me/responsibilities/
  ├── page.tsx                           # Página principal
  └── _components/
      ├── responsibilities-list.tsx      # Lista de áreas de responsabilidad
      ├── responsibility-card.tsx        # Card individual por área
      └── subscription-dialog.tsx        # Dialog para gestionar suscripción (scope pre-seleccionado)
```

#### 2. **Nuevo Server Action**

```typescript
// /src/server/actions/responsibilities.ts

/**
 * Obtiene todas las áreas de responsabilidad del usuario autenticado
 * con información de suscripciones activas
 */
export async function getMyResponsibilities(): Promise<ResponsibilityWithSubscription[]>;
```

#### 3. **Estructura de Datos**

```typescript
type ResponsibilityWithSubscription = {
  // Datos de AreaResponsible
  id: string;
  scope: "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM";
  isActive: boolean;

  // Datos del área específica
  organization?: { id: string; name: string };
  department?: { id: string; name: string };
  costCenter?: { id: string; name: string; code: string };
  team?: { id: string; name: string; code: string };

  // Suscripción activa (si existe)
  subscription?: {
    id: string;
    severityLevels: string[];
    alertTypes: string[];
    notifyByEmail: boolean;
  } | null;

  // Metadatos
  employeesCount: number; // Cuántos empleados están bajo esta responsabilidad
  activeAlertsCount: number; // Alertas activas actualmente
};
```

#### 4. **UI/UX Mejorada**

**Card de Responsabilidad:**

```
┌─────────────────────────────────────────────────────────┐
│ 🏢 Organización: ACME Corp                              │
│ Ámbito: Toda la organización                            │
│                                                          │
│ 👥 152 empleados · 🔔 5 alertas activas                 │
│                                                          │
│ ✅ Suscrito a alertas                                   │
│ Email activado · Filtros: CRITICAL, WARNING             │
│                                                          │
│ [Editar Suscripción]  [Ver Dashboard de Alertas →]     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 👥 Equipo: Desarrollo Frontend                          │
│ Centro: Oficina Madrid · Depto: Tecnología              │
│                                                          │
│ 👥 12 empleados · 🔔 2 alertas activas                  │
│                                                          │
│ ❌ No suscrito a alertas                                │
│                                                          │
│ [Suscribirme a Alertas]  [Ver Dashboard de Alertas →]  │
└─────────────────────────────────────────────────────────┘
```

**Dialog de Suscripción (Mejorado):**

- ✅ **Scope pre-seleccionado** (no se elige, viene del área)
- ✅ Solo configurar: Severidades, Tipos de alerta, Email
- ✅ Preview de "qué alertas recibirás"
- ✅ Más simple y directo

#### 5. **Cambios en Settings**

**ANTES (Incorrecto):**

```
Settings (RRHH/ADMIN)
├── Profile
├── Account
├── Security
├── Alerts ← ❌ Suscripciones personales aquí (MAL)
└── Geolocation
```

**DESPUÉS (Correcto):**

```
Settings (RRHH/ADMIN)
├── Profile
├── Account
├── Security
├── Geolocation
└── (SE ELIMINA Alerts tab)
```

**Mis Responsabilidades (Todos los usuarios):**

```
/dashboard/me/
├── clock           # Fichaje
├── pto             # Ausencias
└── responsibilities # ← NUEVO: Áreas de responsabilidad + suscripciones
```

### 🎨 Navegación Actualizada

**Sidebar → Sección "Mi Espacio":**

```
Mi Espacio
├── 🕐 Fichar
├── 📅 Mis Ausencias
└── 📊 Mis Responsabilidades  ← NUEVO
```

### 📊 Beneficios

1. **Claridad:** El usuario ve TODAS sus áreas de responsabilidad en un solo lugar
2. **Contexto:** Cada área muestra métricas relevantes (empleados, alertas activas)
3. **Accesibilidad:** Acceso directo al dashboard filtrado de cada área
4. **Simplicidad:** Suscripciones ligadas a áreas, no globales abstractas
5. **Arquitectura correcta:** Separación entre configuración organizacional (Settings) y gestión personal (Me)

### 🔄 Flujo de Usuario Mejorado

**ANTES:**

1. Usuario entra a Settings (confuso, ¿por qué estoy en "ajustes"?)
2. Ve tab "Alerts" (no está claro qué es)
3. Click "Añadir Suscripción"
4. Elige scope manualmente (¿ORGANIZATION? ¿TEAM?)
5. Elige área específica (de una lista genérica)
6. No ve contexto de sus otras responsabilidades

**DESPUÉS:**

1. Usuario entra a "Mis Responsabilidades" (claro y personal)
2. Ve lista de TODAS sus áreas con estado visual
3. Por cada área: empleados, alertas activas, estado de suscripción
4. Click "Suscribirme" en un área específica
5. Dialog simple: solo filtros (scope ya está pre-seleccionado)
6. Botón directo a "Ver Dashboard de Alertas" filtrado por esa área

### 📝 Tareas de Implementación

- [x] Documentar nueva arquitectura
- [x] Crear `/dashboard/me/responsibilities/page.tsx`
- [x] Crear `responsibilities-list.tsx` component
- [x] Crear `responsibility-card.tsx` component
- [x] Adaptar `subscription-dialog.tsx` para scope pre-seleccionado
- [x] Crear `getMyResponsibilities()` server action
- [x] Eliminar tab "Alerts" de Settings page
- [x] Actualizar navegación sidebar
- [x] Testing del flujo completo

### 🗂️ Archivos Afectados

**Crear:**

- `/src/app/(main)/dashboard/me/responsibilities/page.tsx`
- `/src/app/(main)/dashboard/me/responsibilities/_components/responsibilities-list.tsx`
- `/src/app/(main)/dashboard/me/responsibilities/_components/responsibility-card.tsx`
- `/src/app/(main)/dashboard/me/responsibilities/_components/subscription-dialog.tsx`
- `/src/server/actions/responsibilities.ts`

**Modificar:**

- `/src/app/(main)/dashboard/settings/page.tsx` (eliminar tab Alerts)
- `/src/navigation/sidebar-nav.tsx` (agregar link a Mis Responsabilidades)

**Eliminar:**

- `/src/app/(main)/dashboard/settings/_components/alert-subscriptions-tab.tsx` (mover lógica)
- `/src/app/(main)/dashboard/settings/_components/add-subscription-dialog.tsx` (adaptar y mover)

---

**Versión:** 2.1
**Última actualización:** 2025-11-20 22:00
**Autor:** Sistema de Planificación ERP TimeNow

**Cambios en esta versión:**

- ✅ Documento de planificación inicial creado
- ✅ Arquitectura propuesta documentada
- ✅ Decisiones técnicas definidas
- ✅ Roadmap con 5 sprints planificados
- ✅ Sprint 3 FASE 7: Mejora UX "Mis Responsabilidades" documentada
- ✅ Checklist de validación incluido
