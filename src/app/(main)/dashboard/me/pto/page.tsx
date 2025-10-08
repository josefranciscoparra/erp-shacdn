"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/hr/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { usePtoStore } from "@/stores/pto-store";
import { PtoBalanceCards } from "./_components/pto-balance-cards";
import { PtoRequestsTable } from "./_components/pto-requests-table";
import { NewPtoRequestDialog } from "./_components/new-pto-request-dialog";
import { Loader2 } from "lucide-react";

export default function PtoPage() {
  const {
    balance,
    requests,
    error,
    loadBalance,
    loadRequests,
    loadAbsenceTypes,
    isLoadingRequests,
  } = usePtoStore();
  const [newRequestDialogOpen, setNewRequestDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("active");

  const canCreateRequests = balance?.hasActiveContract !== false;
  const hasProvisionalContract = balance?.hasProvisionalContract === true;

  useEffect(() => {
    loadBalance();
    loadRequests();
    loadAbsenceTypes();
  }, []);

  // Calcular contadores para badges
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activeCount = requests.filter(
    (r) => r.status === "APPROVED" && new Date(r.startDate) >= now
  ).length;

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  const allCount = requests.length;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis Vacaciones"
        actionLabel={canCreateRequests ? "Nueva Solicitud" : undefined}
        onAction={() => {
          if (!canCreateRequests) {
            return;
          }
          setNewRequestDialogOpen(true);
        }}
      >
        {!canCreateRequests && (
          <p className="text-sm text-muted-foreground">
            {hasProvisionalContract
              ? "Tu contrato está pendiente de completar. En cuanto RRHH añada los detalles podrás solicitar vacaciones."
              : "Aún no tienes un contrato activo. Podrás solicitar vacaciones cuando se registre."}
          </p>
        )}
      </SectionHeader>

      {/* Mostrar error si existe */}
      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Error al cargar datos</p>
          <p className="text-sm text-destructive/80">{error}</p>
        </Card>
      )}

      {/* Cards de balance */}
      <PtoBalanceCards error={error} />

      {/* Tabs con solicitudes */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex items-center justify-between">
          {/* Select para móvil */}
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger className="w-[200px] @4xl/main:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                Activas {activeCount > 0 && `(${activeCount})`}
              </SelectItem>
              <SelectItem value="pending">
                Pendientes {pendingCount > 0 && `(${pendingCount})`}
              </SelectItem>
              <SelectItem value="all">
                Todas {allCount > 0 && `(${allCount})`}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Tabs para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="active">
              Activas
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pendientes
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">
              Todas
              {allCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {allCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Contenido de tabs */}
        {isLoadingRequests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="active">
              <PtoRequestsTable status="active" />
            </TabsContent>

            <TabsContent value="pending">
              <PtoRequestsTable status="pending" />
            </TabsContent>

            <TabsContent value="all">
              <PtoRequestsTable status="all" />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Dialog de nueva solicitud */}
      <NewPtoRequestDialog
        open={newRequestDialogOpen}
        onOpenChange={setNewRequestDialogOpen}
      />
    </div>
  );
}
