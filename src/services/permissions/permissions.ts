import { Role } from "@prisma/client";

import { features } from "@/config/features";

// ============================================
// ÚNICA FUENTE DE VERDAD: ALL_PERMISSIONS
// ============================================

/**
 * Array constante con todos los permisos del sistema.
 * El tipo Permission se deriva de este array.
 * Usar isValidPermission() para validar strings.
 */
export const ALL_PERMISSIONS = [
  // Empleados
  "view_employees",
  "manage_employees",
  // Departamentos
  "view_departments",
  "manage_departments",
  // Centros de coste
  "view_cost_centers",
  "manage_cost_centers",
  // Equipos
  "view_teams",
  "manage_teams",
  // Proyectos
  "view_projects",
  "manage_projects",
  // Puestos de trabajo
  "view_positions",
  "manage_positions",
  // Contratos
  "view_contracts",
  "manage_contracts",
  // Documentos
  "view_documents",
  "manage_documents",
  // Reportes
  "view_reports",
  // Organización
  "manage_organization",
  // Perfil personal
  "view_own_profile",
  "edit_own_profile",
  "view_own_documents",
  // Nóminas
  "view_payroll",
  "view_own_payslips",
  "manage_payroll",
  // Fichajes
  "clock_in_out",
  "view_time_tracking",
  "manage_time_tracking",
  "export_time_tracking",
  // Perfil de empleado
  "has_employee_profile",
  // Aprobaciones
  "approve_requests",
  "manage_pto_admin",
  // Gestión de usuarios
  "manage_users",
  "view_all_users",
  "create_users",
  "change_roles",
  "manage_user_organizations",
  // Papelera
  "manage_trash",
  "restore_trash",
  // Datos sensibles
  "view_sensitive_data",
  "manage_payslips",
  // Validación de fichajes
  "validate_time_entries",
  // Overrides de permisos (Enterprise v1)
  "manage_permission_overrides",
] as const;

/**
 * Tipo Permission derivado del array ALL_PERMISSIONS.
 * Garantiza que el tipo siempre está sincronizado con el array.
 */
export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * Valida si un string es un permiso válido del sistema.
 * Usar para validar permisos desde BD o input de usuario.
 */
export function isValidPermission(p: string): p is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(p);
}

/**
 * Permisos sensibles que requieren warning especial en UI
 * Usados en el panel de overrides de permisos
 */
export const SENSITIVE_PERMISSIONS: Permission[] = [
  "view_sensitive_data",
  "manage_payslips",
  "manage_trash",
  "manage_users",
  "change_roles",
  "manage_user_organizations",
  "manage_organization",
  "manage_permission_overrides",
];

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
    "manage_pto_admin",
    "manage_users",
    "view_all_users",
    "create_users",
    "change_roles",
    "manage_user_organizations",
    "manage_user_organizations",
    // Nuevos permisos
    "manage_trash",
    "restore_trash",
    "view_sensitive_data",
    "manage_payslips",
    "validate_time_entries",
    // Overrides de permisos (Enterprise v1)
    "manage_permission_overrides",
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
    "manage_pto_admin",
    "manage_users",
    "view_all_users",
    "create_users",
    "change_roles",
    "manage_user_organizations",
    // Nuevos permisos
    "manage_trash",
    "restore_trash",
    "view_sensitive_data",
    "manage_payslips",
    "validate_time_entries",
    // Overrides de permisos (Enterprise v1)
    "manage_permission_overrides",
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
    "manage_pto_admin",
    "manage_users",
    "view_all_users",
    "create_users",
    "change_roles",
    "manage_user_organizations",
    // Nuevos permisos
    "manage_trash",
    "restore_trash",
    "view_sensitive_data",
    "manage_payslips",
    "validate_time_entries",
    // Overrides de permisos (Enterprise v1)
    "manage_permission_overrides",
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
