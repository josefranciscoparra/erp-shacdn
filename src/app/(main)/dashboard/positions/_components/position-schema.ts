import { z } from "zod";

export const positionSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  level: z.string().optional(),
});

export type PositionFormData = z.infer<typeof positionSchema>;
