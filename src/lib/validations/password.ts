import { z } from "zod";

// ============================================================================
// CONSTANTES
// ============================================================================

export const PASSWORD_MIN_LENGTH = 10;

// Número de contraseñas anteriores a verificar (evitar reutilización)
export const PASSWORD_HISTORY_COUNT = 5;

// Configuración de rate limiting para cambio de contraseña
export const MAX_PASSWORD_ATTEMPTS = 5;
export const PASSWORD_LOCK_MINUTES = 15;

// ============================================================================
// TIPOS
// ============================================================================

export type PasswordRequirementId = "minLength" | "uppercase" | "lowercase" | "number" | "symbol";

export type PasswordRequirement = {
  id: PasswordRequirementId;
  label: string;
  test: (password: string) => boolean;
};

// ============================================================================
// REQUISITOS DE CONTRASEÑA (FUENTE ÚNICA DE VERDAD)
// ============================================================================

/**
 * Definición centralizada de requisitos de contraseña.
 * Usada tanto por el componente visual como por el schema Zod.
 *
 * Orden: define el orden de visualización en UI
 *
 * Símbolo: [^a-zA-Z0-9\s] = cualquier carácter especial (espacios NO cuentan)
 */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "minLength",
    label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "Al menos una letra mayúscula (A-Z)",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Al menos una letra minúscula (a-z)",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Al menos un número (0-9)",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "symbol",
    label: "Al menos un símbolo",
    test: (password) => /[^a-zA-Z0-9\s]/.test(password),
  },
];

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Obtiene el estado de cada requisito para una contraseña dada.
 * Usado por el componente PasswordRequirements para mostrar checkmarks.
 */
export function getPasswordRequirementsStatus(password: string) {
  return PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    fulfilled: req.test(password),
  }));
}

/**
 * Verifica si todos los requisitos están cumplidos.
 */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password));
}

// ============================================================================
// SCHEMA ZOD (CONSTRUIDO DESDE PASSWORD_REQUIREMENTS - NO DUPLICA REGEX)
// ============================================================================

/**
 * Schema de validación de contraseña reutilizable.
 * Usa PASSWORD_REQUIREMENTS como fuente única de verdad.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .superRefine((password, ctx) => {
    // Itera por requisitos (excepto minLength que ya se valida con .min())
    PASSWORD_REQUIREMENTS.filter((req) => req.id !== "minLength").forEach((req) => {
      if (!req.test(password)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: req.label,
        });
      }
    });
  });
