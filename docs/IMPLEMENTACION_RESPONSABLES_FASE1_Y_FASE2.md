# Implementación Técnica - Sistema de Responsables FASE 1 y FASE 2

**Fecha:** 2025-11-20
**Estado:** ✅ COMPLETADO
**Versión:** 1.0

---

## 📋 Resumen Ejecutivo

Este documento detalla la implementación técnica de las **FASE 1** y **FASE 2** del Sistema de Responsables y Alertas.

**Fases completadas:**
- ✅ **FASE 1:** Modelo de Datos (Team + relaciones)
- ✅ **FASE 2:** Sistema de Visibilidad y Filtrado (scope helpers + UI)

**Resultado:** Sistema funcional de filtrado por ámbitos con bypass automático para roles globales (ADMIN/RRHH).

---

## 🗂️ FASE 1: Modelo de Datos

### Objetivo

Crear las tablas base del sistema de responsables y equipos en la base de datos.

### Archivos Modificados

**`/prisma/schema.prisma`**

### Cambios Realizados

#### 1. Modelo `Team` (NUEVO)

```prisma
model Team {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  name        String
  description String?
  code        String?

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Jerarquía: Todo equipo pertenece a un centro
  costCenterId String
  costCenter   CostCenter @relation(fields: [costCenterId], references: [id], onDelete: Cascade)

  isActive Boolean @default(true)

  // Relaciones
  employees          Employee[]          @relation("EmployeeTeam")
  areaResponsibles   AreaResponsible[]   @relation("TeamResponsibles")
  alertSubscriptions AlertSubscription[] @relation("TeamAlertSubscriptions")
  alerts             Alert[]             @relation("TeamAlerts")

  @@unique([orgId, code])
  @@index([orgId])
  @@index([costCenterId])
  @@index([isActive])
  @@map("teams")
}
```

**Decisiones técnicas:**
- `costCenterId` **obligatorio**: Todo equipo pertenece a un centro (jerarquía 2 niveles)
- `code` único por organización: Para búsquedas rápidas (ej: "LOG-001")
- Sin `teamLeaderId`: Se gestiona con `AreaResponsible` (más flexible)

#### 2. Extensión de `Employee`

```prisma
model Employee {
  // ... campos existentes ...

  // NUEVO: Relación con equipo
  teamId String?
  team   Team?   @relation("EmployeeTeam", fields: [teamId], references: [id])

  @@index([teamId])
}
```

#### 3. Extensión de `CostCenter`

```prisma
model CostCenter {
  // ... campos existentes ...

  // NUEVO: Equipos del centro
  teams Team[]
}
```

#### 4. Extensión de `Alert`

```prisma
model Alert {
  // ... campos existentes ...

  // NUEVO: Relación con equipo (para filtrado)
  teamId String?
  team   Team?   @relation("TeamAlerts", fields: [teamId], references: [id])

  @@index([teamId])
  @@index([teamId, status, date]) // Índice compuesto para queries eficientes
}
```

### Migración

**Comando ejecutado:**
```bash
npx prisma db push
```

**Razón de usar `db push` en lugar de `migrate dev`:**
- Desarrollo activo con cambios frecuentes
- Evita acumulación de migraciones durante iteración
- Permite sincronizar sin perder datos de desarrollo

**⚠️ IMPORTANTE:** Antes de merge a `main`, crear migración formal:
```bash
npx prisma migrate dev --name add_teams_and_scope_system
```

### Verificación

```bash
npx prisma generate  # ✅ Tipos regenerados correctamente
```

---

## 🔍 FASE 2: Sistema de Visibilidad y Filtrado

### Objetivo

Implementar sistema de permisos por ámbitos (scopes) con filtrado automático en dashboard de alertas.

### Archivos Creados

**`/src/lib/permissions/scope-helpers.ts`** (NUEVO - 456 líneas)

### Helpers Implementados

#### 1. `buildScopeFilter(userId: string)`

**Propósito:** Construye filtro de Prisma para queries basado en los scopes del usuario.

**Características:**
- ✅ **Bypass automático para roles globales:** ORG_ADMIN, SUPER_ADMIN, HR_ADMIN
- ✅ **Sin AreaResponsible = sin acceso:** Retorna `{ id: "never" }` si no tiene responsabilidades
- ✅ **Vista unificada:** Combina múltiples scopes con `OR`
- ✅ **Scope ORGANIZATION:** Retorna `{}` (sin restricciones)

**Uso:**
```typescript
const filter = await buildScopeFilter(userId);

const alerts = await prisma.alert.findMany({
  where: {
    orgId: session.user.orgId,
    // Solo aplicar si NO está vacío (bypass RRHH)
    ...(Object.keys(filter).length > 0 && { employee: filter })
  }
});
```

**DECISIÓN CRÍTICA:**
```typescript
// ❌ INCORRECTO - causa queries vacías en Prisma
where: {
  employee: {}  // Prisma no entiende esto
}

// ✅ CORRECTO - aplicar condicionalmente
if (Object.keys(scopeFilter).length > 0) {
  whereClause.employee = scopeFilter;
}
```

#### 2. `getUserAccessibleCostCenters(userId, orgId)`

**Propósito:** Obtiene centros de coste accesibles para el usuario (para filtros de UI).

**Bypass ADMIN/RRHH:**
```typescript
if (user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN") {
  return await prisma.costCenter.findMany({
    where: { orgId, active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}
```

**Para otros roles:**
- Scope ORGANIZATION → Todos los centros
- Scope COST_CENTER → Solo centros asignados
- Sin responsabilidades → Array vacío `[]`

#### 3. `getUserAccessibleTeams(userId, orgId)`

**Propósito:** Obtiene equipos accesibles para el usuario.

**Lógica:**
- ADMIN/RRHH → Todos los equipos
- Scope ORGANIZATION → Todos los equipos
- Scope COST_CENTER → Equipos de esos centros
- Scope TEAM → Solo equipos asignados

#### 4. Otros Helpers

- `hasPermission(userId, permission, resourceId?)` - Verifica permisos específicos
- `validateScopeOwnership(orgId, scope, scopeId)` - Validación multi-tenant
- `getUserScopes(userId)` - Obtiene scopes con detalles
- `getUserAlertSubscriptions(userId)` - Suscripciones activas
- `shouldReceiveAlertNotification(userId, alert)` - Lógica de notificaciones

### Archivos Modificados

#### `/src/server/actions/alert-detection.ts`

**Cambios principales:**

1. **Import del helper:**
```typescript
import { buildScopeFilter } from "@/lib/permissions/scope-helpers";
```

2. **`getActiveAlerts()` - Con scope filtering:**
```typescript
export async function getActiveAlerts(filters?: { ... }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const scopeFilter = await buildScopeFilter(session.user.id);

  const whereClause: any = {
    orgId: session.user.orgId,
    ...(filters?.costCenterId && { costCenterId: filters.costCenterId }),
    ...(filters?.severity && { severity: filters.severity }),
  };

  // ✅ Solo aplicar si NO está vacío (bypass RRHH)
  if (Object.keys(scopeFilter).length > 0) {
    whereClause.employee = scopeFilter;
  }

  const alerts = await prisma.alert.findMany({
    where: whereClause,
    include: { employee: true, costCenter: true, team: true, resolver: true },
    orderBy: [{ createdAt: "desc" }],
  });

  return alerts.map(serializeAlert);
}
```

3. **`getAlertStats()` - Con scope filtering:**
```typescript
export async function getAlertStats() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const scopeFilter = await buildScopeFilter(session.user.id);

  const whereClause: any = { orgId: session.user.orgId };

  if (Object.keys(scopeFilter).length > 0) {
    whereClause.employee = scopeFilter;
  }

  // Queries con scope aplicado...
}
```

4. **`getAvailableAlertFilters()` - NUEVO:**
```typescript
export async function getAvailableAlertFilters() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const [costCenters, teams] = await Promise.all([
    getUserAccessibleCostCenters(session.user.id, session.user.orgId),
    getUserAccessibleTeams(session.user.id, session.user.orgId),
  ]);

  return {
    costCenters,
    teams,
    severities: ["INFO", "WARNING", "CRITICAL"],
  };
}
```

#### `/src/app/(main)/dashboard/time-tracking/alerts/page.tsx`

**Cambios principales:**

1. **Estado de filtros disponibles:**
```typescript
const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({
  costCenters: [],
  teams: [],
  severities: ["INFO", "WARNING", "CRITICAL"],
});
```

2. **Carga asíncrona de filtros:**
```typescript
useEffect(() => {
  const loadFilters = async () => {
    const filters = await getAvailableAlertFilters();
    setAvailableFilters(filters);
  };
  loadFilters();
}, []);
```

3. **Grid de 4 filtros:**
```tsx
<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
  {/* Filtro por Centro */}
  <Select value={selectedCenter} onValueChange={setSelectedCenter}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder="Todos los centros" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos los centros</SelectItem>
      {availableFilters.costCenters.map((center) => (
        <SelectItem key={center.id} value={center.id}>
          {center.name} {center.code ? `(${center.code})` : ""}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* Filtro por Equipo */}
  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
    {/* Similar al de centro */}
  </Select>

  {/* Filtro por Severidad */}
  <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
    {/* Severities */}
  </Select>

  {/* Búsqueda por Empleado */}
  <Input
    placeholder="Buscar empleado..."
    value={employeeSearch}
    onChange={(e) => setEmployeeSearch(e.target.value)}
  />
</div>
```

4. **Filtrado combinado (server + client):**
```typescript
// Server-side filtering
const loadAlerts = useCallback(async () => {
  setLoading(true);
  try {
    const serverFilters: any = {};

    if (selectedCenter !== "all") {
      serverFilters.costCenterId = selectedCenter;
    }

    if (selectedSeverity !== "all") {
      serverFilters.severity = selectedSeverity;
    }

    const data = await getActiveAlerts(serverFilters);
    setAlerts(data);
  } finally {
    setLoading(false);
  }
}, [selectedCenter, selectedSeverity]);

// Client-side filtering (team + employee search)
const filteredAlerts = useMemo(() => {
  return alerts.filter((alert) => {
    // Filtro por equipo (client-side)
    if (selectedTeam !== "all" && alert.teamId !== selectedTeam) {
      return false;
    }

    // Búsqueda por empleado (client-side)
    if (employeeSearch) {
      const searchLower = employeeSearch.toLowerCase();
      const fullName = `${alert.employee.firstName} ${alert.employee.lastName}`.toLowerCase();
      if (!fullName.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}, [alerts, selectedTeam, employeeSearch]);
```

#### `/src/app/(main)/dashboard/time-tracking/alerts/_components/alert-columns.tsx`

**Cambios principales:**

1. **Añadir `teamId` al tipo `AlertRow`:**
```typescript
export type AlertRow = {
  // ... campos existentes ...
  teamId: string | null;
  team: {
    name: string;
    code: string | null;
  } | null;
};
```

2. **Mostrar equipo en columna de empleado:**
```tsx
{
  accessorKey: "employee",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado / Centro" />,
  cell: ({ row }) => {
    const employee = row.original.employee;
    const costCenter = row.original.costCenter;
    const team = row.original.team;

    return (
      <div className="flex min-w-[160px] flex-col">
        <span className="truncate font-medium">
          {employee.firstName} {employee.lastName}
        </span>
        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <span>{costCenter ? costCenter.name : "Sin centro"}</span>
          {team && (
            <>
              <span>•</span>
              <span title={team.name}>{team.name}</span>
            </>
          )}
        </div>
      </div>
    );
  },
}
```

3. **Fixes de ESLint:**
```typescript
// ❌ ANTES (causa error de type assertion)
const type = row.getValue("type") as string;

// ✅ DESPUÉS (sin type assertion innecesaria)
const type = row.original.type;

// ❌ ANTES (|| con valores opcionales)
const label = alertTypeLabels[type] || type;

// ✅ DESPUÉS (?? para nullish coalescing)
const label = alertTypeLabels[type] ?? type;
```

---

## 🎯 Decisiones Técnicas Importantes

### 1. Bypass Automático para Roles Globales

**Problema:** RRHH y ADMIN deberían ver TODO sin necesidad de crear `AreaResponsible`.

**Solución:**
```typescript
// En TODOS los helpers
if (user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN") {
  return {}; // Sin restricciones
}
```

**Impacto:** RRHH/ADMIN ven todas las alertas, centros y equipos sin configuración adicional.

### 2. Filtrado Condicional en Prisma

**Problema:** `buildScopeFilter()` retorna `{}` para RRHH, lo que causa `employee: {}` (query inválida).

**Solución:**
```typescript
if (Object.keys(scopeFilter).length > 0) {
  whereClause.employee = scopeFilter;
}
```

**Antes (INCORRECTO):**
```typescript
// Causa query vacía para RRHH
where: {
  orgId: "...",
  employee: {} // ❌ Prisma no entiende esto
}
```

**Después (CORRECTO):**
```typescript
// Solo añade employee si hay restricciones
where: {
  orgId: "...",
  // employee solo si scopeFilter no está vacío
}
```

### 3. ESLint: `??` vs `||`

**Regla:** `@typescript-eslint/prefer-nullish-coalescing`

**Problema:** Con valores opcionales, `||` puede causar comportamiento inesperado.

```typescript
// ❌ INCORRECTO (bloquea commit)
const value = obj?.field1 || obj?.field2;

// ✅ CORRECTO
const value = obj?.field1 ?? obj?.field2;
```

**Razón:** Con `||`, valores falsy (0, "", false) se tratan como null. Con `??`, solo null/undefined.

### 4. row.original vs row.getValue()

**Problema:** Type assertions innecesarias en DataTable.

```typescript
// ❌ INCORRECTO (ESLint error)
const type = row.getValue("type") as string;

// ✅ CORRECTO (sin assertion)
const type = row.original.type;
```

**Razón:** `row.original` ya está tipado correctamente, `row.getValue()` retorna `unknown`.

---

## 📦 Commits Realizados

### Commit 1: Sistema de Responsables (FASE 1 + 2)
```bash
commit 0a96e86
feat: implementar sistema de responsables y visibilidad por ámbito

- Añadir modelo Team y relaciones en schema.prisma
- Crear helpers de permisos con filtrado por scope (ORGANIZATION, COST_CENTER, TEAM)
- Implementar bypass para roles globales (ORG_ADMIN, SUPER_ADMIN, HR_ADMIN)
- Aplicar filtrado automático en dashboard de alertas
- Añadir filtros UI dinámicos (centro, equipo, severidad)
- Optimizar columnas de alertas con tooltips y mejor formato
- Crear documentación completa de reglas de negocio
```

### Commit 2: Fixes de ESLint
```bash
commit 222f67b
fix(lint): corregir errores de ESLint en dashboard de alertas

- Arreglar orden de imports según eslint-plugin-import
- Eliminar type assertions innecesarias (usar row.original)
- Eliminar imports no utilizados (flexRender, CardDescription)
- Cambiar || por ?? para nullish coalescing (ESLint requirement)
- Escapar comillas con &quot; en JSX
- Quitar trailing whitespace
```

---

## 🧪 Testing Manual Realizado

### Casos Probados

1. ✅ **Usuario RRHH sin AreaResponsible:**
   - Ve todas las alertas
   - Filtros muestran todos los centros y equipos
   - Sin errores de query

2. ✅ **Usuario con Scope COST_CENTER:**
   - Solo ve alertas de su centro
   - Filtros solo muestran su centro
   - Equipos del centro visible

3. ✅ **Usuario con Scope TEAM:**
   - Solo ve alertas de su equipo
   - Filtros restringidos

4. ✅ **Filtrado combinado:**
   - Server-side: centro + severidad
   - Client-side: equipo + búsqueda empleado
   - Sin lag ni errores

---

## 📊 Métricas

- **Archivos creados:** 2
- **Archivos modificados:** 3
- **Líneas añadidas:** ~800
- **Funciones implementadas:** 8 helpers
- **Tiempo estimado:** 6-8 horas
- **Tiempo real:** ~8 horas

---

## 🔜 Próximos Pasos (FASE 3)

**Objetivo:** Implementar UI de asignación de responsables en centros de coste.

**Pendiente:**
1. Server actions genéricas: `area-responsibilities.ts`
2. Pestaña "Responsables" en `/dashboard/cost-centers/[id]`
3. Dialog "Añadir Responsable" con permisos
4. Opción de crear suscripción automática

**Referencia:**
- [Plan Original](./SISTEMA_RESPONSABLES_Y_ALERTAS_IMPLEMENTACION.md)
- [Reglas de Negocio](./REGLAS_NEGOCIO_RESPONSABLES_ALERTAS.md)

---

**Versión:** 1.0
**Última actualización:** 2025-11-20
**Autor:** Sistema ERP TimeNow
**Estado:** ✅ COMPLETADO
