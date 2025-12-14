"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Loader2, Shield } from "lucide-react";
import { signOut } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { passwordSchema, MAX_PASSWORD_ATTEMPTS, PASSWORD_LOCK_MINUTES } from "@/lib/validations/password";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function SecuritySettings() {
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { isSubmitting } = form.formState;
  const currentPassword = useWatch({ control: form.control, name: "currentPassword", defaultValue: "" });
  const newPassword = useWatch({ control: form.control, name: "newPassword", defaultValue: "" });
  const confirmPassword = useWatch({ control: form.control, name: "confirmPassword", defaultValue: "" });

  const isButtonDisabled =
    isSubmitting ||
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    (newPassword.length > 0 && newPassword !== confirmPassword);

  const onSubmit = async (data: ChangePasswordForm) => {
    setBlockedError(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Mapear errores al campo correcto
        if (response.status === 401) {
          form.setError("currentPassword", { message: result.error ?? "Contraseña actual incorrecta" });
        } else if (response.status === 400) {
          form.setError("newPassword", { message: result.error ?? "Error de validación" });
        } else if (response.status === 429) {
          setBlockedError(result.error ?? "Cuenta bloqueada temporalmente. Inténtalo más tarde.");
        } else {
          form.setError("root", { message: result.error ?? "Error al cambiar la contraseña" });
        }
        return;
      }

      // Éxito
      toast.success("Contraseña cambiada correctamente");
      form.reset();
      await signOut({ callbackUrl: "/auth/login?pwChanged=1" });
    } catch (error) {
      form.setError("root", { message: "Error de conexión. Inténtalo de nuevo." });
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Card className="@container/card flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2">
        <Shield className="text-primary h-5 w-5" />
        <h3 className="text-lg font-semibold">Seguridad</h3>
      </div>

      {/* Alerta de bloqueo (429) */}
      {blockedError && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>{blockedError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h4 className="font-medium">Cambiar contraseña</h4>
          <p className="text-muted-foreground text-sm">
            Actualiza tu contraseña para mantener tu cuenta segura. Serás redirigido al login tras el cambio.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contraseña actual */}
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña actual</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPasswords.current ? "text" : "password"}
                        placeholder="Introduce tu contraseña actual"
                        disabled={isSubmitting}
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-full w-10"
                        onClick={() => togglePasswordVisibility("current")}
                        tabIndex={-1}
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nueva contraseña */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPasswords.new ? "text" : "password"}
                        placeholder="Mínimo 10 caracteres"
                        disabled={isSubmitting}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-full w-10"
                        onClick={() => togglePasswordVisibility("new")}
                        tabIndex={-1}
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirmar contraseña */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nueva contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPasswords.confirm ? "text" : "password"}
                        placeholder="Repite tu nueva contraseña"
                        disabled={isSubmitting}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-full w-10"
                        onClick={() => togglePasswordVisibility("confirm")}
                        tabIndex={-1}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error general */}
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            )}

            {/* Requisitos de contraseña */}
            <PasswordRequirements password={newPassword} className="bg-muted/30" />

            {/* Botón de envío */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isButtonDisabled}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  "Cambiar contraseña"
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Tienes hasta {MAX_PASSWORD_ATTEMPTS} intentos antes de un bloqueo de {PASSWORD_LOCK_MINUTES} minutos.
            </p>
          </form>
        </Form>
      </div>
    </Card>
  );
}
