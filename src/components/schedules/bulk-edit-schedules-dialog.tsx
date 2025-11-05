"use client";

import { useState, useEffect, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, X, Clock, Calendar, Sun, AlertTriangle, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractsStore, type Contract } from "@/stores/contracts-store";

import { BulkEditSchedulesPreview } from "./bulk-edit-schedules-preview";

// Regex para validar formato MM-DD (mes: 01-12, día: 01-31)
const MM_DD_REGEX = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

// Función para validar que el día sea válido para el mes dado
const isValidDayForMonth = (mmdd: string): boolean => {
  if (!mmdd || mmdd.trim().length === 0) return true; // Opcional
  const [month, day] = mmdd.split("-").map(Number);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
};

const bulkEditSchema = z
  .object({
    weeklyHours: z
      .number()
      .min(1, "Las horas semanales deben ser mayor a 0")
      .max(60, "Las horas semanales no pueden exceder 60")
      .optional()
      .nullable(),
    workingDaysPerWeek: z
      .number()
      .min(0.5, "Los días laborables deben ser al menos 0.5")
      .max(7, "Los días laborables no pueden exceder 7")
      .optional()
      .nullable(),
    hasIntensiveSchedule: z.boolean().optional().nullable(),
    intensiveStartDate: z
      .string()
      .regex(MM_DD_REGEX, "Formato inválido. Usa MM-DD (ej: 06-15)")
      .refine(isValidDayForMonth, "Día inválido para el mes")
      .optional()
      .or(z.literal("")),
    intensiveEndDate: z
      .string()
      .regex(MM_DD_REGEX, "Formato inválido. Usa MM-DD (ej: 09-15)")
      .refine(isValidDayForMonth, "Día inválido para el mes")
      .optional()
      .or(z.literal("")),
    intensiveWeeklyHours: z
      .number()
      .min(1, "Las horas semanales deben ser mayor a 0")
      .max(60, "Las horas semanales no pueden exceder 60")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Si tiene jornada intensiva, los campos deben estar completos
      if (data.hasIntensiveSchedule) {
        return (
          data.intensiveStartDate &&
          data.intensiveStartDate.trim().length > 0 &&
          data.intensiveEndDate &&
          data.intensiveEndDate.trim().length > 0 &&
          data.intensiveWeeklyHours !== null &&
          data.intensiveWeeklyHours !== undefined
        );
      }
      return true;
    },
    {
      message: "Si activas la jornada intensiva, debes proporcionar fecha de inicio, fecha de fin y horas semanales",
      path: ["hasIntensiveSchedule"],
    },
  );

type BulkEditFormData = z.infer<typeof bulkEditSchema>;

const MONTHS = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const getDaysInMonth = (month: string): number => {
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthNum = parseInt(month, 10);
  return monthNum >= 1 && monthNum <= 12 ? daysInMonth[monthNum - 1] : 31;
};

interface BulkEditSchedulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContracts: Contract[];
  onSuccess?: () => void;
}

export function BulkEditSchedulesDialog({
  open,
  onOpenChange,
  selectedContracts,
  onSuccess,
}: BulkEditSchedulesDialogProps) {
  const { bulkUpdateContracts, isBulkUpdating } = useContractsStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<BulkEditFormData>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      weeklyHours: undefined,
      workingDaysPerWeek: undefined,
      hasIntensiveSchedule: false,
      intensiveStartDate: "",
      intensiveEndDate: "",
      intensiveWeeklyHours: undefined,
    },
  });

  // Estados para selectores de fecha intensiva
  const [intensiveStartMonth, setIntensiveStartMonth] = useState("");
  const [intensiveStartDay, setIntensiveStartDay] = useState("");
  const [intensiveEndMonth, setIntensiveEndMonth] = useState("");
  const [intensiveEndDay, setIntensiveEndDay] = useState("");

  // Calcular horas diarias y nivel de alerta
  const weeklyHours = form.watch("weeklyHours");
  const workingDaysPerWeek = form.watch("workingDaysPerWeek");
  const hasIntensiveSchedule = form.watch("hasIntensiveSchedule");
  const intensiveWeeklyHours = form.watch("intensiveWeeklyHours");

  const dailyHoursInfo = useMemo(() => {
    if (!weeklyHours || !workingDaysPerWeek || workingDaysPerWeek === 0) {
      return { dailyHours: 0, alertLevel: "none" as const };
    }

    const dailyHours = weeklyHours / workingDaysPerWeek;

    if (dailyHours > 12) {
      return { dailyHours, alertLevel: "danger" as const };
    } else if (dailyHours > 10) {
      return { dailyHours, alertLevel: "warning" as const };
    } else {
      return { dailyHours, alertLevel: "none" as const };
    }
  }, [weeklyHours, workingDaysPerWeek]);

  const intensiveDailyHoursInfo = useMemo(() => {
    if (!hasIntensiveSchedule || !intensiveWeeklyHours || !workingDaysPerWeek || workingDaysPerWeek === 0) {
      return { dailyHours: 0, alertLevel: "none" as const };
    }

    const dailyHours = intensiveWeeklyHours / workingDaysPerWeek;

    if (dailyHours > 12) {
      return { dailyHours, alertLevel: "danger" as const };
    } else if (dailyHours > 10) {
      return { dailyHours, alertLevel: "warning" as const };
    } else {
      return { dailyHours, alertLevel: "none" as const };
    }
  }, [hasIntensiveSchedule, intensiveWeeklyHours, workingDaysPerWeek]);

  // Reset form cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      form.reset({
        weeklyHours: undefined,
        workingDaysPerWeek: undefined,
        hasIntensiveSchedule: false,
        intensiveStartDate: "",
        intensiveEndDate: "",
        intensiveWeeklyHours: undefined,
      });
      setIntensiveStartMonth("");
      setIntensiveStartDay("");
      setIntensiveEndMonth("");
      setIntensiveEndDay("");
    }
  }, [open, form]);

  // Sincronizar selectores de fecha de inicio con el campo del formulario
  useEffect(() => {
    if (intensiveStartMonth && intensiveStartDay) {
      const mmdd = `${intensiveStartMonth}-${intensiveStartDay}`;
      form.setValue("intensiveStartDate", mmdd, { shouldValidate: true });
    } else if (!intensiveStartMonth && !intensiveStartDay) {
      form.setValue("intensiveStartDate", "", { shouldValidate: false });
    }
  }, [intensiveStartMonth, intensiveStartDay, form]);

  // Sincronizar selectores de fecha de fin con el campo del formulario
  useEffect(() => {
    if (intensiveEndMonth && intensiveEndDay) {
      const mmdd = `${intensiveEndMonth}-${intensiveEndDay}`;
      form.setValue("intensiveEndDate", mmdd, { shouldValidate: true });
    } else if (!intensiveEndMonth && !intensiveEndDay) {
      form.setValue("intensiveEndDate", "", { shouldValidate: false });
    }
  }, [intensiveEndMonth, intensiveEndDay, form]);

  const onSubmit = async (data: BulkEditFormData) => {
    try {
      setIsProcessing(true);

      // Preparar datos para actualización
      const updateData: any = {};

      // Solo incluir campos que se han especificado
      if (data.weeklyHours !== undefined && data.weeklyHours !== null) {
        updateData.weeklyHours = data.weeklyHours;
      }

      if (data.workingDaysPerWeek !== undefined && data.workingDaysPerWeek !== null) {
        updateData.workingDaysPerWeek = data.workingDaysPerWeek;
      }

      if (data.hasIntensiveSchedule !== undefined && data.hasIntensiveSchedule !== null) {
        updateData.hasIntensiveSchedule = data.hasIntensiveSchedule;

        if (data.hasIntensiveSchedule) {
          updateData.intensiveStartDate =
            data.intensiveStartDate && data.intensiveStartDate.trim().length > 0
              ? data.intensiveStartDate.trim()
              : null;
          updateData.intensiveEndDate =
            data.intensiveEndDate && data.intensiveEndDate.trim().length > 0 ? data.intensiveEndDate.trim() : null;
          updateData.intensiveWeeklyHours = data.intensiveWeeklyHours;
        } else {
          // Si se desactiva la jornada intensiva, limpiar los campos
          updateData.intensiveStartDate = null;
          updateData.intensiveEndDate = null;
          updateData.intensiveWeeklyHours = null;
        }
      }

      // Verificar que hay al menos un campo para actualizar
      if (Object.keys(updateData).length === 0) {
        toast.error("No hay cambios para aplicar", {
          description: "Especifica al menos un campo para actualizar",
        });
        setIsProcessing(false);
        return;
      }

      // Extraer IDs de los contratos seleccionados
      const contractIds = selectedContracts.map((c) => c.id);

      // Actualizar todos los contratos en una sola llamada
      await bulkUpdateContracts(contractIds, updateData);

      toast.success(
        `${selectedContracts.length} ${selectedContracts.length === 1 ? "horario actualizado" : "horarios actualizados"}`,
        {
          description: "Todos los cambios se aplicaron correctamente",
        },
      );

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Error al actualizar horarios", {
        description: error.message ?? "Ocurrió un error inesperado",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-3">
            <div className="from-primary/10 to-primary/5 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-t shadow-sm">
              <Users className="text-primary h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-semibold">Edición Masiva de Horarios</DialogTitle>
              <DialogDescription className="text-muted-foreground text-base">
                Aplicar cambios a{" "}
                <span className="text-foreground font-medium">
                  {selectedContracts.length} {selectedContracts.length === 1 ? "horario" : "horarios"}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert className="border-l-4 border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/50">
          <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="dark:text-foreground text-blue-900">
            Los campos que dejes vacíos no se modificarán. Solo especifica los valores que quieres cambiar.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Información del Horario */}
              <div className="bg-card space-y-4 rounded-lg border p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="text-primary h-5 w-5" />
                  <Label className="text-lg font-semibold">Horario Regular</Label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="weeklyHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horas Semanales</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                            <Input
                              type="number"
                              min="1"
                              max="60"
                              step="0.5"
                              placeholder="40"
                              className="pl-9"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange(undefined);
                                } else {
                                  field.onChange(Number(value));
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workingDaysPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Días laborables por semana</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                            <Input
                              type="number"
                              min="0.5"
                              max="7"
                              step="0.5"
                              placeholder="5"
                              className="pl-9"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange(undefined);
                                } else {
                                  field.onChange(Number(value));
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Cálculo y avisos de horas diarias */}
                {dailyHoursInfo.dailyHours > 0 && (
                  <div className="space-y-3">
                    <div className="bg-muted/30 rounded-md border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="text-muted-foreground h-4 w-4" />
                          <span className="text-muted-foreground">Jornada diaria:</span>
                        </div>
                        <span className="text-primary text-base font-semibold">
                          {dailyHoursInfo.dailyHours.toFixed(2)} horas
                        </span>
                      </div>
                    </div>

                    {dailyHoursInfo.alertLevel === "warning" && (
                      <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800 dark:text-orange-200">
                          ⚠️ La jornada diaria de {dailyHoursInfo.dailyHours.toFixed(2)} horas supera las 10 horas
                          recomendadas.
                        </AlertDescription>
                      </Alert>
                    )}

                    {dailyHoursInfo.alertLevel === "danger" && (
                      <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                          🚨 La jornada diaria de {dailyHoursInfo.dailyHours.toFixed(2)} horas supera las 12 horas.
                          Verifica que esto sea correcto.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>

              {/* Jornada Intensiva */}
              <div className="bg-card space-y-4 rounded-lg border p-6">
                <div className="flex items-center gap-2">
                  <Sun className="text-primary h-5 w-5" />
                  <Label className="text-base font-semibold">Jornada Intensiva (ej: horario de verano)</Label>
                </div>

                <FormField
                  control={form.control}
                  name="hasIntensiveSchedule"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Tiene jornada intensiva</FormLabel>
                        <p className="text-muted-foreground text-sm">
                          Activa si el trabajador tiene un horario especial durante ciertos períodos (ej: verano)
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {hasIntensiveSchedule && (
                  <div className="bg-muted/20 space-y-4 rounded-md border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Fecha de Inicio */}
                      <div className="space-y-2">
                        <FormLabel>Fecha de Inicio *</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={intensiveStartMonth} onValueChange={setIntensiveStartMonth}>
                            <SelectTrigger>
                              <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month) => (
                                <SelectItem key={month.value} value={month.value}>
                                  {month.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={intensiveStartDay}
                            onValueChange={setIntensiveStartDay}
                            disabled={!intensiveStartMonth}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Día" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: getDaysInMonth(intensiveStartMonth) }, (_, i) => {
                                const day = String(i + 1).padStart(2, "0");
                                return (
                                  <SelectItem key={day} value={day}>
                                    {day}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-muted-foreground text-xs">Selecciona mes y día. Ejemplo: Junio - 15</p>
                        {form.formState.errors.intensiveStartDate && (
                          <p className="text-destructive text-sm font-medium">
                            {form.formState.errors.intensiveStartDate.message}
                          </p>
                        )}
                      </div>

                      {/* Fecha de Fin */}
                      <div className="space-y-2">
                        <FormLabel>Fecha de Fin *</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={intensiveEndMonth} onValueChange={setIntensiveEndMonth}>
                            <SelectTrigger>
                              <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month) => (
                                <SelectItem key={month.value} value={month.value}>
                                  {month.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={intensiveEndDay}
                            onValueChange={setIntensiveEndDay}
                            disabled={!intensiveEndMonth}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Día" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: getDaysInMonth(intensiveEndMonth) }, (_, i) => {
                                const day = String(i + 1).padStart(2, "0");
                                return (
                                  <SelectItem key={day} value={day}>
                                    {day}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-muted-foreground text-xs">Selecciona mes y día. Ejemplo: Septiembre - 15</p>
                        {form.formState.errors.intensiveEndDate && (
                          <p className="text-destructive text-sm font-medium">
                            {form.formState.errors.intensiveEndDate.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="intensiveWeeklyHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horas Semanales *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Clock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                              <Input
                                type="number"
                                min="1"
                                max="60"
                                step="0.5"
                                placeholder="35"
                                className="pl-9"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    field.onChange(undefined);
                                  } else {
                                    field.onChange(Number(value));
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cálculo y avisos de horas diarias intensivas */}
                    {intensiveDailyHoursInfo.dailyHours > 0 && (
                      <div className="space-y-3">
                        <div className="bg-muted/30 rounded-md border p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Sun className="text-muted-foreground h-4 w-4" />
                              <span className="text-muted-foreground">Jornada diaria intensiva:</span>
                            </div>
                            <span className="text-primary text-base font-semibold">
                              {intensiveDailyHoursInfo.dailyHours.toFixed(2)} horas
                            </span>
                          </div>
                        </div>

                        {intensiveDailyHoursInfo.alertLevel === "warning" && (
                          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800 dark:text-orange-200">
                              ⚠️ La jornada diaria intensiva de {intensiveDailyHoursInfo.dailyHours.toFixed(2)} horas
                              supera las 10 horas recomendadas.
                            </AlertDescription>
                          </Alert>
                        )}

                        {intensiveDailyHoursInfo.alertLevel === "danger" && (
                          <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800 dark:text-red-200">
                              🚨 La jornada diaria intensiva de {intensiveDailyHoursInfo.dailyHours.toFixed(2)} horas
                              supera las 12 horas. Verifica que esto sea correcto.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview de cambios */}
              <BulkEditSchedulesPreview
                selectedContracts={selectedContracts}
                changes={{
                  weeklyHours: weeklyHours ?? undefined,
                  workingDaysPerWeek: workingDaysPerWeek ?? undefined,
                  hasIntensiveSchedule: hasIntensiveSchedule ?? undefined,
                  intensiveStartDate: form.watch("intensiveStartDate") ?? undefined,
                  intensiveEndDate: form.watch("intensiveEndDate") ?? undefined,
                  intensiveWeeklyHours: intensiveWeeklyHours ?? undefined,
                }}
              />

              {/* Botones */}
              <div className="bg-muted/30 -mx-6 -mb-6 flex justify-end gap-3 border-t px-6 py-4 pt-8">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando {selectedContracts.length} {selectedContracts.length === 1 ? "horario" : "horarios"}
                      ...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Aplicar cambios a {selectedContracts.length}{" "}
                      {selectedContracts.length === 1 ? "horario" : "horarios"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
