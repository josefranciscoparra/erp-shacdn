"use client";

import { useMemo, useState, useTransition } from "react";

import { Check, Copy, Info } from "lucide-react";
import { toast } from "sonner";

import { PasswordField } from "@/components/employees/password-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupportImpersonationToken } from "@/server/actions/support-impersonation";

type SupportTokenResult = {
  token: string;
  expiresAt: string;
  sessionMinutes: number;
  targetEmail: string;
};

export function SupportImpersonationTab() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<SupportTokenResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedLink, setCopiedLink] = useState(false);

  const appUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_APP_URL ?? "";
  }, []);

  const supportUrl = useMemo(() => {
    if (!result) {
      return "";
    }

    const baseUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
    return `${baseUrl}/auth/support?token=${result.token}`;
  }, [appUrl, result]);

  const canSubmit = email.trim().length > 0 && reason.trim().length > 0 && !isPending;

  const handleGenerate = () => {
    if (!canSubmit) {
      return;
    }

    startTransition(async () => {
      const response = await createSupportImpersonationToken(email, reason);
      if (!response.success) {
        toast.error(response.error);
        return;
      }

      setResult(response.data);
      setEmail("");
      setReason("");
      setCopiedLink(false);
      toast.success("Token de soporte generado");
    });
  };

  const copyLink = async () => {
    if (!supportUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(supportUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Acceso de soporte por token</AlertTitle>
        <AlertDescription>
          Genera un acceso temporal de uso unico. El token se canjea en 15 minutos y la sesion dura 60 minutos.
        </AlertDescription>
      </Alert>

      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle>Generar token</CardTitle>
          <CardDescription>Solo SUPER_ADMIN puede usar este flujo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-email">Email del usuario</Label>
            <Input
              id="support-email"
              type="email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-reason">Motivo</Label>
            <Textarea
              id="support-reason"
              placeholder="Describe el motivo del acceso..."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Uso unico</Badge>
              <Badge variant="secondary">TTL 15 min</Badge>
              <Badge variant="secondary">Sesion 60 min</Badge>
            </div>
            <Button onClick={handleGenerate} disabled={!canSubmit}>
              {isPending ? "Generando..." : "Generar token"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Token listo para soporte</CardTitle>
            <CardDescription>
              Usuario: <span className="font-medium">{result.targetEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PasswordField password={result.token} label="Token de soporte" canView />
            <div className="space-y-2">
              <Label>Enlace de acceso</Label>
              <div className="flex items-center gap-2">
                <Input value={supportUrl} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink} disabled={copiedLink}>
                  {copiedLink ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="text-muted-foreground text-xs">
              Expira: {new Date(result.expiresAt).toLocaleString("es-ES")}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
