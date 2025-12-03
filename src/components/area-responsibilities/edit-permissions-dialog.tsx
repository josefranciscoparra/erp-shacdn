"use client";

import { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
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
import type { Scope } from "@/services/permissions";
import {
  updateResponsibility,
  type AreaResponsibilityData,
  type Permission,
} from "@/server/actions/area-responsibilities";

interface EditPermissionsDialogProps {
  responsibility: AreaResponsibilityData;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scope?: Scope; // Opcional, para mostrar texto contextual
}

// Labels de scopes en español
const scopeLabels: Record<Scope, string> = {
  ORGANIZATION: "organización",
  COST_CENTER: "centro de coste",
  TEAM: "equipo",
};

// Permisos disponibles
const availablePermissions = [
  { value: "VIEW_EMPLOYEES" as const, label: "Ver Empleados" },
  { value: "MANAGE_EMPLOYEES" as const, label: "Gestionar Empleados" },
  { value: "VIEW_TIME_ENTRIES" as const, label: "Ver Fichajes" },
  { value: "MANAGE_TIME_ENTRIES" as const, label: "Gestionar Fichajes" },
  { value: "VIEW_ALERTS" as const, label: "Ver Alertas" },
  { value: "RESOLVE_ALERTS" as const, label: "Resolver Alertas" },
  { value: "VIEW_SCHEDULES" as const, label: "Ver Horarios" },
  { value: "MANAGE_SCHEDULES" as const, label: "Gestionar Horarios" },
  { value: "VIEW_PTO_REQUESTS" as const, label: "Ver Ausencias" },
  { value: "APPROVE_PTO_REQUESTS" as const, label: "Aprobar Ausencias" },
];

const formSchema = z.object({
  permissions: z.array(z.string()).min(1, "Debes seleccionar al menos un permiso"),
});

type FormData = z.infer<typeof formSchema>;

export function EditPermissionsDialog({ responsibility, open, onClose, onSuccess, scope }: EditPermissionsDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      permissions: responsibility.permissions,
    },
  });

  // Actualizar permisos cuando cambia la responsabilidad
  useEffect(() => {
    form.reset({
      permissions: responsibility.permissions,
    });
  }, [responsibility, form]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const { success, error } = await updateResponsibility(responsibility.id, {
        permissions: data.permissions as Permission[],
      });

      if (success) {
        toast.success("Permisos actualizados correctamente");
        onClose();
        onSuccess();
      } else {
        toast.error(error ?? "Error al actualizar permisos");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const scopeLabel = scope ? scopeLabels[scope] : "ámbito";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Permisos</DialogTitle>
          <DialogDescription>
            Actualiza los permisos de <strong>{responsibility.user.name}</strong> en este {scopeLabel}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Usuario readonly */}
            <div className="rounded-lg border p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Usuario</span>
                <span className="text-sm">{responsibility.user.name}</span>
                <span className="text-muted-foreground text-xs">{responsibility.user.email}</span>
              </div>
            </div>

            {/* Checkboxes de permisos (grid 2 columnas) */}
            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Permisos</FormLabel>
                    <FormDescription>Selecciona los nuevos permisos para el responsable</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {availablePermissions.map((perm) => (
                      <FormField
                        key={perm.value}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(perm.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? [];
                                  if (checked) {
                                    field.onChange([...current, perm.value]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== perm.value));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">{perm.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Actualizando..." : "Actualizar Permisos"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
