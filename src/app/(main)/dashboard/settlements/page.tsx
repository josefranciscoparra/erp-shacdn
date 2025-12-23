"use client";

import { useEffect, useState, useTransition } from "react";

import { Calculator, Loader2, ShieldAlert, Plus } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOrganizationSettlements, type SettlementListItem } from "@/server/actions/vacation-settlement";

import { NewSettlementDialog } from "./_components/new-settlement-dialog";
import { SettlementsDataTable } from "./_components/settlements-data-table";

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadSettlements = () => {
    startTransition(async () => {
      try {
        setIsLoading(true);
        const data = await getOrganizationSettlements();
        setSettlements(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar liquidaciones");
      } finally {
        setIsLoading(false);
      }
    });
  };

  useEffect(() => {
    loadSettlements();
  }, []);

  const pendingSettlements = settlements.filter((s) => s.status === "PENDING");
  const paidSettlements = settlements.filter((s) => s.status === "PAID");
  const compensatedSettlements = settlements.filter((s) => s.status === "COMPENSATED");

  if (isLoading || isPending) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Liquidaciones" subtitle="Gestiona las liquidaciones de vacaciones" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando liquidaciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Liquidaciones" subtitle="Gestiona las liquidaciones de vacaciones" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar liquidaciones: {error}</span>
        </div>
      </div>
    );
  }

  const hasSettlements = settlements.length > 0;

  return (
    <PermissionGuard
      permission="manage_payroll"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Liquidaciones" subtitle="Gestiona las liquidaciones de vacaciones" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Liquidaciones" subtitle="Gestiona las liquidaciones de vacaciones" />

        {hasSettlements ? (
          <Tabs defaultValue="pending" className="w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
                <TabsTrigger value="pending" className="gap-2">
                  Pendientes
                  {pendingSettlements.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                      {pendingSettlements.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-2">
                  Pagadas
                  {paidSettlements.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                      {paidSettlements.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="compensated" className="gap-2">
                  Compensadas
                  {compensatedSettlements.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                      {compensatedSettlements.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">Todas</TabsTrigger>
              </TabsList>

              <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nueva liquidación
              </Button>
            </div>

            <TabsContent value="pending" className="mt-4">
              {pendingSettlements.length > 0 ? (
                <SettlementsDataTable data={pendingSettlements} onRefresh={loadSettlements} />
              ) : (
                <EmptyState
                  icon={<Calculator className="mx-auto h-12 w-12" />}
                  title="No hay liquidaciones pendientes"
                  description="Todas las liquidaciones han sido procesadas"
                />
              )}
            </TabsContent>

            <TabsContent value="paid" className="mt-4">
              {paidSettlements.length > 0 ? (
                <SettlementsDataTable data={paidSettlements} onRefresh={loadSettlements} />
              ) : (
                <EmptyState
                  icon={<Calculator className="mx-auto h-12 w-12" />}
                  title="No hay liquidaciones pagadas"
                  description="Aún no se han marcado liquidaciones como pagadas"
                />
              )}
            </TabsContent>

            <TabsContent value="compensated" className="mt-4">
              {compensatedSettlements.length > 0 ? (
                <SettlementsDataTable data={compensatedSettlements} onRefresh={loadSettlements} />
              ) : (
                <EmptyState
                  icon={<Calculator className="mx-auto h-12 w-12" />}
                  title="No hay liquidaciones compensadas"
                  description="Aún no se han marcado liquidaciones como compensadas"
                />
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <SettlementsDataTable data={settlements} onRefresh={loadSettlements} />
            </TabsContent>
          </Tabs>
        ) : (
          <EmptyState
            icon={<Calculator className="mx-auto h-12 w-12" />}
            title="No hay liquidaciones registradas"
            description="Las liquidaciones se generan automáticamente al finalizar contratos o puedes crearlas manualmente"
            actionLabel="Crear liquidación"
            onAction={() => setDialogOpen(true)}
          />
        )}

        <NewSettlementDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={loadSettlements} />
      </div>
    </PermissionGuard>
  );
}
