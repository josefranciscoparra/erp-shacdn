"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SchedulePeriodType, ScheduleTemplateType } from "@prisma/client";
import { Calendar, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSchedulePeriod } from "@/server/actions/schedules-v2";

const baseSchema = z
  .object({
    name: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(100, "El nombre no puede exceder 100 caracteres"),
    periodType: z.enum(["REGULAR", "INTENSIVE", "SPECIAL"], {
      required_error: "Debes seleccionar un tipo de período",
    }),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    weeklyHours: z
      .preprocess(
        (value) => (value === "" || value === null ? undefined : value),
        z.coerce.number().min(1, "Las horas semanales deben ser mayores a 0").max(80, "Máximo 80 horas"),
      )
      .optional(),
  })
  .refine(
    (data) => {
      // Si ambas fechas están definidas, validTo debe ser >= validFrom
      if (data.validFrom && data.validTo) {
        return new Date(data.validTo) >= new Date(data.validFrom);
      }
      return true;
    },
    {
      message: "La fecha de fin debe ser igual o posterior a la fecha de inicio",
      path: ["validTo"],
    },
  );

type FormValues = z.infer<typeof baseSchema>;

interface CreatePeriodDialogProps {
  templateId: string;
  templateType?: ScheduleTemplateType;
  templateWeeklyHours?: number | null;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
}

export function CreatePeriodDialog({
  templateId,
  templateType,
  templateWeeklyHours,
  variant = "outline",
  size = "sm",
  showIcon = true,
}: CreatePeriodDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isFlexible = templateType === "FLEXIBLE";

  const formSchema = useMemo(
    () =>
      baseSchema.superRefine((data, ctx) => {
        if (isFlexible && typeof data.weeklyHours !== "number") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debes indicar las horas semanales para un período flexible",
            path: ["weeklyHours"],
          });
        }
      }),
    [isFlexible],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      periodType: "REGULAR",
      validFrom: "",
      validTo: "",
      weeklyHours: templateWeeklyHours ?? undefined,
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);

    try {
      const result = await createSchedulePeriod({
        scheduleTemplateId: templateId,
        name: data.name,
        periodType: data.periodType as SchedulePeriodType,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validTo: data.validTo ? new Date(data.validTo) : undefined,
        weeklyHours: data.weeklyHours,
      });

      if (result.success) {
        toast.success("Período creado", {
          description: `El período "${data.name}" se ha creado correctamente`,
        });
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast.error("Error al crear período", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch (error) {
      console.error("Error creating period:", error);
      toast.error("Error al crear período", {
        description: "Ha ocurrido un error al crear el período",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          {showIcon && <Plus className="mr-2 h-4 w-4" />}
          Nuevo Período
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Período</DialogTitle>
          <DialogDescription>
            Define un período de horario (Regular, Intensivo o Especial) para esta plantilla
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Período</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Horario Regular, Jornada Intensiva Verano" {...field} />
                  </FormControl>
                  <FormDescription>Un nombre descriptivo para este período</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Período</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="REGULAR">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Regular</span>
                          <span className="text-muted-foreground text-xs">Horario estándar durante todo el año</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="INTENSIVE">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Intensivo</span>
                          <span className="text-muted-foreground text-xs">
                            Jornada intensiva (ej: verano, Semana Santa)
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="SPECIAL">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Especial</span>
                          <span className="text-muted-foreground text-xs">
                            Eventos especiales, festivos, excepciones
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>El tipo determina la prioridad del período</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isFlexible && (
              <FormField
                control={form.control}
                name="weeklyHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas semanales</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="1"
                        placeholder="Ej: 40"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>Objetivo semanal del período flexible total</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Inicio (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Fin (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs">
                <strong>Nota:</strong> Las fechas son opcionales. Si no especificas fechas, el período estará activo
                indefinidamente. Los períodos SPECIAL tienen prioridad sobre INTENSIVE, que a su vez tienen prioridad
                sobre REGULAR.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creando..." : "Crear Período"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
