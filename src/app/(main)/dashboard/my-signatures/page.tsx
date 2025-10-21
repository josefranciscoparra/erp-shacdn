"use client";

import { useEffect } from "react";

import { FileSignature, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignaturesStore } from "@/stores/signatures-store";

import { MySignaturesDataTable } from "./_components/my-signatures-data-table";

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

  useEffect(() => {
    fetchMyPendingSignatures();
  }, [fetchMyPendingSignatures]);

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

  const allSignatures = [
    ...myPendingSignatures,
    ...mySignedSignatures,
    ...myRejectedSignatures,
    ...myExpiredSignatures,
  ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mis Firmas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Documentos que requieren tu firma electrónica</p>
        </div>
        {urgentCount > 0 && (
          <Badge variant="destructive" className="gap-1.5">
            <FileSignature className="h-3.5 w-3.5" />
            {urgentCount} urgente{urgentCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

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
              <SelectItem value="all">Todas ({allSignatures.length})</SelectItem>
            </SelectContent>
          </Select>

          {/* TabsList para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="pending" className="gap-2">
              Pendientes
              {myPendingSignatures.length > 0 && (
                <Badge variant="secondary" className="ml-1">
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
            <TabsTrigger value="all" className="gap-2">
              Todas
              {allSignatures.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {allSignatures.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Pendientes */}
        <TabsContent value="pending" className="space-y-4">
          <MySignaturesDataTable data={myPendingSignatures} />
        </TabsContent>

        {/* Firmadas */}
        <TabsContent value="signed" className="space-y-4">
          <MySignaturesDataTable data={mySignedSignatures} />
        </TabsContent>

        {/* Rechazadas */}
        <TabsContent value="rejected" className="space-y-4">
          <MySignaturesDataTable data={myRejectedSignatures} />
        </TabsContent>

        {/* Expiradas */}
        <TabsContent value="expired" className="space-y-4">
          <MySignaturesDataTable data={myExpiredSignatures} />
        </TabsContent>

        {/* Todas */}
        <TabsContent value="all" className="space-y-4">
          <MySignaturesDataTable data={allSignatures} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
