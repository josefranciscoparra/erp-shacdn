"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { createScheduleTemplate } from "@/server/actions/schedules-v2";

const formSchema = z
  .object({
    name: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(100, "El nombre no puede exceder 100 caracteres"),
    description: z.string().optional(),
    // Solo FIXED y FLEXIBLE se crean desde aquí. SHIFT y ROTATION se gestionan desde el Cuadrante.
    templateType: z.enum(["FIXED", "FLEXIBLE"], {
      required_error: "Debes seleccionar un tipo de horario",
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

export function CreateTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      templateType: "FIXED",
      weeklyHours: undefined,
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);

    try {
      const result = await createScheduleTemplate({
        name: data.name,
        description: data.description,
        templateType: data.templateType,
        weeklyHours: data.weeklyHours,
      });

      if (result.success && result.data) {
        toast.success("Plantilla creada", {
          description: `La plantilla "${data.name}" se ha creado correctamente`,
        });
        setOpen(false);
        form.reset();

        // Redirigir a la página de edición de la nueva plantilla
        router.push(`/dashboard/schedules/${result.data.id}`);
        router.refresh();
      } else {
        toast.error("Error al crear plantilla", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Error al crear plantilla", {
        description: "Ha ocurrido un error al crear la plantilla",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Plantilla de Horario</DialogTitle>
          <DialogDescription>Crea una nueva plantilla de horario que podrás asignar a tus empleados</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Horario Oficina Central" {...field} />
                  </FormControl>
                  <FormDescription>Un nombre descriptivo para identificar esta plantilla</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Horario</FormLabel>
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
                          <span className="text-muted-foreground text-xs">
                            Mismo horario cada día (ej: oficina 9-18h)
                          </span>
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
                  <FormDescription>El tipo determina cómo se configurará el horario</FormDescription>
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

            <Alert className="border-muted bg-muted/30">
              <CalendarClock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ¿Necesitas gestionar <strong>turnos rotativos</strong> (mañana, tarde, noche)?{" "}
                <Link href="/dashboard/shifts" className="text-primary underline-offset-4 hover:underline">
                  Ir al Cuadrante de Turnos
                </Link>
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Horario estándar para personal de oficina con jornada intensiva en verano"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Información adicional sobre esta plantilla</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creando..." : "Crear Plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
