import { z } from "zod";

import { nifNieSchema, ibanSchema } from "@/lib/validations/employee";

/**
 * Schema para crear un nuevo usuario
 */
export const createUserSchema = z.object({
  email: z.string().min(1, "El email es obligatorio").email("Formato de email inválido").toLowerCase().trim(),
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .trim(),
  role: z.enum(["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"], {
    errorMap: () => ({ message: "Rol inválido" }),
  }),
  employeeId: z.string().optional(),
  active: z.boolean().default(true),
  // La contraseña temporal se genera automáticamente
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Schema para cambiar rol de usuario
 */
export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "ID de usuario obligatorio"),
  newRole: z.enum(["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"], {
    errorMap: () => ({ message: "Rol inválido" }),
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

/**
 * Schema para desactivar usuario
 */
export const deactivateUserSchema = z.object({
  userId: z.string().min(1, "ID de usuario obligatorio"),
  reason: z.string().optional(),
});

export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;

/**
 * Schema para generar contraseña temporal
 */
export const generateTempPasswordSchema = z.object({
  userId: z.string().min(1, "ID de usuario obligatorio"),
  reason: z.string().optional(),
  expiresInHours: z.number().min(1).max(168).default(24), // Entre 1 hora y 7 días
});

export type GenerateTempPasswordInput = z.infer<typeof generateTempPasswordSchema>;

/**
 * Schema para filtros de listado de usuarios
 */
export const getUsersFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  status: z.enum(["active", "inactive", "with-temp-password", "all"]).optional(),
  role: z.enum(["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"]).optional(),
  search: z.string().optional(),
});

export type GetUsersFiltersInput = z.infer<typeof getUsersFiltersSchema>;

/**
 * Schema para crear usuario administrativo (con opción de vincular empleado)
 */
export const createUserAdminSchema = z
  .object({
    // Campos comunes (siempre requeridos)
    email: z.string().email("Email inválido").toLowerCase().trim(),
    role: z.enum(["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT"], {
      errorMap: () => ({ message: "Rol inválido. Solo ORG_ADMIN, HR_ADMIN o HR_ASSISTANT permitidos" }),
    }),
    sendInvite: z.boolean().default(false),

    // Checkbox para determinar flujo
    isEmployee: z.boolean().default(false),

    // Campos solo si NO es empleado
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100).optional(),

    // Campos solo si ES empleado
    firstName: z.string().min(1, "Nombre es obligatorio").max(50).optional(),
    lastName: z.string().min(1, "Primer apellido es obligatorio").max(50).optional(),
    secondLastName: z.string().max(50).optional(),
    nifNie: z.string().optional(), // Será validado condicionalmente
    phone: z.string().max(20).optional(),
    mobilePhone: z.string().max(20).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    postalCode: z.string().max(10).optional(),
    province: z.string().max(100).optional(),
    birthDate: z.string().optional(),
    nationality: z.string().max(50).optional(),
    employeeNumber: z.string().max(20).optional(),
    iban: z.string().optional(), // Será validado condicionalmente
    emergencyContactName: z.string().max(100).optional(),
    emergencyContactPhone: z.string().max(20).optional(),
    emergencyRelationship: z.string().max(50).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isEmployee) {
      // Modo simple: requiere name
      if (!data.name || (typeof data.name === "string" && data.name.trim() === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre es obligatorio",
          path: ["name"],
        });
      }
    } else {
      // Modo empleado: requiere firstName, lastName, nifNie
      if (!data.firstName || (typeof data.firstName === "string" && data.firstName.trim() === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre es obligatorio",
          path: ["firstName"],
        });
      }
      if (!data.lastName || (typeof data.lastName === "string" && data.lastName.trim() === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El primer apellido es obligatorio",
          path: ["lastName"],
        });
      }
      if (!data.nifNie || (typeof data.nifNie === "string" && data.nifNie.trim() === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El NIF/NIE es obligatorio",
          path: ["nifNie"],
        });
      } else if (typeof data.nifNie === "string") {
        // Validar formato y checksum del NIF/NIE solo si es string
        const nifNieResult = nifNieSchema.safeParse(data.nifNie);
        if (!nifNieResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: nifNieResult.error.errors[0].message,
            path: ["nifNie"],
          });
        }
      }

      // Validar IBAN si se proporciona
      if (data.iban && typeof data.iban === "string" && data.iban.trim() !== "") {
        const ibanResult = ibanSchema.safeParse(data.iban);
        if (!ibanResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "IBAN español inválido",
            path: ["iban"],
          });
        }
      }
    }
  });

export type CreateUserAdminInput = z.infer<typeof createUserAdminSchema>;
