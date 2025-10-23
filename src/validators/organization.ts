import { z } from "zod";

const vatSchema = z
  .string()
  .trim()
  .min(3, "El NIF/CIF debe tener al menos 3 caracteres")
  .max(20, "El NIF/CIF no puede superar 20 caracteres")
  .regex(/^[a-zA-Z0-9]+$/, "El NIF/CIF solo puede contener letras y números")
  .optional()
  .or(z.literal(""))
  .transform((value) => {
    if (!value) return null;
    return value;
  });

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120, "El nombre es demasiado largo"),
  vat: vatSchema,
  active: z.boolean().default(true),
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
  })
  .superRefine((data, ctx) => {
    if (data.name === undefined && data.vat === undefined && data.active === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes proporcionar al menos un campo para actualizar",
        path: ["name"],
      });
    }
  });

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
