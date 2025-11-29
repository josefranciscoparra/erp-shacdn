# Implementación Técnica - Sistema de Responsables FASE 3

**Fecha:** 2025-11-20
**Estado:** 🚧 EN PROGRESO
**Versión:** 1.0

---

## 📋 Resumen Ejecutivo

Este documento detalla la implementación de la **FASE 3** del Sistema de Responsables: Asignación de Responsables en Centros de Coste.

**Objetivo:** Permitir a usuarios ADMIN asignar responsables a centros de coste con permisos granulares y suscripción automática a alertas.

**Progreso actual:**

- ✅ Server Actions genéricas implementadas (100%)
- 🔄 UI de detalle de centro con tabs (0%)
- ⏸️ Componentes de asignación (0%)

---

## ✅ COMPLETADO: Server Actions Genéricas

### Archivo Creado

**`/src/server/actions/area-responsibilities.ts`** - 560 líneas

### Diseño: Genérico y Reutilizable

**Principio clave:** Las funciones NO están hardcodeadas para centros. Funcionan con **cualquier scope**:

- `ORGANIZATION` - Organización completa (RRHH global)
- `COST_CENTER` - Centro de coste
- `TEAM` - Equipo
- `DEPARTMENT` - Futuro (cuando se implemente)

**Ventaja:** Reutilizar las mismas server actions en FASE 4 (Equipos) sin cambios.

### Funciones Implementadas

#### 1. `assignResponsibility(data)`

**Propósito:** Asignar un responsable a un ámbito (centro, equipo, organización).

**Parámetros:**

```typescript
{
  userId: string;              // Usuario a asignar
  scope: "ORGANIZATION" | "COST_CENTER" | "TEAM";
  scopeId: string | null;      // ID del centro/equipo (null para ORGANIZATION)
  permissions: Permission[];   // Permisos a otorgar
  createSubscription?: boolean; // Crear suscripción automática (default: false)
}
```

**Validaciones:**

- ✅ Solo ADMIN puede asignar (ORG_ADMIN, SUPER_ADMIN, HR_ADMIN)
- ✅ Usuario objetivo existe y pertenece a la organización
- ✅ Validación multi-tenant con `validateScopeOwnership()`
- ✅ Constraint unique: No duplicar asignaciones

**Funcionalidad adicional:**

- Si `createSubscription: true`, crea automáticamente `AlertSubscription` con:
  - `notifyInApp: true`
  - `severityLevels: ["WARNING", "CRITICAL"]` (solo alertas importantes)
  - Mismo scope que la responsabilidad

**Ejemplo de uso:**

```typescript
// Asignar responsable de centro con suscripción automática
const { success, responsibility } = await assignResponsibility({
  userId: "user123",
  scope: "COST_CENTER",
  scopeId: "center456",
  permissions: ["VIEW_ALERTS", "RESOLVE_ALERTS", "VIEW_EMPLOYEES"],
  createSubscription: true,
});
```

#### 2. `removeResponsibility(responsibilityId)`

**Propósito:** Quitar una responsabilidad (soft delete).

**Comportamiento:**

- Marca `isActive: false` (no elimina físicamente)
- Solo ADMIN puede eliminar
- Valida que pertenezca a la organización

**Ejemplo:**

```typescript
await removeResponsibility("resp123");
```

#### 3. `updateResponsibility(responsibilityId, data)`

**Propósito:** Actualizar los permisos de una responsabilidad existente.

**Parámetros:**

```typescript
{
  permissions: Permission[]  // Nuevos permisos (reemplaza los existentes)
}
```

**Ejemplo:**

```typescript
await updateResponsibility("resp123", {
  permissions: ["VIEW_ALERTS", "RESOLVE_ALERTS", "VIEW_SCHEDULES", "MANAGE_SCHEDULES"],
});
```

#### 4. `getResponsiblesForArea(scope, scopeId)`

**Propósito:** Obtener todos los responsables de un ámbito específico (GENÉRICO).

**Uso en centros:**

```typescript
const { responsibles } = await getResponsiblesForArea("COST_CENTER", "center123");
```

**Uso en equipos (FASE 4):**

```typescript
const { responsibles } = await getResponsiblesForArea("TEAM", "team456");
```

**Retorna:**

```typescript
[
  {
    id: "resp1",
    userId: "user1",
    scope: "COST_CENTER",
    costCenterId: "center123",
    permissions: ["VIEW_ALERTS", "RESOLVE_ALERTS"],
    user: { id: "user1", name: "Juan Pérez", email: "juan@acme.com" },
    costCenter: { id: "center123", name: "Madrid", code: "MAD" },
    createdAt: Date,
    updatedAt: Date,
  },
  // ...
];
```

#### 5. `getUserResponsibilities(userId?)`

**Propósito:** Obtener todas las responsabilidades de un usuario.

**Casos de uso:**

- Sin `userId` → Responsabilidades del usuario actual
- Con `userId` → Responsabilidades de otro usuario (solo ADMIN)

**Ejemplo:**

```typescript
// Mis responsabilidades
const { responsibilities } = await getUserResponsibilities();

// Responsabilidades de otro usuario (ADMIN)
const { responsibilities } = await getUserResponsibilities("user123");
```

#### 6. `searchUsersForResponsibility(searchTerm)`

**Propósito:** Buscar usuarios disponibles para asignar como responsables.

**Características:**

- Búsqueda por nombre o email (case-insensitive)
- Solo usuarios activos de la organización
- Limitado a 20 resultados
- Solo ADMIN puede buscar

**Ejemplo:**

```typescript
const { users } = await searchUsersForResponsibility("juan");
// Retorna usuarios cuyo nombre o email contenga "juan"
```

### Permisos Disponibles

```typescript
type Permission =
  | "VIEW_EMPLOYEES" // Ver listado de empleados
  | "MANAGE_EMPLOYEES" // Crear/editar empleados
  | "VIEW_TIME_ENTRIES" // Ver fichajes
  | "MANAGE_TIME_ENTRIES" // Editar/validar fichajes
  | "VIEW_ALERTS" // Ver alertas
  | "RESOLVE_ALERTS" // Resolver/justificar alertas
  | "VIEW_SCHEDULES" // Ver horarios
  | "MANAGE_SCHEDULES" // Asignar/modificar horarios
  | "VIEW_PTO_REQUESTS" // Ver solicitudes de ausencias
  | "APPROVE_PTO_REQUESTS"; // Aprobar/rechazar ausencias
```

### Seguridad Multi-tenant

**Validación de ownership:**

```typescript
// Antes de asignar responsabilidad, validar que el scope pertenece a la org
const isValid = await validateScopeOwnership(orgId, "COST_CENTER", centerId);
if (!isValid) {
  throw new Error("Centro no pertenece a la organización");
}
```

**Previene:**

- ❌ Asignar responsables de centros de otras organizaciones
- ❌ Cross-tenant data leaks
- ❌ Privilege escalation attacks

### Commit Realizado

```bash
commit 070f21c
feat: crear server actions genéricas para asignación de responsables

- Implementar CRUD completo de responsabilidades
- Diseño genérico y reutilizable para cualquier scope
- Validación multi-tenant con validateScopeOwnership()
- Solo ADMIN puede asignar/quitar responsabilidades
- Opción de crear suscripción automática a alertas
- Búsqueda de usuarios para asignar
```

---

## 🔄 EN PROGRESO: UI de Asignación

### Estructura de Archivos (Planificado)

```
src/app/(main)/dashboard/cost-centers/
├── page.tsx                              # Listado (existente - modificar)
├── [id]/
│   ├── page.tsx                          # Detalle centro + tabs (NUEVO)
│   └── _components/
│       ├── responsibles-tab.tsx          # Tab de responsables (NUEVO)
│       ├── responsibles-list.tsx         # Lista de responsables (NUEVO)
│       ├── add-responsible-dialog.tsx    # Dialog añadir (NUEVO)
│       └── edit-permissions-dialog.tsx   # Dialog editar (NUEVO)
```

### Diseño de UI (Aprobado)

**Patrón a seguir:** `/dashboard/schedules/[id]/page.tsx`

#### Página de Detalle (`/cost-centers/[id]/page.tsx`)

```tsx
<PermissionGuard permission="view_cost_centers">
  <div className="@container/main flex flex-col gap-4 md:gap-6">
    {/* Header con navegación */}
    <Button variant="ghost" asChild>
      <Link href="/dashboard/cost-centers">
        <ArrowLeft /> Volver a Centros
      </Link>
    </Button>

    {/* Título + badges */}
    <div>
      <h1>{center.name}</h1>
      <Badge>{center.active ? "Activo" : "Inactivo"}</Badge>
    </div>

    {/* Tarjetas resumen */}
    <div className="grid gap-4 @xl/main:grid-cols-3">
      <Card>
        <CardTitle>Empleados Asignados</CardTitle>
        <div className="text-2xl font-bold">{employeeCount}</div>
      </Card>
      <Card>
        <CardTitle>Responsables Activos</CardTitle>
        <div className="text-2xl font-bold">{responsibleCount}</div>
      </Card>
      <Card>
        <CardTitle>Estado</CardTitle>
        <Badge>{center.active ? "Activo" : "Inactivo"}</Badge>
      </Card>
    </div>

    {/* Tabs */}
    <Tabs defaultValue="info">
      <TabsList>
        <TabsTrigger value="info">Información</TabsTrigger>
        <TabsTrigger value="responsibles">Responsables ({responsibleCount})</TabsTrigger>
      </TabsList>

      <TabsContent value="info">{/* Datos del centro (readonly) */}</TabsContent>

      <TabsContent value="responsibles">
        <ResponsiblesTab costCenterId={center.id} />
      </TabsContent>
    </Tabs>
  </div>
</PermissionGuard>
```

#### Tab Responsables (`responsibles-tab.tsx`)

```tsx
export function ResponsiblesTab({ costCenterId }: { costCenterId: string }) {
  return (
    <div className="space-y-4">
      {/* Botón añadir */}
      <div className="flex items-center justify-end">
        <AddResponsibleDialog costCenterId={costCenterId} />
      </div>

      {/* Lista de responsables */}
      <ResponsiblesList costCenterId={costCenterId} />
    </div>
  );
}
```

#### Lista de Responsables (`responsibles-list.tsx`)

**Características:**

- DataTable con TanStack Table
- Columnas:
  1. **Usuario** - Nombre + email
  2. **Permisos** - Badges con tooltips
  3. **Fecha asignación** - Format: "d MMM yyyy"
  4. **Acciones** - Dropdown con "Editar permisos" y "Eliminar"

**Estado vacío:**

```tsx
<EmptyState
  icon={<Users />}
  title="Sin responsables asignados"
  description="Añade el primer responsable para este centro"
  action={<AddResponsibleDialog />}
/>
```

**Columna Permisos (ejemplo):**

```tsx
cell: ({ row }) => {
  const permissions = row.original.permissions;

  if (permissions.length === 0) {
    return <span className="text-muted-foreground text-xs">Sin permisos</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {permissions.slice(0, 3).map((perm) => (
        <Badge key={perm} variant="secondary" className="text-xs">
          {permissionLabels[perm]}
        </Badge>
      ))}
      {permissions.length > 3 && (
        <Badge variant="outline" className="text-xs">
          +{permissions.length - 3} más
        </Badge>
      )}
    </div>
  );
};
```

#### Dialog Añadir Responsable (`add-responsible-dialog.tsx`)

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Añadir Responsable
    </Button>
  </DialogTrigger>

  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Añadir Responsable</DialogTitle>
      <DialogDescription>Asigna un usuario como responsable de este centro</DialogDescription>
    </DialogHeader>

    <Form>
      {/* 1. Combobox de búsqueda de usuarios */}
      <FormField
        name="userId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Usuario</FormLabel>
            <Combobox
              placeholder="Buscar por nombre o email..."
              searchFunction={searchUsersForResponsibility}
              displayValue={(user) => `${user.name} (${user.email})`}
              {...field}
            />
          </FormItem>
        )}
      />

      {/* 2. Checkboxes de permisos (grid 2 columnas) */}
      <FormField
        name="permissions"
        render={() => (
          <FormItem>
            <FormLabel>Permisos</FormLabel>
            <div className="grid grid-cols-2 gap-3">
              {availablePermissions.map((perm) => (
                <FormField
                  key={perm.value}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(perm.value)}
                          onCheckedChange={(checked) => {
                            // Toggle permission
                          }}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 font-normal">{perm.label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </FormItem>
        )}
      />

      {/* 3. Toggle suscripción automática */}
      <FormField
        name="createSubscription"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Suscripción automática a alertas</FormLabel>
              <FormDescription>
                El usuario recibirá notificaciones de alertas de este centro (solo WARNING y CRITICAL)
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>

    <DialogFooter>
      <Button variant="outline" onClick={handleCancel}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit}>Asignar Responsable</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Handler de submit:**

```typescript
async function handleSubmit(data: FormData) {
  const result = await assignResponsibility({
    userId: data.userId,
    scope: "COST_CENTER",
    scopeId: costCenterId,
    permissions: data.permissions,
    createSubscription: data.createSubscription ?? true,
  });

  if (result.success) {
    toast.success("Responsable asignado correctamente");
    // Revalidar lista
    router.refresh();
  } else {
    toast.error(result.error);
  }
}
```

#### Dialog Editar Permisos (`edit-permissions-dialog.tsx`)

Similar a `AddResponsibleDialog` pero:

- Usuario readonly (ya seleccionado)
- Permisos precargados desde `responsibility.permissions`
- Botón "Actualizar Permisos" en lugar de "Asignar"
- Llama a `updateResponsibility()` en lugar de `assignResponsibility()`

#### Actualizar Listado de Centros

**Modificar:** `/dashboard/cost-centers/page.tsx`

**Añadir columna "Acciones":**

```tsx
{
  id: "actions",
  cell: ({ row }) => {
    const center = row.original;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/cost-centers/${center.id}`}>
              Ver Detalle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Editar</DropdownMenuItem>
          <DropdownMenuItem>Desactivar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
```

---

## 📊 Labels de Permisos (Constantes)

```typescript
export const permissionLabels: Record<Permission, string> = {
  VIEW_EMPLOYEES: "Ver Empleados",
  MANAGE_EMPLOYEES: "Gestionar Empleados",
  VIEW_TIME_ENTRIES: "Ver Fichajes",
  MANAGE_TIME_ENTRIES: "Gestionar Fichajes",
  VIEW_ALERTS: "Ver Alertas",
  RESOLVE_ALERTS: "Resolver Alertas",
  VIEW_SCHEDULES: "Ver Horarios",
  MANAGE_SCHEDULES: "Gestionar Horarios",
  VIEW_PTO_REQUESTS: "Ver Ausencias",
  APPROVE_PTO_REQUESTS: "Aprobar Ausencias",
};

export const availablePermissions = [
  { value: "VIEW_EMPLOYEES" as const, label: "Ver Empleados" },
  { value: "MANAGE_EMPLOYEES" as const, label: "Gestionar Empleados" },
  { value: "VIEW_TIME_ENTRIES" as const, label: "Ver Fichajes" },
  { value: "MANAGE_TIME_ENTRIES" as const, label: "Gestionar Fichajes" },
  { value: "VIEW_ALERTS" as const, label: "Ver Alertas" },
  { value: "RESOLVE_ALERTS" as const, label: "Resolver Alertas" },
  { value: "VIEW_SCHEDULES" as const, label: "Ver Horarios" },
  { value: "MANAGE_SCHEDULES" as const, label: "Gestionar Horarios" },
  { value: "VIEW_PTO_REQUESTS" as const, label: "Ver Ausencias" },
  { value: "APPROVE_PTO_REQUESTS" as const, label: "Aprobar Ausencias" },
];
```

---

## ⏸️ PENDIENTE: Tareas Restantes

### Orden de Implementación

1. ✅ **Server Actions genéricas** - COMPLETADO
2. 🔄 **Server Action**: `getCostCenterById()` con contador de responsables
3. ⏸️ **Página**: `/cost-centers/[id]/page.tsx` con estructura + tabs
4. ⏸️ **Tab Información**: Datos básicos del centro (readonly)
5. ⏸️ **Componente**: `ResponsiblesList` con DataTable
6. ⏸️ **Componente**: `AddResponsibleDialog` con búsqueda + permisos
7. ⏸️ **Componente**: `EditPermissionsDialog`
8. ⏸️ **Actualizar**: Listado para enlazar a detalle
9. ⏸️ **Testing**: Asignar, editar, eliminar responsables

### Estimación de Tiempo

| Tarea                           | Estimado | Acumulado    |
| ------------------------------- | -------- | ------------ |
| Server action getCostCenterById | 15 min   | 15 min       |
| Página detalle + tabs           | 30 min   | 45 min       |
| ResponsiblesList                | 45 min   | 1h 30min     |
| AddResponsibleDialog            | 45 min   | 2h 15min     |
| EditPermissionsDialog           | 30 min   | 2h 45min     |
| Actualizar listado              | 15 min   | 3h           |
| Testing + ajustes               | 30 min   | **3h 30min** |

---

## 🔜 Siguientes Fases

### FASE 4: Responsables de Equipos

**Ventaja del diseño genérico:**

- ✅ Reutilizar TODAS las server actions sin cambios
- ✅ Copiar componentes UI cambiando solo `scope` de "COST_CENTER" a "TEAM"
- ✅ Añadir `TeamCombobox` paginado para seleccionar equipo

**Estimado:** 2 horas (vs 4 horas si no fuera genérico)

### FASE 5: Notificaciones In-App

- Integrar con `AlertsBell` existente
- Crear notificaciones al detectar alertas
- Usar `shouldReceiveAlertNotification()` ya implementado
- Script de resumen diario

**Estimado:** 3 horas

---

## 📄 Referencias

- **[Server Actions Genéricas](../src/server/actions/area-responsibilities.ts)** - Código completo
- **[Helpers de Permisos](../src/lib/permissions/scope-helpers.ts)** - Funciones de filtrado
- **[Plan Original](./SISTEMA_RESPONSABLES_Y_ALERTAS_IMPLEMENTACION.md)** - Diseño completo
- **[Reglas de Negocio](./REGLAS_NEGOCIO_RESPONSABLES_ALERTAS.md)** - Especificación

---

**Versión:** 1.0
**Última actualización:** 2025-11-20
**Autor:** Sistema ERP TimeNow
**Estado:** 🚧 EN PROGRESO - Server actions completadas, UI pendiente
