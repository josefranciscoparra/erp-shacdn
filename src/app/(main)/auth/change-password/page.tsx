"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Lock, Shield, ArrowRight, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[a-z]/, "Debe contener al menos una minúscula")
      .regex(/[0-9]/, "Debe contener al menos un número")
      .regex(/[^A-Za-z0-9]/, "Debe contener al menos un símbolo"),
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const onSubmit = async (data: ChangePasswordForm) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.user.id,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al cambiar la contraseña");
      }

      // Contraseña cambiada exitosamente, cerrar sesión y redirigir
      await signOut({
        callbackUrl: "/auth/login?message=Contraseña cambiada exitosamente. Inicia sesión nuevamente.",
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
          {/* Header con icono */}
          <div className="flex flex-col items-center space-y-4">
            <div className="from-primary/5 to-card rounded-full bg-gradient-to-t p-4 shadow-xs">
              <Shield className="text-primary h-8 w-8" />
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-foreground text-2xl font-semibold">Cambio de contraseña requerido</h1>
              <p className="text-muted-foreground max-w-sm text-sm">
                Por seguridad, debes cambiar tu contraseña temporal antes de continuar
              </p>
            </div>
          </div>

          {/* Alert de seguridad */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Tu contraseña actual es temporal. Elige una contraseña segura que cumpla con todos los requisitos.
            </AlertDescription>
          </Alert>

          {/* Formulario */}
          <Card className="rounded-lg border shadow-xs">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg">Nueva contraseña</CardTitle>
              <CardDescription className="text-xs">
                Introduce tu contraseña temporal actual y elige una nueva contraseña segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Contraseña actual */}
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Contraseña temporal actual</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPasswords.current ? "text" : "password"}
                              placeholder="Introduce tu contraseña temporal"
                              className="pr-10 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-0 right-0 h-full w-10"
                              onClick={() => togglePasswordVisibility("current")}
                            >
                              {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Nueva contraseña */}
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Nueva contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPasswords.new ? "text" : "password"}
                              placeholder="Mínimo 8 caracteres, mayúsculas, números y símbolos"
                              className="pr-10 text-sm"
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
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Confirmar contraseña */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Confirmar nueva contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPasswords.confirm ? "text" : "password"}
                              placeholder="Repite tu nueva contraseña"
                              className="pr-10 text-sm"
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
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Error message */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Botón de envío */}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Lock className="mr-2 h-4 w-4 animate-pulse" />
                        Cambiando contraseña...
                      </>
                    ) : (
                      <>
                        Cambiar contraseña
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Información de requisitos */}
          <div className="from-primary/5 to-card rounded-lg border bg-gradient-to-t p-4 shadow-xs">
            <h3 className="text-foreground mb-2 text-sm font-medium">Requisitos de contraseña</h3>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Mínimo 8 caracteres</li>
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
