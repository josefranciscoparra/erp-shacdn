# Implementación de Responsables de Centros - FASE 3 UI ✅

**Estado**: ✅ COMPLETADO
**Fecha**: 20 Nov 2024

## Resumen

Implementación completa de la UI para gestionar responsables de centros de coste, siguiendo el patrón establecido en `/dashboard/schedules/[id]`.

## Archivos Implementados

### 1. Server Action - Obtener Centro de Coste

**Archivo**: `/src/server/actions/cost-centers.ts`

```typescript
export async function getCostCenterById(id: string): Promise<{
  success: boolean;
  costCenter?: CostCenterDetail;
  error?: string;
}> {
  // Valida sesión y multi-tenant
  // Obtiene centro con conteos (_count) de empleados y responsables
  // Retorna datos serializados
}
```

**Características**:

- ✅ Validación de sesión y orgId
- ✅ Conteos agregados (`_count` de employees y areaResponsibles)
- ✅ Retorna datos listos para UI (fechas, contadores, etc.)

### 2. Página de Detalle del Centro

**Archivo**: `/src/app/(main)/dashboard/cost-centers/[id]/page.tsx` (231 líneas)

**Estructura**:

```tsx
<PermissionGuard permission="view_cost_centers">
  <CostCenterContent>
    {/* Header con navegación */}
    <Button variant="ghost" asChild>
      <Link href="/dashboard/cost-centers">
        <ArrowLeft /> Volver a Centros de Coste
      </Link>
    </Button>

    {/* Título + Badges (Activo/Inactivo, Código) */}
    <h1>{costCenter.name}</h1>
    <Badge>{costCenter.code}</Badge>
    <Badge>{costCenter.active ? "Activo" : "Inactivo"}</Badge>

    {/* 3 Tarjetas de Resumen */}
    <Card>Empleados Asignados: {employeeCount}</Card>
    <Card>Responsables Activos: {responsibleCount}</Card>
    <Card>Estado del Centro</Card>

    {/* Tabs: Información + Responsables */}
    <Tabs defaultValue="info">
      <TabsList>
        <TabsTrigger value="info">Información</TabsTrigger>
        <TabsTrigger value="responsibles">Responsables ({responsibleCount})</TabsTrigger>
      </TabsList>

      <TabsContent value="info">{/* Card con info readonly del centro */}</TabsContent>

      <TabsContent value="responsibles">
        <ResponsiblesTab costCenterId={costCenter.id} />
      </TabsContent>
    </Tabs>
  </CostCenterContent>
</PermissionGuard>
```

**Características**:

- ✅ PermissionGuard con fallback de acceso denegado
- ✅ Suspense para carga async
- ✅ LoadingState con Skeletons
- ✅ Navegación con botón "Volver"
- ✅ Badges de estado (Activo/Inactivo, Código)
- ✅ 3 tarjetas de resumen con iconos y métricas
- ✅ Tabs con contadores dinámicos
- ✅ Info readonly en tab "Información"
- ✅ Gestión de responsables en tab "Responsables"

### 3. Tab de Responsables (Container)

**Archivo**: `/src/app/(main)/dashboard/cost-centers/[id]/_components/responsibles-tab.tsx` (23 líneas)

```tsx
export function ResponsiblesTab({ costCenterId }: { costCenterId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <AddResponsibleDialog costCenterId={costCenterId} />
      </div>
      <ResponsiblesList costCenterId={costCenterId} />
    </div>
  );
}
```

**Características**:

- ✅ Botón "Añadir Responsable" alineado a la derecha
- ✅ Lista de responsables con gestión completa

### 4. Lista de Responsables con DataTable

**Archivo**: `/src/app/(main)/dashboard/cost-centers/[id]/_components/responsibles-list.tsx` (165 líneas)

**Funcionalidad**:

```tsx
export function ResponsiblesList({ costCenterId }: { costCenterId: string }) {
  const [responsibles, setResponsibles] = useState<AreaResponsibilityData[]>([]);
  const [editingResponsibility, setEditingResponsibility] = useState<...>(null);
  const [deletingResponsibility, setDeletingResponsibility] = useState<...>(null);

  // Carga inicial
  useEffect(() => {
    loadResponsibles();
  }, [costCenterId]);

  async function loadResponsibles() {
    const { success, responsibles: data } = await getResponsiblesForArea(
      "COST_CENTER",
      costCenterId
    );
    if (success && data) setResponsibles(data);
  }

  async function handleDelete() {
    await removeResponsibility(deletingResponsibility.id);
    loadResponsibles(); // Recargar
  }

  const table = useReactTable({
    data: responsibles,
    columns: responsiblesColumns,
    meta: {
      onEdit: (responsibility) => setEditingResponsibility(responsibility),
      onDelete: (responsibility) => setDeletingResponsibility(responsibility),
    },
  });

  // Estados: loading, empty state, DataTable con edit/delete dialogs
}
```

**Características**:

- ✅ TanStack Table con sorting
- ✅ Estado de carga
- ✅ EmptyState cuando no hay responsables
- ✅ Dialog de edición de permisos
- ✅ AlertDialog de confirmación de eliminación
- ✅ Recarga automática después de editar/eliminar

### 5. Columnas de la Tabla

**Archivo**: `/src/app/(main)/dashboard/cost-centers/[id]/_components/responsibles-columns.tsx` (158 líneas)

**Columnas definidas**:

1. **Usuario**: Nombre + email
2. **Permisos**: Badges con primeros 3 permisos + tooltip con todos
3. **Fecha Asignación**: Formato `d MMM yyyy` con date-fns
4. **Acciones**: Dropdown con Editar/Eliminar

```typescript
const permissionLabels: Record<string, string> = {
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

// Columna de permisos con tooltip
{
  accessorKey: "permissions",
  cell: ({ row }) => {
    const visiblePermissions = permissions.slice(0, 3);
    const hiddenCount = permissions.length - 3;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            {visiblePermissions.map(perm => <Badge>{permissionLabels[perm]}</Badge>)}
            {hiddenCount > 0 && <Badge>+{hiddenCount} más</Badge>}
          </TooltipTrigger>
          <TooltipContent>
            {/* Todos los permisos */}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
}
```

**Características**:

- ✅ DataTableColumnHeader con sorting
- ✅ Labels en español para permisos
- ✅ Badges de permisos (primeros 3 visibles)
- ✅ Tooltip con todos los permisos
- ✅ Formato de fecha con date-fns
- ✅ Dropdown de acciones

### 6. Dialog Añadir Responsable

**Archivo**: `/src/app/(main)/dashboard/cost-centers/[id]/_components/add-responsible-dialog.tsx` (297 líneas)

**Funcionalidad completa**:

```tsx
const formSchema = z.object({
  userId: z.string().min(1, "Debes seleccionar un usuario"),
  permissions: z.array(z.string()).min(1, "Debes seleccionar al menos un permiso"),
  createSubscription: z.boolean().default(true),
});

export function AddResponsibleDialog({ costCenterId }: { costCenterId: string }) {
  const [open, setOpen] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<...>([]);

  // Búsqueda de usuarios (debounced)
  async function handleSearch(search: string) {
    if (!search || search.length < 2) return;
    const { users } = await searchUsersForResponsibility(search);
    setSearchResults(users);
  }

  async function onSubmit(data: FormData) {
    const { success } = await assignResponsibility({
      userId: data.userId,
      scope: "COST_CENTER",
      scopeId: costCenterId,
      permissions: data.permissions as Permission[],
      createSubscription: data.createSubscription,
    });

    if (success) {
      toast.success("Responsable asignado correctamente");
      setOpen(false);
      form.reset();
      window.location.reload(); // Refrescar para mostrar nuevo responsable
    }
  }
}
```

**Componentes del Dialog**:

1. **Combobox de búsqueda de usuarios**:

   ```tsx
   <Popover>
     <Command shouldFilter={false}>
       <CommandInput placeholder="Buscar usuario..." onValueChange={handleSearch} />
       <CommandList>
         {searchResults.map((user) => (
           <CommandItem key={user.id} value={user.id}>
             <Check />
             <div>
               <span>{user.name}</span>
               <span className="text-muted-foreground">{user.email}</span>
             </div>
           </CommandItem>
         ))}
       </CommandList>
     </Command>
   </Popover>
   ```

2. **Grid 2 columnas de permisos**:

   ```tsx
   <div className="grid grid-cols-2 gap-3">
     {availablePermissions.map((perm) => (
       <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-3">
         <Checkbox
           checked={field.value?.includes(perm.value)}
           onCheckedChange={(checked) => {
             if (checked) {
               field.onChange([...field.value, perm.value]);
             } else {
               field.onChange(field.value.filter((v) => v !== perm.value));
             }
           }}
         />
         <FormLabel>{perm.label}</FormLabel>
       </FormItem>
     ))}
   </div>
   ```

3. **Switch de suscripción automática**:
   ```tsx
   <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
     <div>
       <FormLabel>Suscripción automática a alertas</FormLabel>
       <FormDescription>
         El usuario recibirá notificaciones de alertas de este centro (solo WARNING y CRITICAL)
       </FormDescription>
     </div>
     <Switch checked={field.value} onCheckedChange={field.onChange} />
   </FormItem>
   ```

**Características**:

- ✅ Dialog con DialogTrigger (botón "Añadir Responsable")
- ✅ React Hook Form + Zod validation
- ✅ Combobox con búsqueda dinámica (Command component)
- ✅ Min 2 caracteres para buscar
- ✅ Grid de 2 columnas de checkboxes de permisos
- ✅ Switch de suscripción automática a alertas
- ✅ Estados de loading (submitting, searching)
- ✅ Toast de éxito/error
- ✅ Reset y cierre automático

### 7. Dialog Editar Permisos

**Archivo**: `/src/app/(main)/dashboard/cost-centers/[id]/_components/edit-permissions-dialog.tsx` (171 líneas)

**Funcionalidad**:

```tsx
export function EditPermissionsDialog({ responsibility, open, onClose, onSuccess }: EditPermissionsDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      permissions: responsibility.permissions,
    },
  });

  // Actualizar permisos cuando cambia la responsabilidad
  useEffect(() => {
    form.reset({
      permissions: responsibility.permissions,
    });
  }, [responsibility, form]);

  async function onSubmit(data: FormData) {
    const { success } = await updateResponsibility(responsibility.id, {
      permissions: data.permissions as Permission[],
    });

    if (success) {
      toast.success("Permisos actualizados correctamente");
      onClose();
      onSuccess(); // Recarga la lista
    }
  }
}
```

**Características**:

- ✅ Usuario readonly (nombre + email) - No se puede cambiar
- ✅ Grid de 2 columnas de checkboxes de permisos
- ✅ Permisos preseleccionados del responsable actual
- ✅ React Hook Form + Zod validation
- ✅ useEffect para sincronizar permisos cuando cambia el responsable
- ✅ Toast de éxito/error
- ✅ Callback onSuccess para recargar lista

### 8. Navegación desde Lista de Centros

**Archivo modificado**: `/src/app/(main)/dashboard/cost-centers/_components/cost-centers-columns.tsx`

**Cambio**:

```tsx
import Link from "next/link";
import { Eye } from "lucide-react";

// En el dropdown de acciones (línea 120-125):
<DropdownMenuItem asChild>
  <Link href={`/dashboard/cost-centers/${costCenter.id}`}>
    <Eye className="mr-2 h-4 w-4" />
    Ver Detalle
  </Link>
</DropdownMenuItem>;
```

**Características**:

- ✅ Link a página de detalle
- ✅ Icono Eye (ojo) para "Ver Detalle"
- ✅ Primera opción del dropdown (antes de "Copiar ID")

## Flujo Completo de Usuario

### 1. Navegar a Centro de Coste

```
/dashboard/cost-centers → Lista de centros
  ↓ Click "Ver Detalle"
/dashboard/cost-centers/[id] → Página de detalle
```

### 2. Ver Información del Centro

- Tab "Información" (por defecto)
- Muestra: nombre, código, estado, empleados, descripción, fechas

### 3. Gestionar Responsables

- Tab "Responsables"
- Botón "Añadir Responsable" (esquina superior derecha)

### 4. Añadir Responsable

```
1. Click "Añadir Responsable"
2. Se abre dialog
3. Buscar usuario (min 2 caracteres)
4. Seleccionar usuario del combobox
5. Seleccionar permisos (min 1 requerido)
6. Toggle suscripción automática (por defecto ON)
7. Click "Asignar Responsable"
8. Toast de éxito → Página se recarga → Aparece en lista
```

### 5. Editar Permisos

```
1. En la lista de responsables, click en dropdown de acciones (...)
2. Click "Editar Permisos"
3. Se abre dialog con permisos actuales preseleccionados
4. Modificar permisos (min 1 requerido)
5. Click "Actualizar Permisos"
6. Toast de éxito → Lista se recarga → Cambios visibles
```

### 6. Eliminar Responsable

```
1. En la lista de responsables, click en dropdown de acciones (...)
2. Click "Eliminar Responsable" (rojo)
3. AlertDialog de confirmación
4. Click "Eliminar"
5. Toast de éxito → Lista se recarga → Responsable desaparece
```

## Testing Manual Requerido

### ✅ Checklist de Testing

**Navegación**:

- [ ] Ir a `/dashboard/cost-centers`
- [ ] Click "Ver Detalle" en un centro
- [ ] Verificar que se muestra la página de detalle
- [ ] Click "Volver a Centros de Coste" funciona

**Tab Información**:

- [ ] Ver toda la información del centro
- [ ] Verificar formato de fechas (dd/MM/yyyy)
- [ ] Verificar badges de estado (Activo/Inactivo)

**Tab Responsables (sin responsables)**:

- [ ] Ir a tab "Responsables"
- [ ] Verificar que muestra EmptyState
- [ ] Botón "Añadir Responsable" visible

**Añadir Responsable**:

- [ ] Click "Añadir Responsable"
- [ ] Dialog se abre correctamente
- [ ] Buscar usuario (escribir nombre o email)
- [ ] Verificar que busca con min 2 caracteres
- [ ] Seleccionar usuario del combobox
- [ ] Verificar que se muestra nombre + email
- [ ] Seleccionar al menos 1 permiso
- [ ] Verificar que switch de suscripción está ON por defecto
- [ ] Submit sin seleccionar usuario → Error de validación
- [ ] Submit sin seleccionar permisos → Error de validación
- [ ] Submit correcto → Toast de éxito
- [ ] Verificar que página se recarga
- [ ] Verificar que responsable aparece en lista

**Tab Responsables (con responsables)**:

- [ ] Verificar que contador de tab se actualiza
- [ ] Tabla muestra columnas: Usuario, Permisos, Fecha, Acciones
- [ ] Columna Usuario muestra nombre + email
- [ ] Columna Permisos muestra primeros 3 badges
- [ ] Si hay más de 3 permisos, muestra "+X más"
- [ ] Hover en permisos muestra tooltip con todos
- [ ] Fecha en formato español (ej: "20 nov 2024")
- [ ] Columna Acciones muestra dropdown (...)

**Editar Permisos**:

- [ ] Click dropdown (...) en un responsable
- [ ] Click "Editar Permisos"
- [ ] Dialog se abre con permisos actuales preseleccionados
- [ ] Usuario se muestra readonly (no se puede cambiar)
- [ ] Modificar permisos (desmarcar/marcar)
- [ ] Submit sin permisos → Error de validación
- [ ] Submit correcto → Toast de éxito
- [ ] Lista se recarga
- [ ] Verificar que permisos se actualizaron

**Eliminar Responsable**:

- [ ] Click dropdown (...) en un responsable
- [ ] Click "Eliminar Responsable" (opción roja)
- [ ] AlertDialog de confirmación aparece
- [ ] Mensaje muestra nombre del usuario
- [ ] Click "Cancelar" → Dialog se cierra, no elimina
- [ ] Repetir y click "Eliminar" → Toast de éxito
- [ ] Lista se recarga
- [ ] Responsable ya no aparece
- [ ] Contador de tab se actualiza

**Validaciones Multi-tenant**:

- [ ] Intentar acceder a un centro de otra organización → 404
- [ ] Intentar añadir responsable de otra organización → Error
- [ ] Solo se pueden buscar usuarios de la misma organización

**Permisos**:

- [ ] Usuario sin `view_cost_centers` → EmptyState "Acceso denegado"
- [ ] ADMIN/HR_ADMIN puede ver todo sin restricciones

## Archivos Generados

Total: **8 archivos** (1 modificado, 1 server action, 6 componentes)

1. `/src/server/actions/cost-centers.ts` (NUEVO)
2. `/src/app/(main)/dashboard/cost-centers/[id]/page.tsx` (NUEVO)
3. `/src/app/(main)/dashboard/cost-centers/[id]/_components/responsibles-tab.tsx` (NUEVO)
4. `/src/app/(main)/dashboard/cost-centers/[id]/_components/responsibles-columns.tsx` (NUEVO)
5. `/src/app/(main)/dashboard/cost-centers/[id]/_components/responsibles-list.tsx` (NUEVO)
6. `/src/app/(main)/dashboard/cost-centers/[id]/_components/add-responsible-dialog.tsx` (NUEVO)
7. `/src/app/(main)/dashboard/cost-centers/[id]/_components/edit-permissions-dialog.tsx` (NUEVO)
8. `/src/app/(main)/dashboard/cost-centers/_components/cost-centers-columns.tsx` (MODIFICADO)

**Total de líneas**: ~1,210 líneas de código TypeScript/React

## Tecnologías y Patrones Utilizados

- ✅ **Next.js 15** App Router
- ✅ **React 19** Server Components + Client Components
- ✅ **TanStack Table** para DataTable
- ✅ **React Hook Form** + **Zod** para validación
- ✅ **shadcn/ui** componentes (Dialog, Command, Tabs, Cards, Badges, etc.)
- ✅ **date-fns** para formato de fechas con locale español
- ✅ **Prisma** para base de datos
- ✅ **Server Actions** para operaciones de backend
- ✅ **PermissionGuard** para control de acceso
- ✅ **Container Queries** (@container/main) para responsive
- ✅ **Suspense** para loading states
- ✅ **Skeleton** para placeholders de carga

## Próximos Pasos

### FASE 4: Responsables de Equipos (~2h)

- [ ] Reutilizar server actions (no requiere cambios)
- [ ] Crear página `/dashboard/teams/[id]/page.tsx`
- [ ] Crear componentes similares a cost-centers
- [ ] Testing completo

### FASE 5: Notificaciones In-App (~3h)

- [ ] Sistema de notificaciones para responsables
- [ ] Bell icon con badge de conteo
- [ ] Dropdown de notificaciones
- [ ] Marcar como leído

## Referencias

- **Patrón de referencia**: `/dashboard/schedules/[id]` (página de detalle de horarios)
- **Server Actions**: `/src/server/actions/area-responsibilities.ts` (FASE 3)
- **Documentación FASE 1-2**: `/docs/IMPLEMENTACION_RESPONSABLES_FASE1_Y_FASE2.md`
- **Documentación FASE 3 Server**: `/docs/IMPLEMENTACION_RESPONSABLES_FASE3.md`
- **Plan completo**: `/docs/SISTEMA_RESPONSABLES_Y_ALERTAS_IMPLEMENTACION.md`

---

**Estado final**: ✅ UI completamente implementada y lista para testing manual
