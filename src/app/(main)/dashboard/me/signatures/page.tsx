"use client";

import { useEffect, useRef } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { AlertCircle, Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignaturesStore } from "@/stores/signatures-store";

import { MySignaturesTable } from "./_components/my-signatures-table";

export default function MySignaturesPage() {
  const {
    myPendingSignatures,
    mySignedSignatures,
    myRejectedSignatures,
    myExpiredSignatures,
    urgentCount,
    isLoadingMySignatures,
    fetchMyPendingSignatures,
  } = useSignaturesStore();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasInitializedRef = useRef(false);

  // Detectar navegación a la página o query param "refresh=true"
  useEffect(() => {
    const shouldRefresh = searchParams.get("refresh") === "true";

    if (!hasInitializedRef.current || shouldRefresh) {
      hasInitializedRef.current = true;
      fetchMyPendingSignatures({ refresh: true });
    }
  }, [pathname, searchParams, fetchMyPendingSignatures]);

  if (isLoadingMySignatures) {
    return (
      <div className="@container/main flex min-h-[400px] items-center justify-center">
        <div className="space-y-2 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando mis firmas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader
        title="Mis Firmas"
        description="Gestiona los documentos que requieren tu firma de forma digital."
      />

      {/* Banner de urgencia */}
      {urgentCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Firmas urgentes pendientes</AlertTitle>
          <AlertDescription>
            Tienes {urgentCount} documento{urgentCount !== 1 ? "s" : ""} que vence{urgentCount !== 1 ? "n" : ""} en los
            próximos 3 días.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <div className="flex items-center justify-between">
          {/* Select para móvil */}
          <Select defaultValue="pending">
            <SelectTrigger className="w-[200px] @4xl/main:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendientes ({myPendingSignatures.length})</SelectItem>
              <SelectItem value="signed">Firmadas ({mySignedSignatures.length})</SelectItem>
              <SelectItem value="rejected">Rechazadas ({myRejectedSignatures.length})</SelectItem>
              <SelectItem value="expired">Expiradas ({myExpiredSignatures.length})</SelectItem>
            </SelectContent>
          </Select>

          {/* TabsList para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="pending" className="gap-2">
              Pendientes
              {myPendingSignatures.length > 0 && (
                <Badge variant={urgentCount > 0 ? "destructive" : "secondary"} className="ml-1">
                  {myPendingSignatures.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signed" className="gap-2">
              Firmadas
              {mySignedSignatures.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {mySignedSignatures.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              Rechazadas
              {myRejectedSignatures.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {myRejectedSignatures.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-2">
              Expiradas
              {myExpiredSignatures.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {myExpiredSignatures.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Pendientes */}
        <TabsContent value="pending" className="space-y-4">
          <MySignaturesTable signatures={myPendingSignatures} emptyMessage="No tienes documentos pendientes de firma" />
        </TabsContent>

        {/* Firmadas */}
        <TabsContent value="signed" className="space-y-4">
          <MySignaturesTable signatures={mySignedSignatures} emptyMessage="No has firmado ningún documento aún" />
        </TabsContent>

        {/* Rechazadas */}
        <TabsContent value="rejected" className="space-y-4">
          <MySignaturesTable signatures={myRejectedSignatures} emptyMessage="No has rechazado ningún documento" />
        </TabsContent>

        {/* Expiradas */}
        <TabsContent value="expired" className="space-y-4">
          <MySignaturesTable signatures={myExpiredSignatures} emptyMessage="No tienes documentos expirados" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
