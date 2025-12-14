"use client";

import { useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/server/actions/auth-tokens";

const forgotPasswordSchema = z.object({
  email: z.string().email("Por favor, introduce un email válido"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);

    try {
      await requestPasswordReset(data.email);
      // Siempre mostramos éxito (no filtramos si el email existe)
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="border-border bg-card/95 w-full max-w-md rounded-3xl border shadow-lg backdrop-blur">
        <div className="space-y-6 px-7 py-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="bg-primary/10 rounded-full p-3">
              <CheckCircle2 className="text-primary h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Revisa tu correo</h1>
              <p className="text-muted-foreground text-sm">
                Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/login">Volver al inicio de sesión</Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSubmitted(false);
                form.reset();
              }}
            >
              Enviar a otro correo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-card/95 w-full max-w-md rounded-3xl border shadow-lg backdrop-blur">
      {/* Header */}
      <div className="space-y-1 px-7 pt-8">
        <h1 className="text-3xl leading-tight font-bold">¿Olvidaste tu contraseña?</h1>
        <p className="text-muted-foreground text-sm">
          Introduce tu email y te enviaremos instrucciones para restablecerla
        </p>
      </div>

      {/* Formulario */}
      <div className="space-y-5 px-7 pt-5 pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="tu@ejemplo.com"
                        autoComplete="email"
                        disabled={isLoading}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar instrucciones"}
            </Button>
          </form>
        </Form>

        <div className="pt-2">
          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
