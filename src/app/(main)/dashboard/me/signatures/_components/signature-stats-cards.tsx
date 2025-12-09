"use client";

import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { FileSignature, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignaturesStore } from "@/stores/signatures-store";

export function SignatureStatsCards() {
  const { myPendingSignatures, mySignedSignatures, urgentCount, isLoadingMySignatures } = useSignaturesStore();

  if (isLoadingMySignatures) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="gap-2">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Próxima firma más urgente (la que vence primero)
  const nextPendingSignature = myPendingSignatures
    .filter((s) => s.status === "PENDING")
    .sort((a, b) => new Date(a.request.expiresAt).getTime() - new Date(b.request.expiresAt).getTime())[0];

  const daysUntilExpiry = nextPendingSignature
    ? differenceInDays(new Date(nextPendingSignature.request.expiresAt), new Date())
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Card 1: Estado de firmas */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Estado de firmas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <FileSignature className="size-5" />
            </div>
            <p className="text-muted-foreground text-sm">
              {myPendingSignatures.length > 0 ? (
                <>
                  Tienes{" "}
                  <span className={urgentCount > 0 ? "font-semibold text-red-600" : "font-semibold text-orange-600"}>
                    {myPendingSignatures.length}{" "}
                    {myPendingSignatures.length === 1 ? "documento pendiente" : "documentos pendientes"}
                  </span>
                  {urgentCount > 0 && (
                    <span className="ml-1 text-red-600">
                      ({urgentCount} {urgentCount === 1 ? "urgente" : "urgentes"})
                    </span>
                  )}
                </>
              ) : (
                <>
                  Todos los documentos <span className="font-semibold text-green-600">firmados</span>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Próximo documento por firmar */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {nextPendingSignature ? "Próximo documento" : "Sin documentos pendientes"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextPendingSignature ? (
            <div className="flex items-center gap-2">
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
                {daysUntilExpiry !== null && daysUntilExpiry <= 3 ? (
                  <AlertTriangle className="size-5 text-red-500" />
                ) : (
                  <Clock className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{nextPendingSignature.document.title}</p>
                <p className="text-muted-foreground text-sm">
                  {daysUntilExpiry !== null && daysUntilExpiry <= 0
                    ? "Vence hoy"
                    : daysUntilExpiry === 1
                      ? "Vence mañana"
                      : daysUntilExpiry !== null && daysUntilExpiry <= 3
                        ? `Vence en ${daysUntilExpiry} días`
                        : `Vence ${format(new Date(nextPendingSignature.request.expiresAt), "d 'de' MMMM", { locale: es })}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
                <CheckCircle2 className="size-5 text-green-500" />
              </div>
              <p className="text-muted-foreground text-sm">No tienes documentos pendientes de firma</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Total firmados */}
      <Card>
        <CardHeader>
          <CardDescription>Documentos firmados</CardDescription>
          <div className="flex flex-col gap-2">
            <h4 className="font-display text-2xl lg:text-3xl">{mySignedSignatures.length}</h4>
            <div className="text-muted-foreground text-sm">Total de documentos que has firmado</div>
          </div>
          <CardAction>
            <div className="flex gap-4">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                <CheckCircle2 className="size-5 text-green-500" />
              </div>
            </div>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
