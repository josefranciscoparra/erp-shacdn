/**
 * Modal para Crear/Editar Zona de Trabajo
 *
 * Permite configurar zonas dentro de un lugar (cost center) y definir cobertura requerida.
 */

"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { ZoneInput } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

// Schema de validación
const zoneFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(50, "Máximo 50 caracteres"),
  costCenterId: z.string().min(1, "Selecciona un lugar de trabajo"),
  coverageMorning: z.number().min(0, "Mínimo 0").max(50, "Máximo 50"),
  coverageAfternoon: z.number().min(0, "Mínimo 0").max(50, "Máximo 50"),
  coverageNight: z.number().min(0, "Mínimo 0").max(50, "Máximo 50"),
  active: z.boolean(),
});

type ZoneFormValues = z.infer<typeof zoneFormSchema>;

export function ZoneDialog() {
  const { isZoneDialogOpen, selectedZone, costCenters, closeZoneDialog, createZone, updateZone } = useShiftsStore();

  const isEditing = !!selectedZone;

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      name: "",
      costCenterId: "",
      coverageMorning: 1,
      coverageAfternoon: 1,
      coverageNight: 0,
      active: true,
    },
  });

  // Actualizar formulario cuando cambie selectedZone
  useEffect(() => {
    if (selectedZone) {
      // Modo edición: cargar datos de la zona existente
      form.reset({
        name: selectedZone.name,
        costCenterId: selectedZone.costCenterId,
        coverageMorning: selectedZone.requiredCoverage.morning,
        coverageAfternoon: selectedZone.requiredCoverage.afternoon,
        coverageNight: selectedZone.requiredCoverage.night,
        active: selectedZone.active,
      });
    } else {
      // Modo creación limpio
      form.reset({
        name: "",
        costCenterId: "",
        coverageMorning: 1,
        coverageAfternoon: 1,
        coverageNight: 0,
        active: true,
      });
    }
  }, [selectedZone, form]);

  // Submit del formulario
  const onSubmit = async (data: ZoneFormValues) => {
    const zoneInput: ZoneInput = {
      name: data.name,
      costCenterId: data.costCenterId,
      requiredCoverage: {
        morning: data.coverageMorning,
        afternoon: data.coverageAfternoon,
        night: data.coverageNight,
      },
      active: data.active,
    };

    if (isEditing) {
      await updateZone(selectedZone.id, zoneInput);
    } else {
      await createZone(zoneInput);
    }

    // El store cierra el diálogo automáticamente después de crear/actualizar
  };

  // Calcular cobertura total
  const coverageMorning = form.watch("coverageMorning");
  const coverageAfternoon = form.watch("coverageAfternoon");
  const coverageNight = form.watch("coverageNight");
  const totalCoverage = coverageMorning + coverageAfternoon + coverageNight;

  return (
    <Dialog open={isZoneDialogOpen} onOpenChange={closeZoneDialog}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Zona" : "Nueva Zona de Trabajo"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la zona de trabajo."
              : "Crea una nueva zona de trabajo dentro de un lugar (restaurante, hotel, etc.)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Zona</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cocina, Barra, Recepción..." {...field} />
                  </FormControl>
                  <FormDescription>Nombre descriptivo de la zona de trabajo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lugar de trabajo */}
            <FormField
              control={form.control}
              name="costCenterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lugar de Trabajo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un lugar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costCenters
                        .filter((cc) => cc.active)
                        .map((costCenter) => (
                          <SelectItem key={costCenter.id} value={costCenter.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {costCenter.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Restaurante, hotel u otro centro de coste</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cobertura requerida */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <Label className="text-sm font-semibold">Cobertura Requerida por Franja</Label>
              </div>

              <p className="text-muted-foreground text-xs">
                Define cuántas personas se necesitan en cada franja horaria
              </p>

              <div className="grid grid-cols-3 gap-3">
                {/* Mañana */}
                <FormField
                  control={form.control}
                  name="coverageMorning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Mañana
                        <span className="text-muted-foreground ml-1">(08:00-16:00)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tarde */}
                <FormField
                  control={form.control}
                  name="coverageAfternoon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Tarde
                        <span className="text-muted-foreground ml-1">(16:00-00:00)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Noche */}
                <FormField
                  control={form.control}
                  name="coverageNight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Noche
                        <span className="text-muted-foreground ml-1">(00:00-08:00)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Resumen de cobertura */}
              <div className="bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-2">
                <span className="text-sm font-medium">Cobertura total diaria:</span>
                <Badge variant="secondary" className="text-base">
                  {totalCoverage} {totalCoverage === 1 ? "persona" : "personas"}
                </Badge>
              </div>
            </div>

            {/* Estado activo/inactivo */}
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Zona Activa</FormLabel>
                    <FormDescription>Las zonas inactivas no aparecerán al crear turnos</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeZoneDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar Zona" : "Crear Zona"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
