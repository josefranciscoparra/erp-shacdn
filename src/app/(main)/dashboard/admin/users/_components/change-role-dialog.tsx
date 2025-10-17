"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Role } from "@prisma/client";
import { Loader2, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { type UserRow } from "./users-columns";

interface ChangeRoleDialogProps {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  allowedRoles: Role[];
}

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Org",
  HR_ADMIN: "Admin RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

const changeRoleSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"], {
    errorMap: () => ({ message: "Selecciona un rol válido" }),
  }),
});

type FormValues = z.infer<typeof changeRoleSchema>;

export function ChangeRoleDialog({ user, open, onOpenChange, onSuccess, allowedRoles }: ChangeRoleDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: {
      role: user?.role ?? allowedRoles[0],
    },
  });

  // Actualizar rol cuando cambia el usuario
  React.useEffect(() => {
    if (user) {
      form.reset({ role: user.role });
    }
  }, [user, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-role",
          userId: user.id,
          role: values.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Error al cambiar el rol");
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Error de conexión al servidor");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
          <DialogDescription>Modifica el rol de {user.name} en el sistema</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Rol actual */}
            <div className="bg-muted/50 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs">Rol actual</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <Badge variant="outline">{ROLE_DISPLAY_NAMES[user.role]}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de nuevo rol */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo Rol *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allowedRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_DISPLAY_NAMES[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advertencia */}
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Importante:</strong> El cambio de rol afectará inmediatamente los permisos y accesos del usuario
                en el sistema.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cambiar Rol
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
