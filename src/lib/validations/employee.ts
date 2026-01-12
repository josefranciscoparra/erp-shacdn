import { z } from "zod";

export const EMPLOYEE_GENDERS = ["MALE", "FEMALE", "NON_BINARY", "NOT_SPECIFIED"] as const;
export const employeeGenderSchema = z.enum(EMPLOYEE_GENDERS);

export const EMPLOYEE_ADDITIONAL_FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "BOOLEAN"] as const;
export const employeeAdditionalFieldTypeSchema = z.enum(EMPLOYEE_ADDITIONAL_FIELD_TYPES);

export const employeeAdditionalFieldSchema = z
  .object({
    id: z.string().min(1, "El campo adicional necesita un identificador."),
    label: z
      .string()
      .trim()
      .min(1, "El nombre del campo adicional es obligatorio.")
      .max(60, "El nombre del campo adicional es demasiado largo."),
    type: employeeAdditionalFieldTypeSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  })
  .superRefine((field, ctx) => {
    const value = field.value;
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (field.type === "TEXT" && typeof value !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El valor debe ser texto.",
        path: ["value"],
      });
    }

    if (field.type === "NUMBER") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El valor debe ser un número válido.",
          path: ["value"],
        });
      }
    }

    if (field.type === "DATE") {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El valor debe ser una fecha válida.",
          path: ["value"],
        });
      }
    }

    if (field.type === "BOOLEAN" && typeof value !== "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El valor debe ser verdadero o falso.",
        path: ["value"],
      });
    }
  });

export type EmployeeGender = z.infer<typeof employeeGenderSchema>;
export type EmployeeAdditionalFieldType = z.infer<typeof employeeAdditionalFieldTypeSchema>;
export type EmployeeAdditionalField = z.infer<typeof employeeAdditionalFieldSchema>;

// Validador NIF/NIE español
export const nifNieSchema = z
  .string()
  .min(1, "Por favor, indica el NIF/NIE del empleado.")
  .regex(
    /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$|^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/,
    "El NIF/NIE no tiene un formato válido. Revísalo e inténtalo de nuevo.",
  )
  .refine((value) => {
    // Algoritmo de validación NIF/NIE
    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    let number = "";

    if (value.match(/^[XYZ]/)) {
      // NIE
      number = value.replace("X", "0").replace("Y", "1").replace("Z", "2");
    } else {
      // NIF
      number = value;
    }

    const dni = parseInt(number.substring(0, 8));
    const letter = number.charAt(8);

    return letters.charAt(dni % 23) === letter;
  }, "El NIF/NIE no tiene un formato válido. Revísalo e inténtalo de nuevo.");

// Validador IBAN español
export const ibanSchema = z
  .string()
  .optional()
  .refine((value) => {
    if (!value) return true; // IBAN es opcional

    // Formato básico IBAN español
    const ibanRegex = /^ES\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/;
    if (!ibanRegex.test(value)) return false;

    // Validación algoritmo módulo 97 (simplificada)
    const cleanIban = value.replace(/\s/g, "");
    return cleanIban.length === 24;
  }, "El IBAN no tiene un formato válido. Debe ser un IBAN español.");

// Schema principal para crear empleado
export const createEmployeeSchema = z.object({
  // Datos personales obligatorios
  firstName: z.string().min(1, "Por favor, indica el nombre del empleado.").max(50, "El nombre es demasiado largo."),
  lastName: z
    .string()
    .min(1, "El primer apellido es necesario para continuar.")
    .max(50, "El primer apellido es demasiado largo."),
  secondLastName: z.string().max(50, "El segundo apellido es demasiado largo.").optional(),
  nifNie: nifNieSchema,

  // Datos de contacto
  email: z
    .string()
    .min(1, "Por favor, proporciona un email de contacto.")
    .email("El email no tiene un formato válido. Revísalo e inténtalo de nuevo."),
  phone: z.string().max(20, "El teléfono es demasiado largo.").optional(),
  mobilePhone: z.string().max(20, "El móvil es demasiado largo.").optional(),

  // Dirección
  address: z.string().max(200, "La dirección es demasiado larga.").optional(),
  city: z.string().max(100, "El nombre de la ciudad es demasiado largo.").optional(),
  postalCode: z.string().max(10, "El código postal no es válido.").optional(),
  province: z.string().max(100, "El nombre de la provincia es demasiado largo.").optional(),

  // Datos adicionales
  birthDate: z.string().optional(), // Se convertirá a Date en el servidor
  nationality: z.string().max(50, "La nacionalidad es demasiado larga.").optional(),
  employeeNumber: z.string().max(20, "El número de empleado es demasiado largo.").optional(),
  gender: employeeGenderSchema.optional(),
  additionalFields: z.array(employeeAdditionalFieldSchema).optional(),

  // Datos bancarios
  iban: ibanSchema,

  // Contacto de emergencia
  emergencyContactName: z.string().max(100, "El nombre del contacto es demasiado largo.").optional(),
  emergencyContactPhone: z.string().max(20, "El teléfono del contacto es demasiado largo.").optional(),
  emergencyRelationship: z.string().max(50, "La relación es demasiado larga.").optional(),

  // Notas
  notes: z.string().max(1000, "Las notas son demasiado largas (máximo 1000 caracteres).").optional(),

  // Equipo (opcional)
  teamId: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
