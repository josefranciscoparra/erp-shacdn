import { z } from "zod";

export const costCenterSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  code: z
    .string()
    .transform((val) => (val === "none" ? undefined : val || undefined))
    .optional(),
  address: z
    .string()
    .transform((val) => (val === "none" ? undefined : val || undefined))
    .optional(),
  timezone: z
    .string()
    .transform((val) => (val === "none" ? undefined : val || undefined))
    .optional(),
  active: z.boolean().default(true),
});

export type CostCenterFormData = z.infer<typeof costCenterSchema>;
