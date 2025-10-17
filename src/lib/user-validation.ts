import { Role } from "@prisma/client";

import { canCreateRole, canEditRole, ROLE_DISPLAY_NAMES } from "./role-hierarchy";

/**
 * Resultado de una validación
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Datos de la sesión del usuario actual
 */
export interface UserSession {
  id: string;
  role: Role;
  orgId: string;
  email: string;
  name: string;
}

/**
 * Valida si el usuario actual puede crear un usuario con el rol especificado
 */
export function validateUserCreation(
  session: UserSession,
  targetRole: Role,
  targetEmail: string,
  targetOrgId?: string,
): ValidationResult {
  // 1. Verificar que el rol del target no sea SUPER_ADMIN
  if (targetRole === "SUPER_ADMIN") {
    return {
      valid: false,
      error: "SUPER_ADMIN solo puede ser creado por script de administración del sistema",
      code: "SUPER_ADMIN_BLOCKED",
    };
  }

  // 2. Verificar jerarquía de roles
  if (!canCreateRole(session.role, targetRole)) {
    return {
      valid: false,
      error: `No tienes permisos para crear usuarios con rol ${ROLE_DISPLAY_NAMES[targetRole]}`,
      code: "INSUFFICIENT_PERMISSIONS",
    };
  }

  // 3. Verificar que el email no sea igual al del usuario actual
  if (session.email.toLowerCase() === targetEmail.toLowerCase()) {
    return {
      valid: false,
      error: "No puedes crear un usuario con tu propio email",
      code: "DUPLICATE_EMAIL_SELF",
    };
  }

  // 4. Si se especifica orgId, verificar que coincida con la org del usuario
  // (salvo SUPER_ADMIN que puede crear en cualquier org)
  if (targetOrgId && session.role !== "SUPER_ADMIN" && targetOrgId !== session.orgId) {
    return {
      valid: false,
      error: "No puedes crear usuarios en otra organización",
      code: "INVALID_ORG",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Valida si el usuario actual puede cambiar el rol de otro usuario
 */
export function validateRoleChange(
  session: UserSession,
  targetUserId: string,
  targetUserCurrentRole: Role,
  targetUserNewRole: Role,
  targetUserOrgId: string,
): ValidationResult {
  // 1. Verificar que no esté intentando cambiar su propio rol
  if (session.id === targetUserId) {
    return {
      valid: false,
      error: "No puedes cambiar tu propio rol. Contacta con un administrador superior",
      code: "CANNOT_CHANGE_OWN_ROLE",
    };
  }

  // 2. Verificar que el usuario objetivo pertenezca a la misma organización
  // (salvo SUPER_ADMIN que puede gestionar cualquier org)
  if (session.role !== "SUPER_ADMIN" && session.orgId !== targetUserOrgId) {
    return {
      valid: false,
      error: "No puedes modificar usuarios de otra organización",
      code: "INVALID_ORG",
    };
  }

  // 3. Verificar que no intente crear SUPER_ADMIN
  if (targetUserNewRole === "SUPER_ADMIN") {
    return {
      valid: false,
      error: "No se puede ascender usuarios a SUPER_ADMIN desde la interfaz",
      code: "SUPER_ADMIN_BLOCKED",
    };
  }

  // 4. Verificar que no intente tocar un SUPER_ADMIN
  if (targetUserCurrentRole === "SUPER_ADMIN") {
    return {
      valid: false,
      error: "No puedes modificar el rol de un SUPER_ADMIN",
      code: "SUPER_ADMIN_PROTECTED",
    };
  }

  // 5. Verificar jerarquía de roles
  if (!canEditRole(session.role, targetUserCurrentRole, targetUserNewRole)) {
    return {
      valid: false,
      error: `No tienes permisos para cambiar usuarios de ${ROLE_DISPLAY_NAMES[targetUserCurrentRole]} a ${ROLE_DISPLAY_NAMES[targetUserNewRole]}`,
      code: "INSUFFICIENT_PERMISSIONS",
    };
  }

  // 6. Verificar que el nuevo rol sea diferente al actual
  if (targetUserCurrentRole === targetUserNewRole) {
    return {
      valid: false,
      error: "El nuevo rol debe ser diferente al rol actual",
      code: "SAME_ROLE",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Valida si el usuario actual puede desactivar otro usuario
 */
export function validateUserDeactivation(
  session: UserSession,
  targetUserId: string,
  targetUserRole: Role,
  targetUserOrgId: string,
): ValidationResult {
  // 1. No puede desactivarse a sí mismo
  if (session.id === targetUserId) {
    return {
      valid: false,
      error: "No puedes desactivar tu propia cuenta",
      code: "CANNOT_DEACTIVATE_SELF",
    };
  }

  // 2. Verificar organización
  if (session.role !== "SUPER_ADMIN" && session.orgId !== targetUserOrgId) {
    return {
      valid: false,
      error: "No puedes desactivar usuarios de otra organización",
      code: "INVALID_ORG",
    };
  }

  // 3. No puede desactivar SUPER_ADMIN
  if (targetUserRole === "SUPER_ADMIN") {
    return {
      valid: false,
      error: "No puedes desactivar un SUPER_ADMIN",
      code: "SUPER_ADMIN_PROTECTED",
    };
  }

  // 4. Solo puede desactivar roles inferiores
  if (!canEditRole(session.role, targetUserRole, targetUserRole)) {
    return {
      valid: false,
      error: `No tienes permisos para desactivar usuarios con rol ${ROLE_DISPLAY_NAMES[targetUserRole]}`,
      code: "INSUFFICIENT_PERMISSIONS",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Valida si el usuario actual puede generar contraseñas temporales
 */
export function validateTemporaryPasswordGeneration(
  session: UserSession,
  targetUserId: string,
  targetUserRole: Role,
  targetUserOrgId: string,
): ValidationResult {
  // 1. No puede generar para sí mismo
  if (session.id === targetUserId) {
    return {
      valid: false,
      error: "No puedes generar una contraseña temporal para ti mismo",
      code: "CANNOT_GENERATE_FOR_SELF",
    };
  }

  // 2. Verificar organización
  if (session.role !== "SUPER_ADMIN" && session.orgId !== targetUserOrgId) {
    return {
      valid: false,
      error: "No puedes generar contraseñas para usuarios de otra organización",
      code: "INVALID_ORG",
    };
  }

  // 3. Solo admins pueden generar contraseñas temporales
  if (session.role !== "SUPER_ADMIN" && session.role !== "ORG_ADMIN" && session.role !== "HR_ADMIN") {
    return {
      valid: false,
      error: "Solo administradores pueden generar contraseñas temporales",
      code: "INSUFFICIENT_PERMISSIONS",
    };
  }

  // 4. No puede generar para SUPER_ADMIN
  if (targetUserRole === "SUPER_ADMIN") {
    return {
      valid: false,
      error: "No puedes generar contraseñas temporales para SUPER_ADMIN",
      code: "SUPER_ADMIN_PROTECTED",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Valida formato de email
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || email.trim() === "") {
    return {
      valid: false,
      error: "El email es obligatorio",
      code: "EMAIL_REQUIRED",
    };
  }

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: "Formato de email inválido",
      code: "INVALID_EMAIL_FORMAT",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Valida formato de nombre
 */
export function validateName(name: string): ValidationResult {
  if (!name || name.trim() === "") {
    return {
      valid: false,
      error: "El nombre es obligatorio",
      code: "NAME_REQUIRED",
    };
  }

  if (name.trim().length < 3) {
    return {
      valid: false,
      error: "El nombre debe tener al menos 3 caracteres",
      code: "NAME_TOO_SHORT",
    };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: "El nombre no puede exceder 100 caracteres",
      code: "NAME_TOO_LONG",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Helper para lanzar error si la validación falla
 */
export function assertValidation(result: ValidationResult): void {
  if (!result.valid) {
    const error = new Error(result.error);
    (error as any).code = result.code;
    throw error;
  }
}
