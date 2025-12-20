"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { createAbsenceType, updateAbsenceType } from "@/server/actions/absence-types";

import { type AbsenceTypeRow } from "./absence-types-tab";

// Schema de validación
const absenceTypeSchema = z
  .object({
    name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
    code: z
      .string()
      .min(1, "El código es requerido")
      .max(50, "Máximo 50 caracteres")
      .regex(/^[A-Z_]+$/, "Solo letras mayúsculas y guiones bajos"),
    description: z.string().max(500, "Máximo 500 caracteres").optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hexadecimal inválido"),
    isPaid: z.boolean(),
    requiresApproval: z.boolean(),
    requiresDocument: z.boolean(),
    minDaysAdvance: z.number().min(0, "No puede ser negativo").max(365, "Máximo 365 días"),
    affectsBalance: z.boolean(),
    balanceType: z.enum(["VACATION", "PERSONAL_MATTERS", "COMP_TIME"]),
    allowPartialDays: z.boolean(),
    granularityMinutes: z.number().min(1, "Mínimo 1 minuto").max(480, "Máximo 480 minutos (8 horas)"),
    minimumDurationMinutes: z.number().min(1, "Mínimo 1 minuto"),
    maxDurationMinutes: z.number().min(1, "Mínimo 1 minuto").optional().nullable(),
    compensationFactor: z.number().min(0.1, "Mínimo 0.1").max(5, "Máximo 5"),
  })
  .refine((data) => !data.allowPartialDays || data.minimumDurationMinutes >= data.granularityMinutes, {
    message: "La duración mínima no puede ser menor que la granularidad",
    path: ["minimumDurationMinutes"],
  })
  .refine((data) => !data.maxDurationMinutes || data.maxDurationMinutes >= data.minimumDurationMinutes, {
    message: "La duración máxima no puede ser menor que la mínima",
    path: ["maxDurationMinutes"],
  });

type FormValues = z.infer<typeof absenceTypeSchema>;

interface AbsenceTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingType: AbsenceTypeRow | null;
}

export function AbsenceTypeDialog({ open, onClose, onSuccess, editingType }: AbsenceTypeDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(absenceTypeSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      color: "#3b82f6",
      isPaid: true,
      requiresApproval: true,
      requiresDocument: false,
      minDaysAdvance: 0,
      affectsBalance: true,
      balanceType: "VACATION",
      allowPartialDays: false,
      granularityMinutes: 480,
      minimumDurationMinutes: 480,
      maxDurationMinutes: null,
      compensationFactor: 1.0,
    },
  });

  // Actualizar valores cuando cambie editingType
  useEffect(() => {
    if (editingType && open) {
      form.reset({
        name: editingType.name,
        code: editingType.code,
        description: editingType.description ?? "",
        color: editingType.color,
        isPaid: editingType.isPaid,
        requiresApproval: editingType.requiresApproval,
        requiresDocument: editingType.requiresDocument,
        minDaysAdvance: editingType.minDaysAdvance,
        affectsBalance: editingType.affectsBalance,
        balanceType: editingType.balanceType ?? "VACATION",
        allowPartialDays: editingType.allowPartialDays,
        granularityMinutes: editingType.granularityMinutes,
        minimumDurationMinutes: editingType.minimumDurationMinutes,
        maxDurationMinutes: editingType.maxDurationMinutes,
        compensationFactor: editingType.compensationFactor,
      });
    } else if (!editingType && open) {
      form.reset({
        name: "",
        code: "",
        description: "",
        color: "#3b82f6",
        isPaid: true,
        requiresApproval: true,
        requiresDocument: false,
        minDaysAdvance: 0,
        affectsBalance: true,
        balanceType: "VACATION",
        allowPartialDays: false,
        granularityMinutes: 480,
        minimumDurationMinutes: 480,
        maxDurationMinutes: null,
        compensationFactor: 1.0,
      });
    }
  }, [editingType, open, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSaving(true);

      const input = {
        name: data.name,
        code: data.code,
        description: data.description,
        color: data.color,
        isPaid: data.isPaid,
        requiresApproval: data.requiresApproval,
        requiresDocument: data.requiresDocument,
        minDaysAdvance: data.minDaysAdvance,
        affectsBalance: data.affectsBalance,
        balanceType: data.balanceType,
        allowPartialDays: data.allowPartialDays,
        granularityMinutes: data.granularityMinutes,
        minimumDurationMinutes: data.minimumDurationMinutes,
        maxDurationMinutes: data.maxDurationMinutes ?? undefined,
        compensationFactor: data.compensationFactor,
      };

      if (editingType) {
        await updateAbsenceType({ id: editingType.id, ...input });
        toast.success("Tipo de ausencia actualizado");
      } else {
        await createAbsenceType(input);
        toast.success("Tipo de ausencia creado");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving absence type:", error);
      toast.error(error.message ?? "Error al guardar el tipo de ausencia");
    } finally {
      setIsSaving(false);
    }
  };

  const allowPartialDays = form.watch("allowPartialDays");
  const affectsBalance = form.watch("affectsBalance");

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingType ? "Editar Tipo de Ausencia" : "Nuevo Tipo de Ausencia"}</DialogTitle>
          <DialogDescription>
            Configura los parámetros del tipo de ausencia, incluyendo granularidad y duración.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información Básica</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Vacaciones" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VACATION"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>Solo letras mayúsculas y guiones bajos</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Días de vacaciones anuales" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="color" {...field} className="h-10 w-20" />
                        <Input {...field} placeholder="#3b82f6" className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Propiedades */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Propiedades</h3>

              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Es remunerado</FormLabel>
                      <FormDescription>El tiempo se paga al empleado</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Requiere aprobación</FormLabel>
                      <FormDescription>Las solicitudes deben ser aprobadas</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresDocument"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Requiere justificante</FormLabel>
                      <FormDescription>El empleado debe adjuntar documentación</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affectsBalance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Afecta balance</FormLabel>
                      <FormDescription>Descuenta del saldo de días disponibles</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="balanceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance a descontar</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!affectsBalance}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un balance" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VACATION">Vacaciones</SelectItem>
                        <SelectItem value="PERSONAL_MATTERS">Asuntos propios</SelectItem>
                        <SelectItem value="COMP_TIME">Compensación</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Solo aplica si afecta al balance</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minDaysAdvance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de anticipación mínimos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value || "0"))}
                      />
                    </FormControl>
                    <FormDescription>Días que el empleado debe solicitar con anticipación</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Granularidad */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Granularidad y Duración</h3>

              <FormField
                control={form.control}
                name="allowPartialDays"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Permite fracciones de día</FormLabel>
                      <FormDescription>Habilita solicitudes por horas/minutos (sector privado)</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {allowPartialDays && (
                <>
                  <FormField
                    control={form.control}
                    name="granularityMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Granularidad (minutos)</FormLabel>
                        <Select
                          value={(field.value ?? 480).toString()}
                          onValueChange={(value) => {
                            const minutes = parseInt(value);
                            field.onChange(minutes);
                            // Ajustar automáticamente la duración mínima a la granularidad
                            form.setValue("minimumDurationMinutes", minutes);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 minutos (cuarto de hora)</SelectItem>
                            <SelectItem value="30">30 minutos (media hora)</SelectItem>
                            <SelectItem value="60">60 minutos (por horas)</SelectItem>
                            <SelectItem value="120">120 minutos (2 horas)</SelectItem>
                            <SelectItem value="240">240 minutos (4 horas)</SelectItem>
                            <SelectItem value="480">480 minutos (día completo)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Incrementos en los que se puede solicitar</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minimumDurationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración mínima (minutos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value ?? 480}
                            onChange={(e) => field.onChange(parseInt(e.target.value || "480"))}
                          />
                        </FormControl>
                        <FormDescription>Tiempo mínimo que se puede solicitar</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxDurationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración máxima (minutos, opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>
                          Tiempo máximo que se puede solicitar (dejar vacío = sin límite)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="compensationFactor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factor de compensación</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        value={field.value ? Number(field.value) : 1}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 1 : value);
                        }}
                        onFocus={(e) => {
                          // Si el campo está vacío al hacer foco, establecer valor 1
                          if (!field.value) {
                            field.onChange(1);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Multiplicador para nocturnidad/festivos (1.0 = normal, 1.5 = nocturno, 1.75 = festivo)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingType ? "Guardar Cambios" : "Crear Tipo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
