import { Role } from "@prisma/client";

import { features } from "@/config/features";

// Definir permisos del sistema
export type Permission =
  | "view_employees" // Ver listado de empleados
  | "manage_employees" // Crear/editar/eliminar empleados
  | "view_departments" // Ver departamentos
  | "manage_departments" // Gestionar departamentos
  | "view_cost_centers" // Ver centros de coste
  | "manage_cost_centers" // Gestionar centros de coste
  | "view_teams" // Ver equipos
  | "manage_teams" // Gestionar equipos
  | "view_projects" // Ver proyectos
  | "manage_projects" // Gestionar proyectos
  | "view_positions" // Ver puestos de trabajo
  | "manage_positions" // Gestionar puestos de trabajo
  | "view_contracts" // Ver contratos
  | "manage_contracts" // Gestionar contratos
  | "view_documents" // Ver documentos
  | "manage_documents" // Gestionar documentos
  | "view_reports" // Ver reportes
  | "manage_organization" // Gestionar configuración de la organización
  | "view_own_profile" // Ver su propio perfil
  | "edit_own_profile" // Editar su propio perfil
  | "view_own_documents" // Ver sus propios documentos
  | "view_payroll" // Ver nóminas (RRHH)
  | "view_own_payslips" // Ver sus propias nóminas
  | "manage_payroll" // Gestionar nóminas
  | "clock_in_out" // Fichar entrada/salida
  | "view_time_tracking" // Ver fichajes de todos los empleados
  | "manage_time_tracking" // Gestionar fichajes (admin)
  | "export_time_tracking" // Exportar fichajes
  | "has_employee_profile" // Indica que el usuario tiene perfil de empleado
  | "approve_requests" // Aprobar solicitudes (PTO, etc.)
  | "manage_users" // Gestionar usuarios del sistema
  | "view_all_users" // Ver todos los usuarios
  | "create_users" // Crear nuevos usuarios
  | "change_roles" // Cambiar roles de usuarios
  // Permisos de papelera (nuevos)
  | "manage_trash" // Purgar definitivo de papelera
  | "restore_trash" // Restaurar documentos eliminados
  // Permisos de datos sensibles (nuevos)
  | "view_sensitive_data" // Ver datos sensibles (salarios exactos, etc.)
  | "manage_payslips" // Gestionar lotes de nóminas (subir/publicar/revocar)
  // Permisos de validación de tiempo (nuevos)
  | "validate_time_entries"; // Validar/corregir fichajes de empleados

// Mapa de permisos por rol
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "view_employees",
    "manage_employees",
    "view_departments",
    "manage_departments",
    "view_cost_centers",
    "manage_cost_centers",
    "view_teams",
    "manage_teams",
    "view_projects",
    "manage_projects",
    "view_positions",
    "manage_positions",
    "view_contracts",
    "manage_contracts",
    "view_documents",
    "manage_documents",
    "view_reports",
    "manage_organization",
    "view_own_profile",
    "edit_own_profile",
    "view_own_documents",
    "view_payroll",
    "view_own_payslips",
    "manage_payroll",
    "clock_in_out",
    "view_time_tracking",
    "manage_time_tracking",
    "export_time_tracking",
    "approve_requests",
    "manage_users",
    "view_all_users",
    "create_users",
    "change_roles",
    // Nuevos permisos
    "manage_trash",
    "restore_trash",
    "view_sensitive_data",
    "manage_payslips",
    "validate_time_entries",
  ],
  ORG_ADMIN: [
    "view_employees",
    "manage_employees",
    "view_departments",
    "manage_departments",
    "view_cost_centers",
    "manage_cost_centers",
    "view_teams",
    "manage_teams",
    "view_projects",
    "manage_projects",
    "view_positions",
    "manage_positions",
    "view_contracts",
    "manage_contracts",
    "view_documents",
    "manage_documents",
    "view_reports",
    "manage_organization",
    "view_own_profile",
    "edit_own_profile",
    "view_own_documents",
    "view_payroll",
    "view_own_payslips",
    "manage_payroll",
    "clock_in_out",
    "view_time_tracking",
    "manage_time_tracking",
    "export_time_tracking",
    "approve_requests",
    "manage_users",
    "view_all_users",
    "create_users",
    "change_roles",
    // Nuevos permisos
    "manage_trash",
    "restore_trash",
    "view_sensitive_data",
    "manage_payslips",
    "validate_time_entries",
  ],
  HR_ADMIN: [
    "view_employees",
    "manage_employees",
    "view_departments",
    "manage_departments",
    "view_cost_centers",
    "manage_cost_centers",
    "view_teams",
    "manage_teams",
    "view_projects",
    "manage_projects",
    "view_positions",
    "manage_positions",
    "view_contracts",
    "manage_contracts",
    "view_documents",
    "manage_documents",
    "view_reports",
    "manage_organization",
    "view_own_profile",
    "edit_own_profile",
    "view_own_documents",
    "view_payroll",
    "view_own_payslips",
    "manage_payroll",
    "clock_in_out",
    "view_time_tracking",
    "manage_time_tracking",
    "export_time_tracking",
    "approve_requests",
    "manage_users",
    "view_all_users",
    "create_users",
    "change_roles",
    // Nuevos permisos
    "manage_trash",
    "restore_trash",
    "view_sensitive_data",
    "manage_payslips",
    "validate_time_entries",
  ],
  // Asistente de RRHH - Operativo SIN datos sensibles
  HR_ASSISTANT: [
    "view_employees",
    "manage_employees",
    "view_departments",
    "view_cost_centers",
    "view_teams",
    "view_positions",
    "view_contracts",
    "view_documents",
    "manage_documents",
    "view_reports",
    "view_own_profile",
    "edit_own_profile",
    "view_own_documents",
    "view_payroll", // Ver nóminas pero NO gestionar
    "view_own_payslips",
    "clock_in_out",
    "view_time_tracking",
    "approve_requests",
    "view_all_users",
    "restore_trash", // Restaurar pero NO purgar
    // SIN: manage_trash, manage_payslips, view_sensitive_data, manage_payroll
    // SIN: manage_users, create_users, change_roles, manage_organization
  ],
  MANAGER: [
    "view_employees", // Pueden ver empleados de su equipo
    "view_departments", // Ver departamentos
    "view_cost_centers", // Ver centros de coste
    "view_teams", // Ver equipos
    "view_positions", // Ver puestos de trabajo
    "view_contracts", // Ver contratos (limitado)
    "view_documents", // Ver documentos (limitado)
    "view_reports", // Ver reportes de su área
    "view_own_profile",
    "edit_own_profile",
    "view_own_documents",
    "clock_in_out",
    "view_time_tracking", // Ver fichajes de su equipo
    "approve_requests",
    "validate_time_entries", // Validar fichajes de su equipo
    // TODO: En fase futura, estos permisos serán con scope TEAM/DEPARTMENT
  ],
  EMPLOYEE: [
    "view_own_profile", // Solo pueden ver su propio perfil
    "edit_own_profile", // Editar algunos campos de su perfil
    "view_own_documents", // Ver solo sus documentos
    "view_own_payslips",
    "clock_in_out", // Todos los empleados pueden fichar
  ],
};

// Verificar si un rol tiene un permiso específico
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// Verificar múltiples permisos (AND)
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

// Verificar múltiples permisos (OR)
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

// Obtener todos los permisos de un rol
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

// Verificar si puede acceder a una página específica
export function canAccessPage(role: Role, page: string): boolean {
  switch (page) {
    case "/dashboard/employees":
      return hasPermission(role, "view_employees");
    case "/dashboard/departments":
      return hasPermission(role, "view_departments");
    case "/dashboard/cost-centers":
      return hasPermission(role, "view_cost_centers");
    case "/dashboard/teams":
      return hasPermission(role, "view_teams");
    case "/dashboard/positions":
      return hasPermission(role, "view_positions");
    case "/dashboard/contracts":
      return hasPermission(role, "view_contracts");
    case "/dashboard/documents":
      if (!features.documents) return false;
      return hasPermission(role, "view_documents");
    case "/dashboard/reports":
      return hasPermission(role, "view_reports");
    case "/dashboard/organization":
      return hasPermission(role, "manage_organization");
    case "/dashboard/time-tracking":
      return hasPermission(role, "view_time_tracking");
    case "/dashboard/time-tracking/live":
      return hasPermission(role, "view_time_tracking");
    case "/dashboard/me/clock":
      return hasPermission(role, "clock_in_out");
    case "/dashboard/admin/users":
      return hasPermission(role, "manage_users");
    default:
      return true; // Páginas públicas del dashboard
  }
}
