import { Role } from "@prisma/client";

// Definir permisos del sistema
export type Permission =
  | "view_employees" // Ver listado de empleados
  | "manage_employees" // Crear/editar/eliminar empleados
  | "view_departments" // Ver departamentos
  | "manage_departments" // Gestionar departamentos
  | "view_contracts" // Ver contratos
  | "manage_contracts" // Gestionar contratos
  | "view_documents" // Ver documentos
  | "manage_documents" // Gestionar documentos
  | "view_reports" // Ver reportes
  | "manage_organization" // Gestionar configuración de la organización
  | "view_own_profile" // Ver su propio perfil
  | "edit_own_profile" // Editar su propio perfil
  | "view_own_documents" // Ver sus propios documentos
  | "view_payroll" // Ver nóminas
  | "manage_payroll"; // Gestionar nóminas

// Mapa de permisos por rol
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "view_employees",
    "manage_employees",
    "view_departments",
    "manage_departments",
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
    "manage_payroll",
  ],
  ORG_ADMIN: [
    "view_employees",
    "manage_employees",
    "view_departments",
    "manage_departments",
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
    "manage_payroll",
  ],
  HR_ADMIN: [
    "view_employees",
    "manage_employees",
    "view_departments",
    "manage_departments",
    "view_contracts",
    "manage_contracts",
    "view_documents",
    "manage_documents",
    "view_reports",
    "view_own_profile",
    "edit_own_profile",
    "view_own_documents",
    "view_payroll",
    "manage_payroll",
  ],
  MANAGER: [
    "view_employees", // Pueden ver empleados de su equipo
    "view_departments", // Ver departamentos
    "view_contracts", // Ver contratos (limitado)
    "view_documents", // Ver documentos (limitado)
    "view_reports", // Ver reportes de su área
    "view_own_profile",
    "edit_own_profile",
    "view_own_documents",
  ],
  EMPLOYEE: [
    "view_own_profile", // Solo pueden ver su propio perfil
    "edit_own_profile", // Editar algunos campos de su perfil
    "view_own_documents", // Ver solo sus documentos
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
    case "/dashboard/contracts":
      return hasPermission(role, "view_contracts");
    case "/dashboard/documents":
      return hasPermission(role, "view_documents");
    case "/dashboard/reports":
      return hasPermission(role, "view_reports");
    case "/dashboard/organization":
      return hasPermission(role, "manage_organization");
    default:
      return true; // Páginas públicas del dashboard
  }
}
