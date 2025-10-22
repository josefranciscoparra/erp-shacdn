"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePtoStore } from "@/stores/pto-store";

import { NewPtoRequestDialog } from "./_components/new-pto-request-dialog";
import { PtoBalanceCards } from "./_components/pto-balance-cards";
import { PtoRequestsTable } from "./_components/pto-requests-table";

export default function PtoPage() {
  const { balance, requests, error, loadBalance, loadRequests, loadAbsenceTypes, isLoadingRequests } = usePtoStore();
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

  const activeCount = requests.filter((r) => r.status === "APPROVED" && new Date(r.startDate) >= now).length;

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  const allCount = requests.length;

  return (
    <div className="@container/main flex flex-col gap-6 md:gap-8">
      {/* Header con más jerarquía */}
      <div className="space-y-3">
        <SectionHeader
          title="Mis Vacaciones"
          actionLabel={canCreateRequests ? "Nueva Solicitud" : undefined}
          onAction={() => {
            if (!canCreateRequests) {
              return;
            }
            setNewRequestDialogOpen(true);
          }}
        />
        {!canCreateRequests && (
          <Card className="border-primary/20 bg-primary/5 p-4">
            <p className="text-foreground text-sm font-medium">
              {hasProvisionalContract ? "Tu contrato está casi listo" : "Bienvenido a TimeNow"}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {hasProvisionalContract
                ? "Tu contrato está pendiente de completar. En cuanto RRHH añada los detalles podrás solicitar vacaciones."
                : "Aún no tienes un contrato activo. Podrás solicitar vacaciones cuando se registre."}
            </p>
          </Card>
        )}
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-destructive/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <Loader2 className="text-destructive h-4 w-4" />
            </div>
            <div>
              <p className="text-destructive text-sm font-semibold">Error al cargar datos</p>
              <p className="text-destructive/80 mt-1 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Cards de balance con animación de entrada */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PtoBalanceCards error={error} />
      </div>

      {/* Tabs con solicitudes */}
      <div className="space-y-5">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-5">
          <div className="flex items-center justify-between">
            {/* Select para móvil */}
            <Select value={selectedTab} onValueChange={setSelectedTab}>
              <SelectTrigger className="w-[200px] @4xl/main:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activas {activeCount > 0 && `(${activeCount})`}</SelectItem>
                <SelectItem value="pending">Pendientes {pendingCount > 0 && `(${pendingCount})`}</SelectItem>
                <SelectItem value="all">Todas {allCount > 0 && `(${allCount})`}</SelectItem>
              </SelectContent>
            </Select>

            {/* Tabs para desktop con badges mejorados */}
            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="active" className="gap-2">
                Activas
                {activeCount > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                    {activeCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                Pendientes
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                Todas
                {allCount > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                    {allCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Contenido de tabs con transiciones */}
          {isLoadingRequests ? (
            <Card className="flex items-center justify-center p-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="text-primary h-10 w-10 animate-spin" />
                <p className="text-muted-foreground text-sm">Cargando tus solicitudes...</p>
              </div>
            </Card>
          ) : (
            <>
              <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-2 mt-0 duration-300">
                <PtoRequestsTable status="active" />
              </TabsContent>

              <TabsContent value="pending" className="animate-in fade-in slide-in-from-bottom-2 mt-0 duration-300">
                <PtoRequestsTable status="pending" />
              </TabsContent>

              <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-2 mt-0 duration-300">
                <PtoRequestsTable status="all" />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Dialog de nueva solicitud */}
      <NewPtoRequestDialog open={newRequestDialogOpen} onOpenChange={setNewRequestDialogOpen} />
    </div>
  );
}
