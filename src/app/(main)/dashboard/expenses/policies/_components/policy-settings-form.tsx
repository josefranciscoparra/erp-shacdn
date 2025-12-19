"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updatePolicy } from "@/server/actions/expense-policies";

// Esquema de validación del formulario
const policyFormSchema = z.object({
  mileageRateEurPerKm: z.coerce.number().min(0).max(10),
  mealDailyLimit: z.coerce.number().min(0),
  lodgingDailyLimit: z.coerce.number().min(0),
  attachmentRequired: z.boolean(),
});

type PolicyFormValues = z.infer<typeof policyFormSchema>;

interface ExpensePolicy {
  mileageRateEurPerKm: string | number;
  mealDailyLimit: string | number | null;
  lodgingDailyLimit: string | number | null;
  attachmentRequired: boolean;
  expenseMode?: string; // Se recibe para contexto, pero no se edita
}

interface PolicySettingsFormProps {
  initialData: ExpensePolicy;
}

export function PolicySettingsForm({ initialData }: PolicySettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar formulario
  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      mileageRateEurPerKm: Number(initialData.mileageRateEurPerKm) || 0.26,
      mealDailyLimit: initialData.mealDailyLimit ? Number(initialData.mealDailyLimit) : 30,
      lodgingDailyLimit: initialData.lodgingDailyLimit ? Number(initialData.lodgingDailyLimit) : 100,
      attachmentRequired: initialData.attachmentRequired,
    },
  });

  async function onSubmit(data: PolicyFormValues) {
    setIsSaving(true);
    try {
      const result = await updatePolicy(data);
      if (result.success) {
        toast.success("Políticas actualizadas correctamente");
        // Recargar para aplicar cambios si fuera necesario (aunque ahora solo son valores numéricos)
        window.location.reload();
      } else {
        toast.error(result.error ?? "Error al actualizar políticas");
      }
    } catch (error) {
      toast.error("Error desconocido al guardar");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  const modeLabel =
    initialData.expenseMode === "PUBLIC"
      ? "Modo Público (Administración)"
      : initialData.expenseMode === "MIXED"
        ? "Modo Mixto"
        : "Modo Privado (Empresa)";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Banner informativo del modo actual */}
        <div className="bg-muted/50 flex items-center justify-between rounded-lg border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">Modo actual:</span>
            <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-sm font-semibold">{modeLabel}</span>
          </div>
          <p className="text-muted-foreground hidden text-xs md:block">Configurando reglas aplicables a este modo.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* SECCIÓN 1: LÍMITES POR CATEGORÍA */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Límites de Gasto</CardTitle>
              <CardDescription>
                {initialData.expenseMode === "PUBLIC"
                  ? "Define las dietas y límites máximos para indemnizaciones."
                  : "Establece los límites máximos permitidos por categoría."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="mealDailyLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comidas (Diario)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="0.5" {...field} className="pl-8" />
                        <span className="text-muted-foreground absolute top-2.5 left-3 text-sm">€</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {initialData.expenseMode === "PUBLIC" ? "Cuantía de la dieta diaria." : "Máximo por día."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lodgingDailyLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alojamiento (Noche)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="1" {...field} className="pl-8" />
                        <span className="text-muted-foreground absolute top-2.5 left-3 text-sm">€</span>
                      </div>
                    </FormControl>
                    <FormDescription>Máximo por noche de hotel.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mileageRateEurPerKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometraje</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="0.01" {...field} className="pl-8" />
                        <span className="text-muted-foreground absolute top-2.5 left-3 text-sm">€</span>
                      </div>
                    </FormControl>
                    <FormDescription>Pago por km (coche propio).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* SECCIÓN 2: REQUISITOS */}
          <Card>
            <CardHeader>
              <CardTitle>Requisitos</CardTitle>
              <CardDescription>Configura validaciones obligatorias para los gastos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="attachmentRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Ticket Obligatorio</FormLabel>
                      <FormDescription>
                        {initialData.expenseMode === "PUBLIC"
                          ? "Obligatorio para fiscalización (Intervención)."
                          : "Exigir adjunto para todos los gastos."}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
