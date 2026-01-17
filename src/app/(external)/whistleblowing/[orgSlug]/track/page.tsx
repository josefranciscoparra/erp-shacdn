"use client";

import { useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ArrowLeft, CheckCircle2, Clock, FileSearch, Loader2, Search, Shield, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkAnonymousReportStatus } from "@/server/actions/whistleblowing";

type ReportStatus = "SUBMITTED" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

const statusConfig: Record<ReportStatus, { label: string; icon: typeof Clock; color: string; bgColor: string }> = {
  SUBMITTED: {
    label: "Recibida - Pendiente de revisión",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900",
  },
  IN_REVIEW: {
    label: "En investigación",
    icon: FileSearch,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900",
  },
  RESOLVED: {
    label: "Resuelta",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900",
  },
  CLOSED: {
    label: "Cerrada",
    icon: XCircle,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900",
  },
};

export default function TrackReportPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [trackingCode, setTrackingCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{ status: ReportStatus; statusLabel: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingCode.trim() || !accessCode.trim()) return;

    setIsChecking(true);
    setError(null);
    setResult(null);

    try {
      const response = await checkAnonymousReportStatus(
        trackingCode.trim().toUpperCase(),
        accessCode.trim().toUpperCase(),
      );

      if (response.success && response.status) {
        setResult({
          status: response.status,
          statusLabel: response.statusLabel ?? statusConfig[response.status].label,
        });
      } else {
        setError(response.error ?? "No se pudo verificar el estado");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsChecking(false);
    }
  }

  function resetForm() {
    setTrackingCode("");
    setAccessCode("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={`/whistleblowing/${orgSlug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al portal
          </Link>
        </Button>

        <div className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Search className="text-primary h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Consultar estado de denuncia</h1>
          <p className="text-muted-foreground text-sm">Introduce tus códigos para ver el estado actual</p>
        </div>

        {result ? (
          <Card>
            <CardHeader className="text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${statusConfig[result.status].bgColor}`}
              >
                {(() => {
                  const Icon = statusConfig[result.status].icon;
                  return <Icon className={`h-8 w-8 ${statusConfig[result.status].color}`} />;
                })()}
              </div>
              <CardTitle>Estado de tu denuncia</CardTitle>
              <CardDescription>Código: {trackingCode.toUpperCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className={`text-lg font-semibold ${statusConfig[result.status].color}`}>{result.statusLabel}</p>
              </div>

              <div className="space-y-2 text-center">
                {result.status === "SUBMITTED" && (
                  <p className="text-muted-foreground text-sm">
                    Tu denuncia ha sido recibida y está pendiente de asignación a un gestor.
                  </p>
                )}
                {result.status === "IN_REVIEW" && (
                  <p className="text-muted-foreground text-sm">
                    Un gestor está investigando los hechos descritos en tu denuncia.
                  </p>
                )}
                {result.status === "RESOLVED" && (
                  <p className="text-muted-foreground text-sm">
                    La investigación ha concluido y se ha tomado una resolución.
                  </p>
                )}
                {result.status === "CLOSED" && (
                  <p className="text-muted-foreground text-sm">El expediente de esta denuncia ha sido cerrado.</p>
                )}
              </div>

              <Button variant="outline" className="w-full" onClick={resetForm}>
                Consultar otra denuncia
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Verificar estado</CardTitle>
              <CardDescription>Introduce los códigos que recibiste al enviar tu denuncia.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trackingCode">Código de seguimiento</Label>
                  <Input
                    id="trackingCode"
                    placeholder="WB-XXXXXXXX-XXXXX"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="font-mono uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessCode">Código de acceso</Label>
                  <Input
                    id="accessCode"
                    placeholder="XXXXXXXX"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="font-mono uppercase"
                  />
                </div>

                {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950">{error}</div>}

                <Button type="submit" className="w-full" disabled={isChecking || !trackingCode || !accessCode}>
                  {isChecking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Consultar estado
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Nota de privacidad */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-muted-foreground text-xs">
                Por motivos de confidencialidad, solo se muestra el estado general de la denuncia. La identidad del
                denunciante y los detalles de la investigación están protegidos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
