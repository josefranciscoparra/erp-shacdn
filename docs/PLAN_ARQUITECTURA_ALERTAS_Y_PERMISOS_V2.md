# PLAN: Sistema de Alertas y Permisos Granulares v2.0

**Fecha:** 2025-11-20
**Estado:** 📝 EN PLANIFICACIÓN
**Versión:** 2.0
**Tipo:** Mejora Arquitectural

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

### Sprint 1: Fundamentos de Datos ⏳ PENDIENTE

#### FASE 1: Actualización del Schema Prisma

**Archivos a modificar:**
- `prisma/schema.prisma`

**Cambios:**
1. ✅ Añadir `departmentId` opcional a `Team`
2. ✅ Añadir scope `"DEPARTMENT"` a `AreaResponsible` y `AlertSubscription`
3. ✅ Añadir `departmentId` a `AreaResponsible` y `AlertSubscription`
4. ✅ Añadir `departmentId` a `Alert`
5. ✅ Añadir constraint único a `Alert`: `@@unique([employeeId, date, type])`
6. ✅ Añadir relaciones en `Department`

**Migración:**
```bash
npx prisma migrate dev --name add_department_scope_and_alert_idempotency
```

**Validaciones en Server Actions:**
- Si `Team.departmentId` existe → validar que `department.costCenterId === team.costCenterId`
- Si `AreaResponsible.scope === "DEPARTMENT"` → validar que `departmentId` no es null
- Si `AlertSubscription.scope === "DEPARTMENT"` → validar que `departmentId` no es null

---

### Sprint 2: Lógica de Negocio ⏳ PENDIENTE

#### FASE 2: Sistema de Alertas con Idempotencia

**Archivo nuevo:**
- `/src/lib/alert-engine.ts`

**Funciones:**
```typescript
// Crear o actualizar alerta (idempotente)
async function createOrUpdateAlert(params: {
  employeeId: string;
  date: Date;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  timeEntryId?: string;
  departmentId?: string;
  costCenterId?: string;
  teamId?: string;
}): Promise<Alert>

// Obtener suscriptores de una alerta (acumulativo)
async function getAlertSubscribers(alert: Alert): Promise<User[]>

// Resolver alerta
async function resolveAlert(alertId: string, userId: string, resolution: string): Promise<Alert>
```

**Reglas de idempotencia:**
- Clave única: `(employeeId, date, type)`
- Si existe → `UPDATE` (no `INSERT`)
- Campos actualizables: `severity`, `description`, `timeEntryId`, `resolved`, `resolvedAt`, `resolution`
- Si se corrige un fichaje → alerta pasa a `resolved=true` automáticamente

**Prioridad de suscripciones (ACUMULATIVO):**
- Un usuario con varias suscripciones ve TODAS las alertas sumadas
- Ejemplo: `scope=ORG + scope=TEAM` → ve todas las alertas de la org + las específicas del equipo (sin duplicar)
- La query usa `DISTINCT` para evitar duplicados

---

#### FASE 3: Server Actions de Alertas

**Archivo:**
- `/src/server/actions/alerts.ts`

**Actions:**
```typescript
// Obtener alertas del usuario (según sus suscripciones)
export async function getMyAlerts(filters?: AlertFilters): Promise<Alert[]>

// Crear suscripción a alertas
export async function subscribeToAlerts(scope: Scope, scopeId?: string): Promise<void>

// Eliminar suscripción
export async function unsubscribeFromAlerts(subscriptionId: string): Promise<void>

// Resolver alerta
export async function resolveAlert(alertId: string, resolution: string): Promise<void>

// Obtener estadísticas de alertas
export async function getAlertStats(): Promise<AlertStats>
```

---

#### FASE 4: Sistema de Contexto Activo

**Nuevo modelo:**
```prisma
model UserActiveContext {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User @relation(...)

  // Contexto activo seleccionado por el usuario
  activeScope String // "ALL" | "ORGANIZATION" | "DEPARTMENT" | "COST_CENTER" | "TEAM"

  // ID del ámbito activo (solo si activeScope != "ALL" y != "ORGANIZATION")
  activeDepartmentId  String?
  activeCostCenterId  String?
  activeTeamId        String?

  updatedAt DateTime @updatedAt
}
```

**Server Action:**
```typescript
// Cambiar contexto activo
export async function setActiveContext(scope: Scope, scopeId?: string): Promise<void>

// Obtener contexto activo
export async function getActiveContext(): Promise<UserActiveContext>
```

**UI:**
- Dropdown en header: "Ver: Todo | Mi Equipo | Mi Centro | Mi Departamento"
- Se guarda en BD (no localStorage)
- Afecta a:
  - Dashboard de empleados
  - Fichajes
  - Alertas
  - Reportes

---

### Sprint 3: UI y Experiencia de Usuario ⏳ PENDIENTE

#### FASE 5: UI de Gestión de Suscripciones

**Ruta:**
- `/dashboard/settings/alert-subscriptions`

**Componentes:**
- `AlertSubscriptionsList` - Lista de suscripciones actuales
- `AddSubscriptionDialog` - Añadir nueva suscripción
- `SubscriptionCard` - Card con scope + ámbito + botón eliminar

**Features:**
- Ver todas las suscripciones del usuario
- Añadir nuevas suscripciones (con selector de scope + ámbito)
- Eliminar suscripciones existentes
- Preview de cuántas alertas recibiría

---

#### FASE 6: Dashboard de Alertas Mejorado

**Ruta:**
- `/dashboard/time-tracking/alerts` (ya existe, mejorar)

**Mejoras:**
- Selector de contexto activo (dropdown en header)
- Filtros por tipo, severidad, estado, fecha
- Tabs: "Mis Alertas" | "Todas" (según permisos)
- Acción masiva: resolver múltiples alertas
- Historial de cambios de alertas (opcional)

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
    select: { costCenterId: true }
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
  permissions: Permission[]
): Promise<AreaResponsible>

// Eliminar responsabilidad
export async function removeAreaResponsibility(id: string): Promise<void>

// Obtener áreas del usuario
export async function getMyAreaResponsibilities(): Promise<AreaResponsible[]>

// Obtener empleados visibles según contexto activo
export async function getVisibleEmployees(contextId?: string): Promise<Employee[]>
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

**Versión:** 2.0
**Última actualización:** 2025-11-20
**Autor:** Sistema de Planificación ERP TimeNow

**Cambios en esta versión:**

- ✅ Documento de planificación inicial creado
- ✅ Arquitectura propuesta documentada
- ✅ Decisiones técnicas definidas
- ✅ Roadmap con 5 sprints planificados
- ✅ Checklist de validación incluido
