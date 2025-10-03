import { z } from "zod";

export const positionLevelSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  code: z.string().optional(),
  order: z.number().int().min(0, "El orden debe ser un número positivo").default(0),
  description: z.string().optional(),
  minSalary: z.number().min(0, "El salario mínimo debe ser positivo").optional(),
  maxSalary: z.number().min(0, "El salario máximo debe ser positivo").optional(),
  active: z.boolean().default(true),
}).refine((data) => {
  if (data.minSalary !== undefined && data.maxSalary !== undefined) {
    return data.minSalary <= data.maxSalary;
  }
  return true;
}, {
  message: "El salario mínimo no puede ser mayor que el salario máximo",
  path: ["maxSalary"],
});

export type PositionLevelFormData = z.infer<typeof positionLevelSchema>;
