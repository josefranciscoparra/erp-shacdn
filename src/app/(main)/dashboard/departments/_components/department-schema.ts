import { z } from "zod";

export const departmentFormSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre es muy largo")
    .trim(),
  description: z
    .string()
    .max(500, "La descripción es muy larga")
    .optional()
    .or(z.literal("")),
  costCenterId: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.literal("none")),
  managerId: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.literal("none")),
});

export type DepartmentFormData = z.infer<typeof departmentFormSchema>;

export const departmentCreateSchema = departmentFormSchema.transform((data) => ({
  name: data.name,
  description: data.description || undefined,
  costCenterId: data.costCenterId === "none" || !data.costCenterId ? undefined : data.costCenterId,
  managerId: data.managerId === "none" || !data.managerId ? undefined : data.managerId,
}));

export const departmentUpdateSchema = departmentFormSchema
  .partial()
  .transform((data) => ({
    ...(data.name && { name: data.name }),
    ...(data.description !== undefined && { 
      description: data.description || undefined 
    }),
    ...(data.costCenterId !== undefined && { 
      costCenterId: data.costCenterId === "none" || !data.costCenterId ? undefined : data.costCenterId
    }),
    ...(data.managerId !== undefined && { 
      managerId: data.managerId === "none" || !data.managerId ? undefined : data.managerId
    }),
  }));

export type DepartmentCreateData = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateData = z.infer<typeof departmentUpdateSchema>;