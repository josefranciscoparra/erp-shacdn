"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { HierarchyType } from "@prisma/client";
import { useForm } from "react-hook-form";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createOrganizationSchema, type CreateOrganizationInput } from "@/validators/organization";

export type OrganizationFormValues = CreateOrganizationInput;

interface OrganizationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrganizationFormValues) => Promise<void>;
  isSubmitting: boolean;
  initialValues?: {
    name: string;
    vat: string | null;
    active: boolean;
    hierarchyType?: HierarchyType;
  } | null;
  mode: "create" | "edit";
}

export function OrganizationFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialValues,
  mode,
}: OrganizationFormDialogProps) {
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      vat: "",
      active: true,
      hierarchyType: HierarchyType.DEPARTMENTAL,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: initialValues?.name ?? "",
        vat: initialValues?.vat ?? "",
        active: initialValues?.active ?? true,
        hierarchyType: initialValues?.hierarchyType ?? HierarchyType.DEPARTMENTAL,
      });
    }
  }, [open, initialValues, form]);

  const handleSubmit = async (values: OrganizationFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nueva organización" : "Editar organización"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Crea una nueva organización para gestionar sus empleados y configuraciones."
              : "Actualiza la información de la organización seleccionada."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Introduce el nombre legal" {...field} />
                  </FormControl>
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
                    <Input placeholder="Ej. B12345678" value={field.value ?? ""} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "create" && (
              <FormField
                control={form.control}
                name="hierarchyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de jerarquía</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo de estructura" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={HierarchyType.FLAT}>
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium">Plana</span>
                            <span className="text-muted-foreground text-xs">Sin jerarquía, equipos horizontales</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={HierarchyType.DEPARTMENTAL}>
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium">Por Departamentos</span>
                            <span className="text-muted-foreground text-xs">Managers por departamento + empleados</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={HierarchyType.HIERARCHICAL}>
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium">Jerárquica Completa</span>
                            <span className="text-muted-foreground text-xs">
                              CEO → Directores → Managers → Empleados
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Define la estructura organizacional (inmutable después de crear).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <FormLabel className="text-base">Organización activa</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Determina si esta organización puede ser utilizada en el sistema.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : mode === "create" ? "Crear" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
