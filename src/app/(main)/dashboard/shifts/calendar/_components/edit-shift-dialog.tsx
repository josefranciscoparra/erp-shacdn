"use client";

import { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Shift, ShiftType } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePositionsStore } from "@/stores/positions-store";
import { useShiftsStore } from "@/stores/shifts-store";

const shiftSchema = z.object({
  date: z.date(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (HH:MM)"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (HH:MM)"),
  requiredHeadcount: z.number().min(1, "Debe ser al menos 1").default(1),
  positionId: z.string().optional(),
  shiftType: z.enum(["REGULAR", "SUNDAY", "HOLIDAY", "NIGHT"]).default("REGULAR"),
  notes: z.string().optional(),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

type ShiftWithRelations = Shift & {
  position: { id: string; title: string } | null;
  costCenter: { id: string; name: string };
  template: { id: string; name: string; color: string } | null;
  assignments: Array<{
    id: string;
    employeeId: string;
    status: string;
  }>;
};

interface EditShiftDialogProps {
  shift: ShiftWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function EditShiftDialog({ shift, open, onOpenChange, onUpdate }: EditShiftDialogProps) {
  const { updateShift, isLoading } = useShiftsStore();
  const { positions, fetchPositions } = usePositionsStore();

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      date: new Date(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredHeadcount: shift.requiredHeadcount,
      positionId: shift.positionId ?? undefined,
      shiftType: shift.shiftType,
      notes: shift.notes ?? undefined,
    },
  });

  // Cargar posiciones si no están disponibles
  useEffect(() => {
    if (open && positions.length === 0) {
      fetchPositions();
    }
  }, [open, positions.length, fetchPositions]);

  // Resetear formulario cuando cambia el turno
  useEffect(() => {
    if (open) {
      form.reset({
        date: new Date(shift.date),
        startTime: shift.startTime,
        endTime: shift.endTime,
        requiredHeadcount: shift.requiredHeadcount,
        positionId: shift.positionId ?? undefined,
        shiftType: shift.shiftType,
        notes: shift.notes ?? undefined,
      });
    }
  }, [open, shift, form]);

  const onSubmit = async (values: ShiftFormValues) => {
    // Validar que no esté cerrado
    if (shift.status === "CLOSED") {
      toast.error("No se puede editar un turno cerrado");
      return;
    }

    try {
      await updateShift(shift.id, {
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        requiredHeadcount: values.requiredHeadcount,
        positionId: values.positionId ?? null,
        shiftType: values.shiftType,
        notes: values.notes ?? null,
      });

      toast.success("Turno actualizado correctamente");
      onOpenChange(false);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar turno");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Turno</DialogTitle>
          <DialogDescription>
            {shift.costCenter.name} • {shift.status === "DRAFT" ? "Borrador" : shift.status}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Fecha */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de turno */}
              <FormField
                control={form.control}
                name="shiftType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Turno</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="REGULAR">Regular</SelectItem>
                        <SelectItem value="SUNDAY">Domingo</SelectItem>
                        <SelectItem value="HOLIDAY">Festivo</SelectItem>
                        <SelectItem value="NIGHT">Nocturno</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Horario de inicio */}
              <FormField
                control={form.control}
                name="startTime"
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

              {/* Horario de fin */}
              <FormField
                control={form.control}
                name="endTime"
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
                name="requiredHeadcount"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Posición/Rol */}
              <FormField
                control={form.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posición/Rol (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              {/* Notas */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas opcionales sobre el turno" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || shift.status === "CLOSED"}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
