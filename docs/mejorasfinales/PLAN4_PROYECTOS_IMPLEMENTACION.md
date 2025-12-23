# Plan: Mejora 4 - Proyectos Vinculados al Fichaje

## Resumen

Implementar un sistema de **proyectos** que permita asignar tiempo de trabajo a proyectos específicos. Los proyectos pueden ser **abiertos** (todos los empleados) o **restringidos** (solo empleados asignados).

## Decisiones de Diseño

| Aspecto              | Decisión                                                             |
| -------------------- | -------------------------------------------------------------------- |
| Tipo de asignación   | **OPEN** (todos) o **ASSIGNED** (empleados específicos)              |
| Momento de selección | **Al fichar entrada** - Selector de proyecto opcional                |
| Cambio de proyecto   | **Durante la jornada** - Cierra tramo anterior + abre nuevo tramo    |
| Proyectos múltiples  | **Sí** - Un empleado puede trabajar en varios proyectos el mismo día |
| Tareas/subcategorías | **Campo `task` libre** en TimeEntry (máx 255 chars), sin modelo Task |
| Referencia de patrón | **Teams** - Estructura similar de CRUD y asignación                  |
| projectId en pausas  | **NO** - BREAK no lleva projectId, solo entradas de trabajo          |

---

## FASE 1: Modelo de Datos

### 1.1 Nuevo modelo `Project` en schema.prisma

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  code        String?  // Código corto (ej: "PROJ-001")
  description String?
  color       String?  // Color para UI (hex)

  // Tipo de acceso
  accessType  ProjectAccessType @default(OPEN)

  // Estado
  isActive    Boolean  @default(true)  // false = no permite nuevos fichajes pero aparece en históricos

  // Multi-tenant
  orgId       String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Relaciones
  assignments ProjectAssignment[]
  timeEntries TimeEntry[]

  // Auditoría
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([orgId, name])         // Nombre único por organización
  @@unique([orgId, code])         // Código único por organización (si se usa)
  @@index([orgId])
  @@index([isActive])
  @@map("projects")
}

enum ProjectAccessType {
  OPEN      // Todos los empleados pueden fichar en este proyecto
  ASSIGNED  // Solo empleados asignados pueden fichar
}

model ProjectAssignment {
  id          String   @id @default(cuid())

  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  // Metadatos
  role        String?  // Rol en el proyecto (opcional)
  assignedAt  DateTime @default(now())

  @@unique([projectId, employeeId])
  @@index([projectId])
  @@index([employeeId])
  @@map("project_assignments")
}
```

### 1.2 Modificar `TimeEntry` - Añadir relación con proyecto

```prisma
model TimeEntry {
  // ... campos existentes ...

  // NUEVO: Proyecto asociado al fichaje
  // REGLA: Solo en entradas de trabajo (CLOCK_IN), NO en BREAK
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  task        String?  @db.VarChar(255) // Tarea/descripción corta (máx 255 chars)

  @@index([projectId])
}
```

### 1.3 Migración

```bash
npx prisma migrate dev --name add_projects_system
```

---

## FASE 2: Server Actions

### 2.1 Crear `/src/server/actions/projects.ts`

**Funciones CRUD:**

- `getProjects()` - Listar proyectos de la org
- `getProjectById(id)` - Obtener proyecto con asignaciones
- `createProject(data)` - Crear proyecto
- `updateProject(id, data)` - Actualizar proyecto
- `toggleProjectStatus(id)` - Activar/desactivar
- `deleteProject(id)` - Eliminar (solo si no tiene timeEntries)

**Funciones de asignación:**

- `getProjectAssignments(projectId)` - Empleados asignados
- `assignEmployeesToProject(projectId, employeeIds)` - Asignar empleados
- `removeEmployeeFromProject(projectId, employeeId)` - Desasignar

**Funciones para fichaje:**

```typescript
async function getAvailableProjects(): Promise<Project[]> {
  // 1. Solo proyectos con isActive=true
  // 2. Solo proyectos de la misma org que el empleado
  // 3. Si accessType=OPEN → incluir
  // 4. Si accessType=ASSIGNED → solo si existe ProjectAssignment del empleado
  // 5. Ordenar por nombre
  // 6. Si hay muchos, añadir paginación/búsqueda
}
```

### 2.2 Validación centralizada

```typescript
// Misma lógica para clockIn y changeProject
async function validateProjectForEmployee(
  projectId: string,
  employeeId: string,
  orgId: string,
): Promise<{ valid: boolean; error?: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { assignments: true },
  });

  if (!project) {
    return { valid: false, error: "Proyecto no encontrado" };
  }
  if (!project.isActive) {
    return { valid: false, error: "Proyecto no disponible" };
  }
  if (project.orgId !== orgId) {
    return { valid: false, error: "Proyecto no pertenece a tu organización" };
  }
  if (project.accessType === "ASSIGNED") {
    const isAssigned = project.assignments.some((a) => a.employeeId === employeeId);
    if (!isAssigned) {
      return { valid: false, error: "No estás asignado a este proyecto" };
    }
  }
  return { valid: true };
}
```

### 2.3 Modificar `/src/server/actions/time-tracking.ts`

**Modificar `clockIn()`:**

```typescript
export async function clockIn(
  latitude?: number,
  longitude?: number,
  accuracy?: number,
  projectId?: string, // NUEVO
  task?: string, // NUEVO (máx 255 chars)
): Promise<ClockInResult> {
  // Validar proyecto si se proporciona
  if (projectId) {
    const validation = await validateProjectForEmployee(projectId, employeeId, orgId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
  }
  // ... resto de la lógica existente
}
```

**Nueva función `changeProject()`:**

```typescript
export async function changeProject(
  newProjectId: string | null,
  task?: string,
): Promise<{ success: boolean; error?: string }> {
  // REGLA IMPORTANTE: El tiempo anterior queda imputado al proyecto anterior
  // y el tiempo posterior al nuevo proyecto
  // 1. Verificar que está fichado (CLOCKED_IN o ON_BREAK)
  // 2. Si está ON_BREAK, el cambio aplica al siguiente tramo de trabajo
  // 3. Validar el nuevo proyecto (si se proporciona)
  // 4. Crear nuevo TimeEntry tipo CLOCK_IN con nuevo projectId
  //    - Este marca el inicio del nuevo tramo
  //    - El tramo anterior termina aquí
  // 5. NO sobrescribir projectId de entradas anteriores
  // Para informes: calcular tiempo por proyecto =
  //   tiempo entre CLOCK_IN con projectId X hasta siguiente cambio o CLOCK_OUT
}
```

---

## FASE 3: UI de Gestión de Proyectos

### 3.1 Crear ruta `/dashboard/projects/` (Solo ADMIN/HR)

**Estructura de archivos:**

```
src/app/(main)/dashboard/projects/
├── page.tsx                           # Listado con DataTable + Tabs
├── [id]/
│   └── page.tsx                       # Detalle del proyecto
└── _components/
    ├── projects-columns.tsx           # Columnas DataTable
    ├── create-project-dialog.tsx      # Dialog crear
    ├── edit-project-dialog.tsx        # Dialog editar
    ├── project-employees-tab.tsx      # Tab empleados asignados
    └── assign-employees-dialog.tsx    # Dialog asignar empleados
```

**Permisos:**

- `/dashboard/projects/**` → Solo roles ADMIN, HR
- Los empleados NO acceden a esta pantalla, solo usan el selector en fichaje

**Tabs del listado:**

- Activos (default)
- Inactivos
- Todos

**Columnas DataTable:**
| Columna | Descripción |
|---------|-------------|
| Nombre | Nombre del proyecto |
| Código | Código corto |
| Tipo | Badge "Abierto" / "Asignado" |
| Empleados | Contador de asignados (solo si ASSIGNED) |
| Estado | Badge Activo/Inactivo |
| Acciones | Editar, Ver, Desactivar |

### 3.2 Añadir a navegación

Modificar `/src/navigation/sidebar-nav.tsx`:

```typescript
{
  title: "Proyectos",
  icon: FolderKanban, // de lucide-react
  href: "/dashboard/projects",
  roles: ["ADMIN", "HR"], // Solo visible para estos roles
}
```

---

## FASE 4: UI de Fichaje con Proyecto

### 4.1 Modificar `/src/app/(main)/dashboard/me/clock/_components/clock-in.tsx`

**Nuevo componente `ProjectSelector`:**

```tsx
<ProjectSelector
  projects={availableProjects}
  selectedProjectId={selectedProject}
  onSelect={setSelectedProject}
  task={task}
  onTaskChange={setTask}
  disabled={isLoading}
/>
```

**Comportamiento UX:**

- Si no hay proyectos activos → no mostrar selector
- Si hay **un solo proyecto** → preseleccionarlo automáticamente
- Si hay **muchos proyectos** → añadir buscador dentro del selector
- Mostrar en cada opción:
  - Nombre del proyecto
  - Código (si existe)
  - Badge "Abierto" / "Asignado" (opcional)
- Campo `task` solo visible si hay proyecto seleccionado

### 4.2 Nuevo componente `ChangeProjectDialog`

**Ubicación:** Junto a los botones de pausa cuando está fichado

```tsx
{
  (currentStatus === "CLOCKED_IN" || currentStatus === "ON_BREAK") && (
    <ChangeProjectDialog
      currentProject={currentProject}
      availableProjects={availableProjects}
      onChangeProject={handleChangeProject}
    />
  );
}
```

**Comportamiento:**

- Si está ON_BREAK, mostrar aviso: "El cambio de proyecto aplicará cuando reanudes el trabajo"
- Confirmar antes de cambiar

### 4.3 Modificar `TimeEntriesTimeline`

Mostrar proyecto en cada entrada de trabajo:

```tsx
{
  entry.entryType === "CLOCK_IN" && entry.project && (
    <Badge variant="outline" style={{ borderColor: entry.project.color }}>
      {entry.project.name}
    </Badge>
  );
}
{
  entry.task && <span className="text-muted-foreground text-xs">{entry.task}</span>;
}
```

**Nota:** NO mostrar proyecto en entradas BREAK

---

## FASE 5: Informes por Proyecto

### 5.1 Crear `/dashboard/projects/[id]/reports/`

**Métricas a mostrar:**

- Horas totales del proyecto
- Horas por empleado (tabla)
- Horas por día/semana (gráfico)
- Top empleados por horas

### 5.2 Cálculo de horas por proyecto

**IMPORTANTE:** Usar la misma lógica de cálculo que WorkdaySummary, NO aproximaciones.

```typescript
// Para cada día:
// 1. Obtener TimeEntries del día ordenados por timestamp
// 2. Identificar tramos de trabajo por proyecto:
//    - Tramo inicia con CLOCK_IN (con projectId X)
//    - Tramo termina con:
//      - Siguiente CLOCK_IN (cambio de proyecto)
//      - CLOCK_OUT
//      - BREAK_START (pausa)
// 3. Restar tiempo de pausas del tramo
// 4. Sumar tiempo de cada tramo a su respectivo proyecto

async function calculateProjectHours(
  projectId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  totalMinutes: number;
  byEmployee: { employeeId: string; minutes: number }[];
  byDay: { date: Date; minutes: number }[];
}> {
  // Usar lógica existente de cálculo de horas, no aproximaciones
}
```

### 5.3 Comportamiento con proyectos desactivados

- Si un proyecto se desactiva a mitad de mes:
  - Informes históricos **siguen contando** el tiempo acumulado antes de la desactivación
  - El proyecto aparece en informes con datos históricos
  - NO se pueden crear nuevos fichajes hacia ese proyecto

---

## Archivos a Crear/Modificar

| #   | Archivo                                                                   | Acción    | Descripción                                                   |
| --- | ------------------------------------------------------------------------- | --------- | ------------------------------------------------------------- |
| 1   | `prisma/schema.prisma`                                                    | Modificar | Añadir Project, ProjectAssignment, modificar TimeEntry        |
| 2   | `src/server/actions/projects.ts`                                          | Crear     | Server actions de proyectos                                   |
| 3   | `src/server/actions/time-tracking.ts`                                     | Modificar | Añadir projectId a clockIn, nueva changeProject(), validación |
| 4   | `src/app/(main)/dashboard/projects/page.tsx`                              | Crear     | Listado de proyectos (ADMIN/HR)                               |
| 5   | `src/app/(main)/dashboard/projects/[id]/page.tsx`                         | Crear     | Detalle de proyecto                                           |
| 6   | `src/app/(main)/dashboard/projects/_components/*.tsx`                     | Crear     | Componentes del módulo                                        |
| 7   | `src/app/(main)/dashboard/me/clock/_components/clock-in.tsx`              | Modificar | Añadir selector de proyecto                                   |
| 8   | `src/app/(main)/dashboard/me/clock/_components/project-selector.tsx`      | Crear     | Componente selector con búsqueda                              |
| 9   | `src/app/(main)/dashboard/me/clock/_components/change-project-dialog.tsx` | Crear     | Dialog cambiar proyecto                                       |
| 10  | `src/app/(main)/dashboard/me/clock/_components/time-entries-timeline.tsx` | Modificar | Mostrar proyecto en timeline                                  |
| 11  | `src/navigation/sidebar-nav.tsx`                                          | Modificar | Añadir enlace a Proyectos (solo ADMIN/HR)                     |

---

## Orden de Implementación

| Paso | Descripción                   | Archivos                               | Estado        |
| ---- | ----------------------------- | -------------------------------------- | ------------- |
| 1    | Schema + Migración            | `prisma/schema.prisma`                 | ✅ Completado |
| 2    | Server Actions proyectos      | `src/server/actions/projects.ts`       | ✅ Completado |
| 3    | UI Gestión proyectos          | `/dashboard/projects/**`               | ✅ Completado |
| 4    | Navegación                    | `sidebar-nav.tsx`                      | ✅ Completado |
| 5    | Validación centralizada       | `time-tracking.ts`                     | ✅ Completado |
| 6    | Modificar clockIn con project | `time-tracking.ts`                     | ✅ Completado |
| 7    | UI Selector proyecto          | `clock-in.tsx`, `project-selector.tsx` | ✅ Completado |
| 8    | Función changeProject         | `time-tracking.ts`                     | ✅ Completado |
| 9    | UI Cambiar proyecto           | `change-project-dialog.tsx`            | ✅ Completado |
| 10   | UI Timeline con proyecto      | `time-entries-timeline.tsx`            | ✅ Completado |
| 11   | Informes básicos              | `/dashboard/projects/[id]/reports/`    | ✅ Completado |
| 12   | Pruebas manuales              | -                                      | ✅ Completado |

---

## Mejoras Adicionales Implementadas

| Mejora              | Descripción                                                    |
| ------------------- | -------------------------------------------------------------- |
| PROJECT_SWITCH      | Nuevo tipo de entrada para cambios de proyecto durante jornada |
| Permisos API        | Protección de endpoints con validación de permisos             |
| Filtro automático   | Marcadores automáticos filtrados de timeline/mapa              |
| Informes con fechas | Selector de rango de fechas con presets (7 días default)       |
| Enlaces empleados   | Click en nombre de empleado en informes lleva a su perfil      |
| Hardening           | Validaciones robustas en capa de server actions                |

---

## Estado Final: ✅ COMPLETADO

Mergeado a `main` el 2024-12-08. Commit: `ae9ad5a`

---

## Reglas de Negocio (Resumen)

1. **Proyecto desactivado** → No permite nuevos fichajes pero aparece en históricos
2. **projectId solo en CLOCK_IN** → BREAK no lleva projectId
3. **Validar orgId** → Project.orgId debe coincidir con orgId del empleado
4. **Cambio de proyecto** → Cierra tramo anterior, abre nuevo. No sobrescribe
5. **ON_BREAK + cambio** → El cambio aplica al siguiente tramo de trabajo
6. **Informes** → Usar misma lógica de cálculo que WorkdaySummary
7. **Un solo proyecto disponible** → Preseleccionarlo en el selector
8. **task** → Máximo 255 caracteres, descripción corta tipo "Reunión cliente"
9. **Gestión proyectos** → Solo ADMIN/HR acceden a /dashboard/projects/
10. **Selector fichaje** → Todos los empleados (filtrado por accessType)
