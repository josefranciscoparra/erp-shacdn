import { Role } from "@prisma/client";

/**
 * Jerarquía numérica de roles
 * Valor mayor = más privilegios
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 5,
  ORG_ADMIN: 4,
  HR_ADMIN: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
};

/**
 * Nombres legibles de roles en español
 */
export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: "Super Administrador",
  ORG_ADMIN: "Administrador de Organización",
  HR_ADMIN: "Administrador de RRHH",
  MANAGER: "Manager/Supervisor",
  EMPLOYEE: "Empleado",
};

/**
 * Descripción de cada rol
 */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Acceso total al sistema (multi-organización)",
  ORG_ADMIN: "Administrador con acceso completo a su organización",
  HR_ADMIN: "Gestión de recursos humanos, empleados y nóminas",
  MANAGER: "Supervisor de equipo con permisos de aprobación",
  EMPLOYEE: "Empleado con acceso básico a su información",
};

/**
 * Verifica si un rol puede crear otro rol
 * Regla: Tu rol debe ser SUPERIOR al que intentas crear
 *
 * IMPORTANTE: SUPER_ADMIN solo se puede crear por script, NUNCA por UI
 */
export function canCreateRole(currentRole: Role, targetRole: Role): boolean {
  // SUPER_ADMIN bloqueado en UI
  if (targetRole === "SUPER_ADMIN") {
    return false;
  }

  // ORG_ADMIN no puede crear otro ORG_ADMIN (solo verlos)
  if (currentRole === "ORG_ADMIN" && targetRole === "ORG_ADMIN") {
    return false;
  }

  // HR_ADMIN puede crear otros HR_ADMIN (excepción especial)
  if (currentRole === "HR_ADMIN" && targetRole === "HR_ADMIN") {
    return true;
  }

  // Tu rol debe ser estrictamente superior al target
  return ROLE_HIERARCHY[currentRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Verifica si un rol puede editar/cambiar el rol de otro usuario
 * Regla: Puedes editar roles INFERIORES al tuyo
 */
export function canEditRole(currentRole: Role, targetUserCurrentRole: Role, targetUserNewRole: Role): boolean {
  // No puedes tocar SUPER_ADMIN
  if (targetUserCurrentRole === "SUPER_ADMIN" || targetUserNewRole === "SUPER_ADMIN") {
    return false;
  }

  // No puedes ascender usuarios a tu mismo nivel o superior
  if (ROLE_HIERARCHY[targetUserNewRole] >= ROLE_HIERARCHY[currentRole]) {
    return false;
  }

  // Solo puedes editar usuarios con rol inferior al tuyo
  if (ROLE_HIERARCHY[targetUserCurrentRole] >= ROLE_HIERARCHY[currentRole]) {
    return false;
  }

  return true;
}

/**
 * Verifica si un rol puede ver/listar usuarios de otro rol
 * Regla: Puedes ver roles de tu nivel o inferiores
 */
export function canViewRole(currentRole: Role, targetRole: Role): boolean {
  // SUPER_ADMIN ve todo
  if (currentRole === "SUPER_ADMIN") {
    return true;
  }

  // ORG_ADMIN y HR_ADMIN ven todos en su organización
  if (currentRole === "ORG_ADMIN" || currentRole === "HR_ADMIN") {
    return true;
  }

  // MANAGER solo ve su equipo (filtrado a nivel de query)
  if (currentRole === "MANAGER") {
    return targetRole === "EMPLOYEE" || targetRole === "MANAGER";
  }

  // EMPLOYEE no ve otros usuarios
  return false;
}

/**
 * Obtiene la lista de roles que el usuario actual puede crear
 */
export function getCreatableRoles(currentRole: Role): Role[] {
  const allRoles: Role[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];

  return allRoles.filter((role) => canCreateRole(currentRole, role));
}

/**
 * Obtiene la lista de roles a los que puede ascender/cambiar un usuario
 */
export function getEditableRoles(currentRole: Role, targetUserCurrentRole: Role): Role[] {
  const allRoles: Role[] = ["ORG_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];

  return allRoles.filter((newRole) => canEditRole(currentRole, targetUserCurrentRole, newRole));
}

/**
 * Verifica si un rol tiene permisos de administrador
 */
export function isAdminRole(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN" || role === "HR_ADMIN";
}

/**
 * Verifica si un rol puede gestionar usuarios
 */
export function canManageUsers(role: Role): boolean {
  return isAdminRole(role);
}

/**
 * Obtiene el color del badge para un rol (Tailwind/shadcn variant)
 */
export function getRoleBadgeVariant(role: Role): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "SUPER_ADMIN":
      return "destructive"; // Rojo
    case "ORG_ADMIN":
      return "default"; // Azul
    case "HR_ADMIN":
      return "secondary"; // Púrpura/gris
    case "MANAGER":
      return "outline"; // Gris con borde
    case "EMPLOYEE":
      return "outline"; // Gris con borde
    default:
      return "outline";
  }
}

/**
 * Validación estricta de jerarquía
 * Lanza error si la operación no está permitida
 */
export function enforceRoleHierarchy(
  operation: "create" | "edit" | "view",
  currentRole: Role,
  targetRole: Role,
  targetUserCurrentRole?: Role,
): void {
  let allowed = false;

  switch (operation) {
    case "create":
      allowed = canCreateRole(currentRole, targetRole);
      if (!allowed) {
        throw new Error(`No tienes permisos para crear usuarios con rol ${ROLE_DISPLAY_NAMES[targetRole]}`);
      }
      break;

    case "edit":
      if (!targetUserCurrentRole) {
        throw new Error("Se requiere el rol actual del usuario para editar");
      }
      allowed = canEditRole(currentRole, targetUserCurrentRole, targetRole);
      if (!allowed) {
        throw new Error(`No tienes permisos para cambiar este usuario a ${ROLE_DISPLAY_NAMES[targetRole]}`);
      }
      break;

    case "view":
      allowed = canViewRole(currentRole, targetRole);
      if (!allowed) {
        throw new Error(`No tienes permisos para ver usuarios con rol ${ROLE_DISPLAY_NAMES[targetRole]}`);
      }
      break;
  }
}
