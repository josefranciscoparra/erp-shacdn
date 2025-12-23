# Plan de Fortalecimiento de Seguridad Enterprise

**Fecha:** 23 Diciembre 2025
**Objetivo:** Eliminar la brecha de seguridad entre la UI (Sidebar) y el Backend (Server Actions), asegurando que ninguna operación de escritura o lectura sensible pueda ejecutarse sin una validación explícita de permisos en el servidor.

## 1. Diagnóstico de Situación

Actualmente, la aplicación confía en la seguridad por oscuridad en la UI:
- **Frontend:** ✅ Oculta botones/paginas correctamente usando `usePermissions`.
- **Backend:** 🚨 `requireOrg()` solo valida pertenencia a la empresa, no el *rol* ni los *permisos específicos* dentro de ella.
- **Riesgo:** Un empleado básico puede invocar Server Actions de administrador (ej. crear horarios) si conoce la ruta o usa herramientas de desarrollo.

## 2. Estrategia de Solución (Server-Side Enforcement)

Dado que no inyectaremos permisos en la sesión (JWT), implementaremos un modelo de **Verificación en Tiempo de Ejecución (Just-in-Time Verification)**.

### 2.1. Nueva Arquitectura de Verificación
Crearemos una capa de seguridad en `src/server/lib/permissions.ts` que centralice la lógica.

```typescript
// Pseudo-código del objetivo
export async function requirePermission(permission: PermissionString): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  
  // 1. Check Super Admin (Bypass)
  if (session.user.role === 'SUPER_ADMIN') return;

  // 2. Query DB eficiente
  // Verifica: Rol Base + Overrides + Responsabilidades de Área
  const hasAccess = await permissionService.check(session.user.id, session.user.orgId, permission);
  
  if (!hasAccess) {
    throw new Error(`Forbidden: Missing permission ${permission}`);
  }
}
```

## 3. Áreas de Intervención (Heatmap)

Se requiere auditar e inyectar `requirePermission` en los siguientes módulos críticos:

### A. Módulo de Horarios (Prioridad Alta 🔴)
*Archivo:* `src/server/actions/schedules-v2.ts`
- **Acciones a proteger:**
  - `createSchedulePeriod` -> `requirePermission('manage_schedule_templates')`
  - `updateSchedulePeriod`
  - `deleteSchedulePeriod`
  - `createExceptionDay`
  - `ManualShiftAssignment`

### B. Módulo de RRHH y Empleados (Prioridad Alta 🔴)
*Archivo:* `src/server/actions/employees.ts` (o similar)
- **Acciones a proteger:**
  - `createEmployee` -> `requirePermission('manage_employees')`
  - `updateEmployee`
  - `archiveEmployee`
  - **Ojo:** Un manager de departamento solo debería poder editar empleados de *su* departamento (Lógica granular).

### C. Módulo de Configuración y Organización
*Archivo:* `src/server/actions/organization.ts`
- **Acciones a proteger:**
  - `updateOrganizationSettings` -> `requirePermission('manage_organization')`
  - `createDepartment`, `createPosition`

### D. Módulo de Fichajes (Time Tracking)
*Archivo:* `src/server/actions/time-tracking.ts`
- **Acciones a proteger:**
  - `adminUpdateEntry` (Modificar fichaje de otro) -> `requirePermission('manage_time_tracking')` o ser responsable del usuario.
  - `validateTimeRequest`

## 4. Estandarización de Permisos

Para evitar "Magic Strings" y errores de dedo (ej. `manage_users` vs `manage_user`), centralizaremos las definiciones.

1.  **Unificar Tipos:** Asegurar que `src/types/permissions.ts` sea la fuente de la verdad para Frontend y Backend.
2.  **Mapping Rol -> Permisos:** Revisar la función que traduce el Rol de base de datos a permisos efectivos para asegurar que `ORG_ADMIN` tenga todo, pero `MANAGER` solo lo suyo.

## 5. Hoja de Ruta de Ejecución

### Paso 1: Infraestructura ("The Gatekeeper")
- Crear `src/server/lib/permissions.ts`.
- Implementar la función `checkUserPermission` con lógica optimizada (Prisma).
- Implementar el wrapper `requirePermission` para Server Actions.

### Paso 2: Hardening de Horarios (Piloto)
- Aplicar `requirePermission` en todas las acciones de `schedules-v2.ts`.
- Verificar manualmente intentando ejecutar la acción con un usuario sin permisos.

### Paso 3: Despliegue Masivo
- Aplicar sistemáticamente a `employees`, `time-tracking`, `settings`.

### Paso 4: Refactorización de "Responsables" (Avanzado)
- Para acciones como "Aprobar Vacaciones", el permiso no es binario (Sí/No), es contextual ("¿Soy responsable de ESTE empleado?").
- Crear helper `requireResponsibility(targetEmployeeId, permission)`.

## 6. Validación de Calidad (Checklist Enterprise)

Antes de dar por cerrado el ticket, verificaremos:
- [ ] Intentar crear un horario logueado como "Empleado Básico" -> Debe lanzar Error 403/500.
- [ ] Intentar ver salarios logueado como "Manager de otro departamento" -> Debe lanzar Error.
- [ ] La UI no debe romperse si el backend rechaza la petición (Manejo de errores `try/catch` en componentes cliente).
