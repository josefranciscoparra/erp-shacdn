"use client";

import { useEffect, useState, useTransition } from "react";

import { Loader2, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUserRole } from "@/server/actions/get-current-user-role";
import { sendTestEmailToAddress } from "@/server/actions/test-email";

export default function EmailTestPage() {
  const [isPending, startTransition] = useTransition();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    getCurrentUserRole().then((role) => {
      setIsSuperAdmin(role === "SUPER_ADMIN");
    });
  }, []);

  const handleSendTest = () => {
    if (!email.trim()) {
      toast.error("Email requerido", {
        description: "Introduce un email de destino",
      });
      return;
    }

    startTransition(async () => {
      const result = await sendTestEmailToAddress(email.trim(), name.trim() || undefined);

      if (result.success) {
        toast.success("Correo de prueba enviado", {
          description: `Enviado a ${email}`,
        });
      } else {
        toast.error("Error enviando correo", {
          description: result.error,
        });
      }
    });
  };

  // Loading state
  if (isSuperAdmin === null) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  // No permission
  if (!isSuperAdmin) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Test de Email" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <ShieldAlert className="text-muted-foreground size-12" />
            <p className="text-muted-foreground">Solo los Super Administradores pueden acceder a esta página</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Test de Email" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            Enviar correo de prueba
          </CardTitle>
          <CardDescription>
            Envía un correo de prueba para verificar que el sistema de emails está configurado correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email destino *</Label>
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre (opcional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nombre del destinatario"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSendTest} disabled={isPending || !email.trim()}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 size-4" />
                Enviar correo de prueba
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración requerida</CardTitle>
          <CardDescription>Asegúrate de tener configuradas estas variables de entorno</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>
              <code className="bg-muted rounded px-1 py-0.5">RESEND_API_KEY</code> - API key de Resend
            </li>
            <li>
              <code className="bg-muted rounded px-1 py-0.5">EMAIL_FROM</code> - Email remitente (ej:
              no-reply@mail.timenow.cloud)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
