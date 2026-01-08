"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ScheduleTemplate, ScheduleTemplateType } from "@prisma/client";
import { AlertTriangle, Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { updateScheduleTemplate } from "@/server/actions/schedules-v2";

const formSchema = z
  .object({
    name: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(100, "El nombre no puede exceder 100 caracteres"),
    description: z.string().max(500, "La descripcion no puede exceder 500 caracteres").optional(),
    templateType: z.enum(["FIXED", "SHIFT", "ROTATION", "FLEXIBLE"], {
      required_error: "Debes seleccionar un tipo de plantilla",
    }),
    weeklyHours: z
      .preprocess(
        (value) => (value === "" || value === null ? undefined : value),
        z.coerce.number().min(1, "Las horas semanales deben ser mayores a 0").max(80, "Máximo 80 horas"),
      )
      .optional(),
  })
  .refine((data) => data.templateType !== "FLEXIBLE" || typeof data.weeklyHours === "number", {
    message: "Debes indicar las horas semanales para un horario flexible total",
    path: ["weeklyHours"],
  });

type FormValues = z.infer<typeof formSchema>;

interface EditTemplateDialogProps {
  template: ScheduleTemplate & {
    _count?: {
      employeeAssignments?: number;
    };
  };
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function EditTemplateDialog({ template, variant = "outline", size = "sm" }: EditTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const employeeCount = template._count?.employeeAssignments ?? 0;
  const hasAssignments = employeeCount > 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template.name,
      description: template.description ?? "",
      templateType: template.templateType,
      weeklyHours: template.weeklyHours ? Number(template.weeklyHours) : undefined,
    },
  });

  const watchedType = form.watch("templateType");
  const typeChanged = watchedType !== template.templateType;

  async function onSubmit(data: FormValues) {
    setIsLoading(true);

    try {
      const result = await updateScheduleTemplate(template.id, {
        name: data.name,
        description: data.description,
        templateType: data.templateType as ScheduleTemplateType,
        weeklyHours: data.weeklyHours,
      });

      if (result.success) {
        toast.success("Plantilla actualizada", {
          description: `La plantilla "${data.name}" se ha actualizado correctamente`,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Error al actualizar plantilla", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch {
      toast.error("Error al actualizar plantilla", {
        description: "Ha ocurrido un error al actualizar la plantilla",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Settings className="mr-2 h-4 w-4" />
          Configuracion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configuracion de Plantilla</DialogTitle>
          <DialogDescription>Modifica los datos generales de la plantilla de horario</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Plantilla</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Horario Oficina, Turno Noche" {...field} />
                  </FormControl>
                  <FormDescription>Un nombre descriptivo para esta plantilla</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe brevemente para que se usa esta plantilla..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Plantilla</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FIXED">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Horario Fijo</span>
                          <span className="text-muted-foreground text-xs">Mismo horario cada semana</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="SHIFT">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Turnos</span>
                          <span className="text-muted-foreground text-xs">Turnos asignados (mañana, tarde, noche)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ROTATION">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Rotacion</span>
                          <span className="text-muted-foreground text-xs">Patron ciclico (ej: 6x6, 24x72)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="FLEXIBLE">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Flexible total</span>
                          <span className="text-muted-foreground text-xs">Objetivo semanal sin franjas</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>El tipo determina como se configuran los horarios</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("templateType") === "FLEXIBLE" && (
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
                    <FormDescription>Objetivo semanal del horario flexible total</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {typeChanged && hasAssignments && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atencion</AlertTitle>
                <AlertDescription>
                  Esta plantilla tiene {employeeCount} empleado{employeeCount !== 1 ? "s" : ""} asignado
                  {employeeCount !== 1 ? "s" : ""}. Cambiar el tipo puede afectar el calculo de sus horarios.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
