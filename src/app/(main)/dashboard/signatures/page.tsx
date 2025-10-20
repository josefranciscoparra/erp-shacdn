"use client";

import { useEffect } from "react";

import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignaturesStore } from "@/stores/signatures-store";

import { CreateSignatureDialog } from "./_components/create-signature-dialog";
import { SignaturesDataTable } from "./_components/signatures-data-table";

export default function SignaturesPage() {
  const { allRequests, isLoadingRequests, fetchAllRequests } = useSignaturesStore();

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  // Filtrar por estado
  const pendingRequests = allRequests.filter((r) => r.status === "PENDING");
  const inProgressRequests = allRequests.filter((r) => r.status === "IN_PROGRESS");
  const completedRequests = allRequests.filter((r) => r.status === "COMPLETED");
  const rejectedRequests = allRequests.filter((r) => r.status === "REJECTED");
  const expiredRequests = allRequests.filter((r) => r.status === "EXPIRED");

  if (isLoadingRequests) {
    return (
      <div className="@container/main flex min-h-[400px] items-center justify-center">
        <div className="space-y-2 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestión de Firmas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Administra las solicitudes de firma electrónica</p>
        </div>
        <CreateSignatureDialog onSuccess={() => fetchAllRequests({ refresh: true })} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center justify-between">
          {/* Select para móvil */}
          <Select defaultValue="all">
            <SelectTrigger className="w-[200px] @4xl/main:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas ({allRequests.length})</SelectItem>
              <SelectItem value="pending">Pendientes ({pendingRequests.length})</SelectItem>
              <SelectItem value="in_progress">En Progreso ({inProgressRequests.length})</SelectItem>
              <SelectItem value="completed">Completadas ({completedRequests.length})</SelectItem>
              <SelectItem value="rejected">Rechazadas ({rejectedRequests.length})</SelectItem>
              <SelectItem value="expired">Expiradas ({expiredRequests.length})</SelectItem>
            </SelectContent>
          </Select>

          {/* TabsList para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="all" className="gap-2">
              Todas
              {allRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {allRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              Pendientes
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="gap-2">
              En Progreso
              {inProgressRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {inProgressRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completadas
              {completedRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {completedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              Rechazadas
              {rejectedRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {rejectedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-2">
              Expiradas
              {expiredRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {expiredRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Todas */}
        <TabsContent value="all" className="space-y-4">
          <SignaturesDataTable data={allRequests} />
        </TabsContent>

        {/* Pendientes */}
        <TabsContent value="pending" className="space-y-4">
          <SignaturesDataTable data={pendingRequests} />
        </TabsContent>

        {/* En progreso */}
        <TabsContent value="in_progress" className="space-y-4">
          <SignaturesDataTable data={inProgressRequests} />
        </TabsContent>

        {/* Completadas */}
        <TabsContent value="completed" className="space-y-4">
          <SignaturesDataTable data={completedRequests} />
        </TabsContent>

        {/* Rechazadas */}
        <TabsContent value="rejected" className="space-y-4">
          <SignaturesDataTable data={rejectedRequests} />
        </TabsContent>

        {/* Expiradas */}
        <TabsContent value="expired" className="space-y-4">
          <SignaturesDataTable data={expiredRequests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
