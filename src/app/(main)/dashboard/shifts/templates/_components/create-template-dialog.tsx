"use client";

import { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

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
import { useCostCentersStore } from "@/stores/cost-centers-store";
import { usePositionsStore } from "@/stores/positions-store";
import { useShiftTemplatesStore } from "@/stores/shift-templates-store";

const templateSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  defaultStartTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (HH:MM)"),
  defaultEndTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (HH:MM)"),
  defaultRequiredHeadcount: z.number().min(1, "Debe ser al menos 1").default(1),
  positionId: z.string().optional(),
  costCenterId: z.string().optional(),
  color: z.string().default("#3b82f6"),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface CreateTemplateDialogProps {
  trigger?: React.ReactNode;
}

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function CreateTemplateDialog({ trigger }: CreateTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const { createTemplate, isLoading } = useShiftTemplatesStore();
  const { costCenters, fetchCostCenters } = useCostCentersStore();
  const { positions, fetchPositions } = usePositionsStore();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultStartTime: "09:00",
      defaultEndTime: "17:00",
      defaultRequiredHeadcount: 1,
      color: "#3b82f6",
    },
  });

  // Cargar datos cuando se abre el dialog
  useEffect(() => {
    if (open) {
      if (costCenters.length === 0) fetchCostCenters();
      if (positions.length === 0) fetchPositions();
    }
  }, [open, costCenters.length, positions.length, fetchCostCenters, fetchPositions]);

  const onSubmit = async (values: TemplateFormValues) => {
    try {
      await createTemplate(values);
      toast.success("Plantilla creada correctamente");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear plantilla");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button>Nueva Plantilla</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Plantilla de Turno</DialogTitle>
          <DialogDescription>Crea una plantilla reutilizable para aplicar a múltiples días</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Nombre */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre de la Plantilla*</FormLabel>
                    <FormControl>
                      <Input placeholder="ej: Turno Mañana, Turno Tarde" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descripción */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción opcional de la plantilla" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Horario */}
              <FormField
                control={form.control}
                name="defaultStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Inicio*</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Fin*</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cobertura requerida */}
              <FormField
                control={form.control}
                name="defaultRequiredHeadcount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cobertura Requerida*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? 1}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : 1)}
                      />
                    </FormControl>
                    <FormDescription>Número de personas necesarias</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color */}
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="h-8 w-8 rounded border-2 transition-all hover:scale-110"
                          style={{
                            backgroundColor: color,
                            borderColor: field.value === color ? "#000" : "transparent",
                          }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Posición */}
              <FormField
                control={form.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posición/Rol (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar posición" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        {positions.map((position) => (
                          <SelectItem key={position.id} value={position.id}>
                            {position.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Centro de coste */}
              <FormField
                control={form.control}
                name="costCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Coste (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar centro" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Todos los centros</SelectItem>
                        {costCenters.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
