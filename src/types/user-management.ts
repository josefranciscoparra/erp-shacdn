import { Role, User, Employee } from "@prisma/client";

/**
 * Usuario con relaciones completas para gestión
 */
export interface UserWithRelations extends User {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    employeeNumber: string | null;
    employmentStatus: string;
  } | null;
  temporaryPasswords: {
    id: string;
    password: string;
    createdAt: Date;
    expiresAt: Date;
    reason: string | null;
  }[];
  _count?: {
    sessions: number;
  };
}

/**
 * Datos para crear un nuevo usuario
 */
export interface CreateUserData {
  email: string;
  name: string;
  role: Role;
  password: string; // Hash de la contraseña temporal
  orgId: string;
  employeeId?: string;
  active?: boolean;
  mustChangePassword?: boolean;
}

/**
 * Datos para actualizar rol de usuario
 */
export interface UpdateUserRoleData {
  userId: string;
  newRole: Role;
  updatedBy: string; // ID del usuario que hace el cambio
}

/**
 * Datos de contraseña temporal generada
 */
export interface TemporaryPasswordData {
  userId: string;
  password: string; // Contraseña en texto plano (solo para mostrar al crear)
  hashedPassword: string; // Hash para guardar en BD
  expiresAt: Date;
  reason?: string;
  createdById: string;
}

/**
 * Filtros para listado de usuarios
 */
export interface UserFilters {
  orgId: string;
  page?: number;
  limit?: number;
  status?: "active" | "inactive" | "with-temp-password" | "all";
  role?: Role;
  search?: string;
  currentUserRole?: Role; // Para filtrar según jerarquía
}

/**
 * Resultado paginado de usuarios
 */
export interface PaginatedUsers {
  users: UserWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Historial de cambios de rol (para auditoría futura)
 */
export interface RoleChangeHistory {
  id: string;
  userId: string;
  previousRole: Role;
  newRole: Role;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

/**
 * Opciones de rol para selects
 */
export interface RoleOption {
  value: Role;
  label: string;
  description: string;
  disabled?: boolean;
}

/**
 * Estado de usuario para badges
 */
export type UserStatus = "active" | "inactive" | "temp-password";

/**
 * Acción de usuario para menú de acciones
 */
export interface UserAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}
