# Implementación del Módulo de Equipos

> Fecha de documentación: 29 de noviembre de 2025

---

## Resumen

Este documento describe la funcionalidad del módulo de Equipos, diferenciando entre lo que ya existía y lo que se ha implementado en esta sesión.

---

## ✅ Lo que YA EXISTÍA

### Modelo de Base de Datos (Prisma)

- `Team` - Modelo completo con campos: id, orgId, name, code, description, isActive, costCenterId, createdAt, updatedAt
- Relaciones: costCenter, employees, areaResponsibles

### Server Actions (`/src/server/actions/teams.ts`)

| Función            | Estado     | Descripción                                 |
| ------------------ | ---------- | ------------------------------------------- |
| `getTeams()`       | ✅ Existía | Listar todos los equipos de la organización |
| `getTeamById(id)`  | ✅ Existía | Obtener detalle de un equipo                |
| `createTeam(data)` | ✅ Existía | Crear nuevo equipo                          |

### Componentes UI

| Archivo                          | Estado     | Descripción                                  |
| -------------------------------- | ---------- | -------------------------------------------- |
| `/dashboard/teams/page.tsx`      | ✅ Existía | Página de listado (básica)                   |
| `/dashboard/teams/[id]/page.tsx` | ✅ Existía | Página de detalle (tabs Info + Responsables) |
| `create-team-dialog.tsx`         | ✅ Existía | Dialog para crear equipos                    |
| `teams-columns.tsx`              | ✅ Existía | Columnas de la tabla (sin acciones)          |

---

## 🆕 Lo que se ha IMPLEMENTADO

### Server Actions Nuevos (`/src/server/actions/teams.ts`)

| Función                                 | Estado   | Descripción                                  |
| --------------------------------------- | -------- | -------------------------------------------- |
| `updateTeam(id, data)`                  | 🆕 NUEVO | Actualizar equipo existente                  |
| `deleteTeam(id)`                        | 🆕 NUEVO | Eliminar equipo (solo si no tiene empleados) |
| `toggleTeamStatus(id)`                  | 🆕 NUEVO | Activar/desactivar equipo                    |
| `getTeamEmployees(teamId)`              | 🆕 NUEVO | Obtener empleados de un equipo               |
| `getAvailableEmployeesForTeam(teamId)`  | 🆕 NUEVO | Empleados disponibles para asignar           |
| `addEmployeeToTeam(teamId, employeeId)` | 🆕 NUEVO | Asignar empleado a equipo                    |
| `removeEmployeeFromTeam(employeeId)`    | 🆕 NUEVO | Quitar empleado del equipo                   |

### Server Action Auxiliar (`/src/server/actions/departments.ts`)

| Función            | Estado   | Descripción                                             |
| ------------------ | -------- | ------------------------------------------------------- |
| `getDepartments()` | 🆕 NUEVO | Obtener departamentos (para selector en EditTeamDialog) |

### Componentes UI Nuevos

| Archivo                      | Estado   | Descripción                                                                                     |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `edit-team-dialog.tsx`       | 🆕 NUEVO | Dialog para editar equipos (nombre, código, descripción, centro de coste, departamento, estado) |
| `team-employees-tab.tsx`     | 🆕 NUEVO | Tab con tabla de empleados del equipo + botón quitar                                            |
| `assign-employee-dialog.tsx` | 🆕 NUEVO | Dialog con combobox para asignar empleados                                                      |

### Componentes Modificados

| Archivo                   | Cambio        | Descripción                                                                   |
| ------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `teams-columns.tsx`       | 🔄 MODIFICADO | Ahora es factory function con acciones (Editar, Activar/Desactivar, Eliminar) |
| `page.tsx` (listado)      | 🔄 MODIFICADO | Añadidos handlers para edit, toggle, delete + EditTeamDialog controlado       |
| `[id]/page.tsx` (detalle) | 🔄 MODIFICADO | Añadido tab "Empleados" con TeamEmployeesTab                                  |

---

## 🧪 QUÉ PROBAR (Checklist de Testing)

### 1. Listado de Equipos (`/dashboard/teams`)

- [ ] **Ver equipos**: La tabla muestra todos los equipos con nombre, código, estado, empleados
- [ ] **Crear equipo**: Click en "Nuevo Equipo" → Dialog funciona → Equipo aparece en lista
- [ ] **Editar equipo**: Click en ⋮ → Editar → Modificar datos → Guardar → Cambios visibles
- [ ] **Activar/Desactivar**: Click en ⋮ → Desactivar → Estado cambia a "Inactivo"
- [ ] **Eliminar equipo**: Click en ⋮ → Eliminar → Confirmar → Equipo desaparece
- [ ] **Eliminar con empleados**: Intentar eliminar equipo CON empleados → Debe mostrar error

### 2. Detalle de Equipo (`/dashboard/teams/[id]`)

- [ ] **Tab Información**: Muestra datos correctos del equipo
- [ ] **Tab Empleados**: Muestra tabla de empleados asignados
- [ ] **Tab Responsables**: Funciona igual que antes

### 3. Gestión de Empleados (Tab Empleados)

- [ ] **Ver empleados**: La tabla muestra nombre, email, puesto, estado
- [ ] **Asignar empleado**: Click "Asignar Empleado" → Buscar → Seleccionar → Asignar
- [ ] **Empleado sin equipo**: Se puede asignar directamente
- [ ] **Empleado con otro equipo**: Muestra aviso → Se mueve al nuevo equipo
- [ ] **Quitar empleado**: Click en icono rojo → Confirmar → Empleado desaparece de tabla

### 4. Validaciones

- [ ] **Nombre requerido**: Al crear/editar, si no hay nombre → Error
- [ ] **Código único**: Si código ya existe en otro equipo → Error
- [ ] **Permisos**: Usuario sin permiso `view_teams` → Acceso denegado

### 5. Casos Edge

- [ ] **Equipo vacío**: Crear equipo sin empleados → Funciona
- [ ] **Equipo sin código**: Crear equipo solo con nombre → Funciona
- [ ] **Múltiples asignaciones rápidas**: Asignar varios empleados seguidos → Todos aparecen

---

## Archivos Clave

```
src/
├── server/actions/
│   ├── teams.ts              # Todas las acciones de equipos
│   └── departments.ts        # getDepartments para EditTeamDialog
│
├── app/(main)/dashboard/teams/
│   ├── page.tsx              # Listado de equipos
│   ├── [id]/page.tsx         # Detalle con tabs
│   └── _components/
│       ├── create-team-dialog.tsx    # Dialog crear (existía)
│       ├── edit-team-dialog.tsx      # Dialog editar (NUEVO)
│       ├── teams-columns.tsx         # Columnas con acciones
│       ├── team-employees-tab.tsx    # Tab empleados (NUEVO)
│       └── assign-employee-dialog.tsx # Dialog asignar (NUEVO)
```

---

## Notas Técnicas

1. **Patrón de Dialog Controlado**: EditTeamDialog usa estado controlado (`open`, `onOpenChange`) para integrarse con la página padre que carga los datos del equipo antes de abrir.

2. **Combobox con Grupos**: AssignEmployeeDialog separa empleados en dos grupos: "Sin equipo asignado" y "Ya asignados a otro equipo".

3. **Multi-tenant**: Todas las queries filtran por `orgId` del usuario autenticado.

4. **Validación de Eliminación**: `deleteTeam` verifica que no haya empleados antes de eliminar.

5. **Server Actions vs API Routes**: Se mantiene el patrón de Server Actions usado en el resto del módulo de equipos, aunque departamentos tenía API Routes + Zustand.
