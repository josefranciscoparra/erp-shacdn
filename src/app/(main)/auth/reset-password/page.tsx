"use client";

import { useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { passwordSchema } from "@/lib/validations/password";
import { resetPasswordWithToken } from "@/server/actions/auth-tokens";

const resetPasswordFormSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordFormSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPasswordWithToken(token, data.newPassword);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Error al cambiar la contraseña. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Sin token
  if (!token) {
    return (
      <div className="border-border bg-card/95 w-full max-w-md rounded-3xl border shadow-lg backdrop-blur">
        <div className="space-y-6 px-7 py-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="bg-destructive/10 rounded-full p-3">
              <XCircle className="text-destructive h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Enlace inválido</h1>
              <p className="text-muted-foreground text-sm">
                El enlace para restablecer la contraseña no es válido o ha caducado.
              </p>
            </div>
          </div>

          <Button asChild className="w-full">
            <Link href="/auth/forgot-password">Solicitar nuevo enlace</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Éxito
  if (success) {
    return (
      <div className="border-border bg-card/95 w-full max-w-md rounded-3xl border shadow-lg backdrop-blur">
        <div className="space-y-6 px-7 py-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="bg-primary/10 rounded-full p-3">
              <CheckCircle2 className="text-primary h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Contraseña actualizada</h1>
              <p className="text-muted-foreground text-sm">
                Tu contraseña ha sido cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
            </div>
          </div>

          <Button asChild className="w-full">
            <Link href="/auth/login">Iniciar sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-card/95 w-full max-w-md rounded-3xl border shadow-lg backdrop-blur">
      {/* Header */}
      <div className="space-y-1 px-7 pt-8">
        <h1 className="text-3xl leading-tight font-bold">Nueva contraseña</h1>
        <p className="text-muted-foreground text-sm">Introduce tu nueva contraseña para restablecer el acceso</p>
      </div>

      {/* Formulario */}
      <div className="space-y-5 px-7 pt-5 pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nueva contraseña */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        {...field}
                        type={showPasswords.new ? "text" : "password"}
                        placeholder="Mínimo 10 caracteres"
                        disabled={isLoading}
                        className="pr-10 pl-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-full w-10"
                        onClick={() => togglePasswordVisibility("new")}
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
                  <FormLabel>Confirmar contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        {...field}
                        type={showPasswords.confirm ? "text" : "password"}
                        placeholder="Repite tu contraseña"
                        disabled={isLoading}
                        className="pr-10 pl-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-full w-10"
                        onClick={() => togglePasswordVisibility("confirm")}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </Form>

        {/* Requisitos */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="text-foreground mb-2 text-sm font-medium">Requisitos de contraseña</h3>
          <ul className="text-muted-foreground space-y-1 text-xs">
            <li>• Mínimo 10 caracteres</li>
            <li>• Al menos una letra mayúscula (A-Z)</li>
            <li>• Al menos una letra minúscula (a-z)</li>
            <li>• Al menos un número (0-9)</li>
            <li>• Al menos un símbolo (!@#$%^&*)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
