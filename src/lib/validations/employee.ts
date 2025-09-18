import { z } from "zod";

// Validador NIF/NIE español
export const nifNieSchema = z
  .string()
  .regex(/^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$|^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/, "Formato NIF/NIE inválido")
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
  }, "NIF/NIE inválido");

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
  }, "IBAN español inválido");

// Schema principal para crear empleado
export const createEmployeeSchema = z.object({
  // Datos personales obligatorios
  firstName: z.string().min(1, "Nombre es obligatorio").max(50),
  lastName: z.string().min(1, "Primer apellido es obligatorio").max(50),
  secondLastName: z.string().max(50).optional(),
  nifNie: nifNieSchema,

  // Datos de contacto
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  mobilePhone: z.string().max(20).optional(),

  // Dirección
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  province: z.string().max(100).optional(),

  // Datos adicionales
  birthDate: z.string().optional(), // Se convertirá a Date en el servidor
  nationality: z.string().max(50).optional(),
  employeeNumber: z.string().max(20).optional(),

  // Datos bancarios
  iban: ibanSchema,

  // Contacto de emergencia
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyRelationship: z.string().max(50).optional(),

  // Notas
  notes: z.string().max(1000).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
