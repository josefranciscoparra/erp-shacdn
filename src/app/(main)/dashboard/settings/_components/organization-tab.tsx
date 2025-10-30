"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Card } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const organizationSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  vat: z.string().optional(),
  active: z.boolean(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export function OrganizationTab() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      vat: "",
      active: true,
    },
  });

  useEffect(() => {
    const loadOrganization = async () => {
      if (!session?.user?.orgId) {
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/organization/${session.user.orgId}`);

        if (!response.ok) {
          throw new Error("No se pudo cargar la organización");
        }

        const data = await response.json();
        const orgData: OrganizationFormData = {
          name: data.name ?? "",
          vat: data.vat ?? "",
          active: data.active ?? true,
        };

        form.reset(orgData);
      } catch (error) {
        console.error("Error loading organization:", error);
        toast.error("Error al cargar los datos de la organización");
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrganization();
  }, [session?.user?.orgId, form]);

  if (isLoading) {
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

          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Información de la organización</h3>
            <p className="text-muted-foreground text-sm">Datos básicos de tu empresa (solo lectura)</p>
          </div>
        </div>

        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la organización</FormLabel>
                  <FormControl>
                    <Input placeholder="Mi Empresa S.L." {...field} disabled />
                  </FormControl>
                  <FormDescription>Nombre legal de tu empresa u organización</FormDescription>
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
                    <Input placeholder="B12345678" {...field} disabled />
                  </FormControl>
                  <FormDescription>Número de identificación fiscal de la empresa</FormDescription>
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
                    <FormDescription>{field.value ? "Organización activa" : "Organización inactiva"}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </Card>
  );
}
