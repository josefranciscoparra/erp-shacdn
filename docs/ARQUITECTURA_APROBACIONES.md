# ARQUITECTURA: Sistema de Aprobaciones Unificado v2.1

**Fecha:** 2025-11-21
**Estado:** ✅ Implementado
**Módulos afectados:** PTO, Time Tracking, Expenses

---

## 1. Objetivo

Centralizar la lógica de "quién puede aprobar qué" en un único motor (`approval-engine.ts`) para evitar duplicidad de código y garantizar que las reglas de jerarquía se apliquen consistentemente en toda la aplicación.

Anteriormente, cada módulo (Vacaciones, Gastos) tenía su propia lógica dispersa para buscar managers. Ahora todo pasa por el motor unificado.

## 2. Jerarquía de Aprobación

El sistema utiliza una estrategia de **"Aprobación Concurrente en Cascada"**.
Esto significa que una solicitud es visible y aprobable por **cualquier persona** en la línea de mando superior. El primero que apruebe, cierra la solicitud.

**Niveles de Autoridad (Prioridad):**

1.  **Manager Directo (Nivel 1):** Definido explícitamente en el contrato del empleado (`EmploymentContract.managerId`).
2.  **Líder de Equipo (Nivel 2):** Responsables del `Team` al que pertenece el empleado.
3.  **Manager de Departamento (Nivel 3):** Responsables del `Department`.
4.  **Manager de Centro de Coste (Nivel 4):** Responsables del `CostCenter`.
5.  **Administradores y RRHH (Nivel 5):** `ORG_ADMIN`, `SUPER_ADMIN`, `HR_ADMIN`.

## 3. Componentes Clave

### A. Motor de Lógica (`src/lib/approvals/approval-engine.ts`)

- `getAuthorizedApprovers(employeeId, type)`: Retorna la lista de usuarios que pueden aprobar.
- `canUserApprove(userId, employeeId, type)`: Booleano rápido para verificar permisos.

### B. Bandeja Unificada (`src/server/actions/approvals.ts`)

- `getMyPendingApprovals()`: Server Action principal.
  - Busca TODAS las solicitudes pendientes (PTO, Fichajes, Gastos).
  - Filtra en memoria usando `getAuthorizedApprovers` para devolver solo las que el usuario puede ver.
- `approveRequest` / `rejectRequest`: Actions unificadas que delegan en los módulos específicos.

### C. Interfaz de Usuario (`/dashboard/approvals`)

- **Diseño:** Clonado de "Mis Vacaciones" para consistencia (KPIs, Tabs, Tabla limpia).
- **Funcionalidad:**
  - Lista unificada de tareas.
  - Filtros por tipo (Ausencia, Gasto, Fichaje).
  - **Modal Integrado:** Permite ver detalles y aprobar/rechazar sin navegar a páginas antiguas.

## 4. Flujo de Datos

1.  **Empleado** crea solicitud (ej: Vacaciones). Estado: `PENDING`.
2.  **Manager** entra a `/dashboard/approvals`.
3.  Sistema llama a `getMyPendingApprovals()`.
4.  Sistema verifica si el Manager está en la cadena de mando del Empleado.
5.  Manager ve la solicitud y hace clic en "Revisar".
6.  Se abre Modal con detalles.
7.  Manager hace clic en "Aprobar".
8.  Server Action `approveRequest` -> `approvePtoRequest`.
9.  Se actualiza estado a `APPROVED`, se recalculan saldos, se notifica al empleado.

## 5. Notas de Implementación

- **Compatibilidad Legacy:** Se mantienen (marcados como deprecated) algunos endpoints antiguos para no romper enlaces externos o vistas antiguas, pero redirigen a la lógica nueva o devuelven estructuras compatibles.
- **Performance:** La verificación de permisos se hace en tiempo de lectura. Para organizaciones masivas (>1000 empleados), se recomienda migrar a un modelo de persistencia (`ApprovalRequest` table) en el futuro.
