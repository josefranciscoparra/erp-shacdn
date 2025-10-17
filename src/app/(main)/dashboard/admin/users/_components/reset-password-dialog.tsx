"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Copy, Loader2, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { type UserRow } from "./users-columns";

interface ResetPasswordDialogProps {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const resetPasswordSchema = z.object({
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof resetPasswordSchema>;

interface PasswordResult {
  temporaryPassword: string;
  expiresAt: string;
}

export function ResetPasswordDialog({ user, open, onOpenChange, onSuccess }: ResetPasswordDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [passwordResult, setPasswordResult] = React.useState<PasswordResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      reason: "",
    },
  });

  // Reset al abrir/cerrar
  React.useEffect(() => {
    if (!open) {
      setPasswordResult(null);
      setError(null);
      setCopied(false);
      form.reset({ reason: "" });
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          userId: user.id,
          reason: values.reason ?? "Contraseña reseteada por administrador",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Error al resetear la contraseña");
        return;
      }

      setPasswordResult({
        temporaryPassword: data.temporaryPassword,
        expiresAt: data.expiresAt,
      });

      // Refrescar lista después de 2 segundos
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch {
      setError("Error de conexión al servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!passwordResult) return;

    try {
      await navigator.clipboard.writeText(passwordResult.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar Contraseña Temporal</DialogTitle>
          <DialogDescription>Resetea la contraseña de {user.name}</DialogDescription>
        </DialogHeader>

        {!passwordResult ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Usuario */}
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Usuario</p>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>
              </div>

              {/* Razón (opcional) */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej: Usuario olvidó su contraseña"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isLoading}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Advertencia */}
              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Importante:</strong> La contraseña temporal será válida por 7 días y el usuario deberá
                  cambiarla en su próximo inicio de sesión.
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generar Contraseña
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            {/* Éxito */}
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Contraseña temporal generada exitosamente
              </AlertDescription>
            </Alert>

            {/* Contraseña */}
            <div className="bg-muted/50 rounded-lg border p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="text-muted-foreground h-4 w-4" />
                  <p className="text-muted-foreground text-xs font-medium">Contraseña Temporal</p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={passwordResult.temporaryPassword}
                    readOnly
                    className="font-mono text-base font-semibold"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={copyToClipboard}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <p className="text-muted-foreground text-xs">
                  Válida hasta:{" "}
                  {format(new Date(passwordResult.expiresAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                </p>
              </div>
            </div>

            {/* Instrucciones */}
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Instrucciones:</strong>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Comparte esta contraseña de forma segura con {user.name}</li>
                  <li>El usuario deberá cambiarla en su próximo inicio de sesión</li>
                  <li>Esta contraseña expirará en 7 días</li>
                  <li>Esta ventana se cerrará automáticamente en unos segundos</li>
                </ul>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Entendido</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
