import { HierarchyType } from "@prisma/client";
import { z } from "zod";

import { normalizeDomain } from "@/lib/validations/email-domain";

const vatSchema = z
  .string()
  .trim()
  .min(3, "El NIF/CIF debe tener al menos 3 caracteres")
  .max(20, "El NIF/CIF no puede superar 20 caracteres")
  .regex(/^[a-zA-Z0-9]+$/, "El NIF/CIF solo puede contener letras y números")
  .optional()
  .or(z.literal(""))
  .or(z.null())
  .transform((value) => {
    if (!value) return null;
    return value;
  });

const employeeNumberPrefixSchema = z
  .string()
  .trim()
  .min(2, "El prefijo debe tener al menos 2 caracteres")
  .max(4, "El prefijo no puede superar 4 caracteres")
  .regex(/^[A-Z]+$/, "El prefijo solo puede contener letras mayúsculas")
  .optional()
  .or(z.literal(""))
  .or(z.null())
  .transform((value) => {
    if (!value) return null;
    return value.toUpperCase();
  });

const allowedEmailDomainsSchema = z
  .array(z.string())
  .optional()
  .default([])
  .transform((domains) => {
    // Normalizar y filtrar dominios válidos
    return domains.map((domain) => normalizeDomain(domain)).filter((domain): domain is string => domain !== null);
  });

// Constantes para límites de storage
const MIN_STORAGE_BYTES = 2 * 1024 * 1024; // 2MB (temporal para testing, cambiar a 100MB en prod)
const MAX_STORAGE_BYTES = 100 * 1024 * 1024 * 1024; // 100GB

/**
 * Schema para límite de almacenamiento.
 * Acepta number (en bytes) y valida rango 100MB - 100GB.
 * El valor se convierte a BigInt en la capa de persistencia.
 */
const storageLimitBytesSchema = z
  .number()
  .min(MIN_STORAGE_BYTES, `El límite mínimo es 100MB`)
  .max(MAX_STORAGE_BYTES, `El límite máximo es 100GB`)
  .optional();

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120, "El nombre es demasiado largo"),
  vat: vatSchema,
  active: z.boolean().default(true),
  hierarchyType: z.nativeEnum(HierarchyType).default(HierarchyType.DEPARTMENTAL),
  employeeNumberPrefix: employeeNumberPrefixSchema,
  allowedEmailDomains: allowedEmailDomainsSchema,
});

export const updateOrganizationSchema = z
  .object({
    id: z.string().min(1, "El identificador es obligatorio"),
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(120, "El nombre es demasiado largo")
      .optional(),
    vat: vatSchema,
    active: z.boolean().optional(),
    hierarchyType: z.nativeEnum(HierarchyType).optional(),
    employeeNumberPrefix: employeeNumberPrefixSchema,
    allowedEmailDomains: allowedEmailDomainsSchema,
    storageLimitBytes: storageLimitBytesSchema,
  })
  .superRefine((data, ctx) => {
    if (
      data.name === undefined &&
      data.vat === undefined &&
      data.active === undefined &&
      data.hierarchyType === undefined &&
      data.employeeNumberPrefix === undefined &&
      data.allowedEmailDomains === undefined &&
      data.storageLimitBytes === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes proporcionar al menos un campo para actualizar",
        path: ["name"],
      });
    }
  });

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
