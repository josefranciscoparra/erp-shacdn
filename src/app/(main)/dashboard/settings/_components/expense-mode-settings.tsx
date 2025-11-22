"use client";

import { useEffect, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationExpenseMode } from "@/server/actions/organizations"; // Need to create this
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

const formSchema = z.object({
  expenseMode: z.enum(["PRIVATE", "PUBLIC", "MIXED"]),
});

interface ExpenseModeSettingsProps {
  initialMode: "PRIVATE" | "PUBLIC" | "MIXED";
}

export function ExpenseModeSettings({ initialMode }: ExpenseModeSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { features, setFeatures } = useOrganizationFeaturesStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expenseMode: initialMode,
    },
  });

  useEffect(() => {
    form.reset({ expenseMode: initialMode });
  }, [initialMode, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await updateOrganizationExpenseMode(values.expenseMode);

      if (result.success) {
        // Actualización optimista del store cliente para refrescar el sidebar inmediatamente
        setFeatures({
          ...features,
          expenseMode: values.expenseMode,
        });

        toast.success("Configuración actualizada", {
          description: "El modo de gestión de gastos se ha actualizado correctamente.",
        });
        router.refresh();
      } else {
        toast.error("Error", {
          description: result.error ?? "Ha ocurrido un error al actualizar la configuración.",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modo de Gestión de Gastos</CardTitle>
        <CardDescription>
          Define cómo se gestionan los gastos en tu organización (Sector Privado vs Público).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="expenseMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modo Operativo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PRIVATE">
                        <span className="font-semibold">Sector Privado (Estándar)</span>
                        <p className="text-muted-foreground text-xs">Flujo: Gasto → Aprobación Manager → Reembolso</p>
                      </SelectItem>
                      <SelectItem value="PUBLIC">
                        <span className="font-semibold">Sector Público</span>
                        <p className="text-muted-foreground text-xs">
                          Flujo: Expediente → Autorización → Justificación
                        </p>
                      </SelectItem>
                      <SelectItem value="MIXED">
                        <span className="font-semibold">Mixto / Híbrido</span>
                        <p className="text-muted-foreground text-xs">Permite ambos flujos simultáneamente</p>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Cambiar este modo afectará a las opciones disponibles en el menú de gastos.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
