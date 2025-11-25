"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, PiggyBank } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTimeBankRequestsStore } from "@/stores/time-bank-requests-store";
import { useTimeBankStore } from "@/stores/time-bank-store";

const requestSchema = z.object({
  type: z.enum(["RECOVERY", "FESTIVE_COMPENSATION"]),
  date: z.string().nonempty("Selecciona una fecha"),
  minutes: z
    .number({
      required_error: "Introduce los minutos",
      invalid_type_error: "Debes introducir minutos válidos",
    })
    .int("Los minutos deben ser enteros")
    .positive("Los minutos deben ser positivos"),
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
}> = [
  {
    value: "RECOVERY",
    title: "Recuperar horas",
    description: "Restaremos minutos de tu saldo para salir antes o ausentarte un día concreto.",
  },
  {
    value: "FESTIVE_COMPENSATION",
    title: "Compensar festivo",
    description: "Añade minutos a tu saldo por un festivo trabajado o un servicio extraordinario.",
  },
];

interface TimeBankRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
      minutes: 60,
      reason: "",
    },
  });

  const handleSubmit = async (values: TimeBankRequestFormValues) => {
    try {
      await createRequest({
        type: values.type,
        date: new Date(values.date),
        minutes: values.minutes,
        reason: values.reason,
      });
      await refreshSummary();
      toast.success("Solicitud enviada correctamente");
      onOpenChange(false);
      setSelectedType("RECOVERY");
      form.reset({
        type: "RECOVERY",
        date: format(new Date(), "yyyy-MM-dd"),
        minutes: 60,
        reason: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al enviar la solicitud";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <PiggyBank className="h-4 w-4" />
          Solicitar uso de bolsa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar uso de la Bolsa de Horas</DialogTitle>
          <DialogDescription>Envía una solicitud para recuperar horas o compensar un festivo trabajado.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                              "border-input hover:bg-muted/40 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                              isSelected && "border-primary bg-primary/5",
                            )}
                          >
                            <RadioGroupItem value={option.value} id={inputId} className="sr-only peer" />
                            <div className="text-sm font-semibold">{option.title}</div>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

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
                        <CalendarIcon className="text-muted-foreground absolute right-3 top-3 h-4 w-4" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={15}
                        step={15}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        selectedType === "RECOVERY"
                          ? "Describe por qué necesitas usar tu bolsa para este día"
                          : "Describe el festivo trabajado o el motivo de la compensación"
                      }
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-3">
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
