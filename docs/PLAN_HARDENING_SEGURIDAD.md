# Plan: Hardening de Seguridad Backend (Server Actions)

**Fecha:** 23 Diciembre 2025
**Estado:** FASE 1 COMPLETADA ✅

---

## Problema

El backend confía solo en `requireOrg()` que verifica pertenencia a la organización, pero **NO verifica permisos específicos**. Un empleado básico puede invocar server actions de administrador si conoce la ruta.

---

## Principios de Diseño

1.  **Autoservicio:** El empleado siempre puede ver y gestionar sus propios datos (fichajes, horario) sin permisos especiales.
2.  **Gestión:** Modificar datos de otros requiere permisos explícitos (`manage_time_tracking`, `approve_requests`, etc.).
3.  **Eficiencia:** Proteger la entrada pública (Server Action), no la lógica interna reutilizable, para evitar comprobaciones redundantes.

---

## FASE 1: Horarios (schedules-v2.ts) - ✅ COMPLETADA

### Criterio aplicado:
- **Escritura** (crear, modificar, borrar) → `manage_time_tracking`
- **Lectura de gestión** (selectores de empleados para asignar) → `view_time_tracking`
- **Lectura básica** (ver mi horario, catálogo de plantillas) → NO se toca (autoservicio)

### 1.1 Funciones de LECTURA de gestión → `view_time_tracking` ✅

- [x] `getTemplateAssignedEmployees`
- [x] `getAvailableEmployeesForTemplate`
- [x] `getEmployeesForBulkAssignment`
- [x] `getDepartmentsForFilters`
- [x] `getCostCentersForFilters`
- [x] `getDepartments`
- [x] `getCostCenters`
- [x] `getExceptionDaysForTemplate`
- [x] `getExceptionDaysForEmployee`
- [x] `getAllGlobalExceptions`
- [x] `getShiftRotationPatterns`
- [x] `getManualShiftAssignmentsForRange`
- [x] `getManualShiftAssignmentById`
- [x] `getManualShiftTemplates`
- [x] `getWorkZones`
- [x] `searchEmployees`
- [x] `getShiftEmployeesPaginated`

### 1.2 Funciones de ESCRITURA → `manage_time_tracking` ✅

- [x] `createScheduleTemplate`
- [x] `updateScheduleTemplate`
- [x] `deleteScheduleTemplate`
- [x] `duplicateScheduleTemplate`
- [x] `createSchedulePeriod`
- [x] `updateSchedulePeriod`
- [x] `deleteSchedulePeriod`
- [x] `updateWorkDayPattern`
- [x] `copyWorkDayPattern`
- [x] `assignScheduleToEmployee`
- [x] `endEmployeeAssignment`
- [x] `bulkAssignScheduleToEmployees`
- [x] `createExceptionDay`
- [x] `updateExceptionDay`
- [x] `deleteExceptionDay`
- [x] `createShiftRotationPattern`
- [x] `updateShiftRotationPattern`
- [x] `deleteShiftRotationPattern`
- [x] `createManualShiftAssignment`
- [x] `updateManualShiftAssignment`
- [x] `deleteManualShiftAssignment`
- [x] `deleteManualShiftAssignmentById`
- [x] `deleteMultipleManualShiftAssignments`
- [x] `copyManualShiftAssignmentsFromWeek`
- [x] `restoreManualShiftAssignments`
- [x] `publishManualShiftAssignments`
- [x] `createManualShiftTemplate`
- [x] `updateManualShiftTemplate`
- [x] `deleteManualShiftTemplate`
- [x] `applyManualShiftTemplate`
- [x] `createWorkZone`
- [x] `updateWorkZone`
- [x] `deleteWorkZone`

### 1.3 Funciones NO tocadas (autoservicio/lectura básica)

- `getEffectiveSchedule` - Empleado ve su propio horario
- `getWeekSchedule` - Empleado ve su semana
- `getScheduleTemplates` - Catálogo público de plantillas
- `getScheduleTemplateById` - Detalle de plantilla
- `getEmployeeCurrentAssignment` - Empleado ve su asignación
- `getEmployeeAssignmentHistory` - Empleado ve su historial
- `getAbsencesForRange` - Lectura básica

---

## FASE 2: Time Tracking (time-tracking.ts) - LÓGICA HÍBRIDA

Aquí aplicamos la lógica condicional para no romper el autoservicio ni a los aprobadores.

### 2.1 `recalculateWorkdaySummary`
**Riesgo:** Autoservicio vs Admin.
**Estrategia:**
```typescript
if (targetEmployeeId === currentUser.employeeId) {
  // Autoservicio: OK
} else {
  // Gestión: Requiere permiso
  await requirePermission("manage_time_tracking");
}
```

### 2.2 `recalculateWorkdaySummaryForRetroactivePto`
**Riesgo:** Aprobadores de vacaciones sin permiso de gestión de tiempo.
**Estrategia:**
```typescript
await safeAnyPermission(["approve_requests", "manage_time_tracking"]);
```

---

## FASE 3: Selectores Departamentales

Proteger la exposición de la estructura organizativa.

### 3.1 departments.ts
- [ ] `getDepartments` → `safeAnyPermission(["view_departments", "manage_organization", "view_time_tracking"])` (Permisivo para que selectores funcionen en varias pantallas).

### 3.2 cost-centers.ts
- [ ] `getCostCenters`
- [ ] `getCostCenterById` → `safeAnyPermission(["view_cost_centers", "manage_organization", "view_time_tracking"])`

---

## Pruebas de Verificación - FASE 1

### A. Pruebas de SEGURIDAD (debe FALLAR)

Login como **EMPLOYEE** (empleado raso sin permisos especiales):

1. [ ] Ir a `/dashboard/schedules` → Intentar crear plantilla de horario → **Debe dar error**
2. [ ] Ir a `/dashboard/schedules` → Intentar editar plantilla existente → **Debe dar error**
3. [ ] Ir a `/dashboard/schedules` → Intentar asignar empleado a plantilla → **Debe dar error**
4. [ ] Ir a `/dashboard/schedules` → Intentar crear excepción de día → **Debe dar error**
5. [ ] Ir a `/dashboard/schedules/shifts` → Intentar crear turno manual → **Debe dar error**

### B. Pruebas de AUTOSERVICIO (debe FUNCIONAR)

Login como **EMPLOYEE** (empleado raso):

6. [ ] Ir a `/dashboard/me/clock` → Ver mi horario del día → **Debe funcionar**
7. [ ] Ir a `/dashboard/me/schedule` → Ver mi semana/calendario → **Debe funcionar**
8. [ ] Fichar entrada/salida → **Debe funcionar**

### C. Pruebas de GESTIÓN (debe FUNCIONAR)

Login como **HR_ADMIN** o **ORG_ADMIN**:

9. [ ] Crear nueva plantilla de horario → **Debe funcionar**
10. [ ] Asignar empleado a plantilla → **Debe funcionar**
11. [ ] Crear turno manual para empleado → **Debe funcionar**
12. [ ] Publicar turnos de la semana → **Debe funcionar**

### D. Pruebas de OVERRIDE (debe FUNCIONAR con override)

Login como **HR_ASSISTANT** con override `manage_time_tracking`:

13. [ ] Crear plantilla de horario → **Debe funcionar** (tiene override)
14. [ ] Sin el override → **Debe dar error**

---