"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignaturesStore } from "@/stores/signatures-store";

import { MySignaturesDataTable } from "./_components/my-signatures-data-table";
import { SignatureStatsCards } from "./_components/signature-stats-cards";

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
  const [activeTab, setActiveTab] = useState("pending");

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

      {/* Cards de estadísticas */}
      <SignatureStatsCards />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          {/* Select para móvil */}
          <Select value={activeTab} onValueChange={setActiveTab}>
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
          <MySignaturesDataTable
            signatures={myPendingSignatures}
            status="pending"
            emptyMessage="No tienes documentos pendientes de firma"
          />
        </TabsContent>

        {/* Firmadas */}
        <TabsContent value="signed" className="space-y-4">
          <MySignaturesDataTable
            signatures={mySignedSignatures}
            status="signed"
            emptyMessage="No has firmado ningún documento aún"
          />
        </TabsContent>

        {/* Rechazadas */}
        <TabsContent value="rejected" className="space-y-4">
          <MySignaturesDataTable
            signatures={myRejectedSignatures}
            status="rejected"
            emptyMessage="No has rechazado ningún documento"
          />
        </TabsContent>

        {/* Expiradas */}
        <TabsContent value="expired" className="space-y-4">
          <MySignaturesDataTable
            signatures={myExpiredSignatures}
            status="expired"
            emptyMessage="No tienes documentos expirados"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
