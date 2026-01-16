"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, PiggyBank } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTimeBankRequestsStore } from "@/stores/time-bank-requests-store";
import { useTimeBankStore } from "@/stores/time-bank-store";

const requestSchema = z.object({
  type: z.enum(["RECOVERY", "FESTIVE_COMPENSATION"]),
  date: z.string().nonempty("Selecciona una fecha"),
  hours: z
    .number({
      required_error: "Introduce las horas",
      invalid_type_error: "Debes introducir horas válidas",
    })
    .min(0.25, "Mínimo 15 minutos (0.25h)")
    .max(24, "Máximo 24 horas")
    .refine((value) => Math.round(value * 60) % 15 === 0, "Las horas deben ser múltiplos de 15 minutos"),
  reason: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
});

export type TimeBankRequestFormValues = z.infer<typeof requestSchema>;

const REQUEST_TYPE_OPTIONS: Array<{
  value: "RECOVERY" | "FESTIVE_COMPENSATION";
  title: string;
  description: string;
  icon: string;
}> = [
  {
    value: "RECOVERY",
    title: "Recuperar horas",
    description: "Usa tu saldo para ausentarte o salir antes.",
    icon: "minus",
  },
  {
    value: "FESTIVE_COMPENSATION",
    title: "Compensar festivo",
    description: "Añade horas por un festivo trabajado.",
    icon: "plus",
  },
];

const HOUR_PRESETS = [1, 2, 4, 8];

interface TimeBankRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export function TimeBankRequestDialog({ open, onOpenChange }: TimeBankRequestDialogProps) {
  const [selectedType, setSelectedType] = useState<"RECOVERY" | "FESTIVE_COMPENSATION">("RECOVERY");
  const { createRequest, isSubmitting } = useTimeBankRequestsStore();
  const refreshSummary = useTimeBankStore((state) => state.refresh);

  const form = useForm<TimeBankRequestFormValues>({
    resolver: zodResolver(requestSchema),
    mode: "onChange",
    defaultValues: {
      type: "RECOVERY",
      date: format(new Date(), "yyyy-MM-dd"),
      hours: 1,
      reason: "",
    },
  });

  const handleSubmit = async (values: TimeBankRequestFormValues) => {
    try {
      // Convertir horas a minutos para el backend
      const minutes = Math.round(values.hours * 60);

      await createRequest({
        type: values.type,
        date: dateFromInput(values.date),
        minutes,
        reason: values.reason,
      });
      await refreshSummary();
      toast.success("Solicitud enviada correctamente");
      onOpenChange(false);
      setSelectedType("RECOVERY");
      form.reset({
        type: "RECOVERY",
        date: format(new Date(), "yyyy-MM-dd"),
        hours: 1,
        reason: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al enviar la solicitud";
      toast.error(message);
    }
  };

  const setPresetHours = (hours: number) => {
    form.setValue("hours", hours, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Nueva Solicitud de Bolsa de Horas
          </DialogTitle>
          <DialogDescription>
            Envía una solicitud para recuperar horas o compensar un festivo trabajado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Tipo de solicitud */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de solicitud</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedType(value as "RECOVERY" | "FESTIVE_COMPENSATION");
                      }}
                      value={field.value}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      {REQUEST_TYPE_OPTIONS.map((option) => {
                        const inputId = `timebank-option-${option.value}`;
                        const isSelected = field.value === option.value;
                        return (
                          <label
                            key={option.value}
                            htmlFor={inputId}
                            className={cn(
                              "border-input hover:bg-muted/40 flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
                              isSelected && "border-primary bg-primary/5 ring-primary ring-1",
                            )}
                          >
                            <RadioGroupItem value={option.value} id={inputId} className="peer sr-only" />
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                                  option.icon === "minus"
                                    ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30",
                                )}
                              >
                                {option.icon === "minus" ? "−" : "+"}
                              </div>
                              <span className="text-sm font-semibold">{option.title}</span>
                            </div>
                            <p className="text-muted-foreground text-xs">{option.description}</p>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Fecha y Horas */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="date" {...field} />
                        <CalendarIcon className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.25}
                        max={24}
                        step={0.25}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Ej: 1.5 = 1h 30min</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Presets de horas */}
            <div className="flex flex-wrap gap-2">
              {HOUR_PRESETS.map((hours) => (
                <Button
                  key={hours}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("h-8 px-3 text-xs", form.watch("hours") === hours && "border-primary bg-primary/10")}
                  onClick={() => setPresetHours(hours)}
                >
                  {hours}h
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("h-8 px-3 text-xs", form.watch("hours") === 0.5 && "border-primary bg-primary/10")}
                onClick={() => setPresetHours(0.5)}
              >
                30min
              </Button>
            </div>

            {/* Motivo */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        selectedType === "RECOVERY"
                          ? "Describe por qué necesitas usar tu bolsa..."
                          : "Describe el festivo trabajado o motivo de compensación..."
                      }
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando
                  </>
                ) : (
                  "Enviar solicitud"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
