import { z } from "zod";

export const eventFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es requerido"),
    description: z.string().optional(),
    date: z.date({
      required_error: "La fecha es requerida",
    }),
    endDate: z.date().optional().nullable(),
    eventType: z.enum(["HOLIDAY", "CLOSURE", "EVENT", "MEETING", "DEADLINE", "OTHER"]),
    isRecurring: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.endDate && data.date) {
        return data.endDate >= data.date;
      }
      return true;
    },
    {
      message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
      path: ["endDate"],
    },
  );

export type EventFormData = z.infer<typeof eventFormSchema>;
