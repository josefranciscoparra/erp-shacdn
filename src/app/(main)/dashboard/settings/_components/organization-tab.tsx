"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const organizationSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  vat: z.string().optional(),
  active: z.boolean(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export function OrganizationTab() {
  const [isLoading, setIsLoading] = useState(false);

  // Valores por defecto (en producción vendrían del store o API)
  const defaultValues: OrganizationFormData = {
    name: "Mi Organización",
    vat: "",
    active: true,
  };

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues,
  });

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);
    try {
      // TODO: Conectar con API cuando esté disponible
      // await fetch("/api/organization", { method: "PUT", body: JSON.stringify(data) });

      console.log("Datos de organización:", data);

      // Simular guardado
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success("Configuración de organización actualizada");
      form.reset(data);
    } catch (error) {
      toast.error("Error al actualizar la configuración");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = form.formState.isDirty;

  return (
    <Card className="rounded-lg border p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Información de la organización</h3>
            <p className="text-muted-foreground text-sm">Datos básicos de tu empresa</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la organización</FormLabel>
                  <FormControl>
                    <Input placeholder="Mi Empresa S.L." {...field} />
                  </FormControl>
                  <FormDescription>
                    Nombre legal de tu empresa u organización
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIF/CIF</FormLabel>
                  <FormControl>
                    <Input placeholder="B12345678" {...field} />
                  </FormControl>
                  <FormDescription>
                    Número de identificación fiscal de la empresa
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Estado de la organización</FormLabel>
                    <FormDescription>
                      {field.value ? "Organización activa" : "Organización inactiva"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty || isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  );
}
