"use client";

import { useEffect, useState } from "react";

import { HelpCircle, Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
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
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const canCreateRequests = balance?.hasActiveContract !== false;
  const hasProvisionalContract = balance?.hasProvisionalContract === true;

  useEffect(() => {
    loadBalance();
    loadRequests();
    loadAbsenceTypes();
  }, []);

  // Filtrar por año
  const filteredByYearRequests =
    selectedYear === "all"
      ? requests
      : requests.filter((r) => {
          const year = new Date(r.startDate).getFullYear();
          return year === parseInt(selectedYear);
        });

  // Calcular contadores para badges
  const allCount = filteredByYearRequests.length;
  const pendingCount = filteredByYearRequests.filter((r) => r.status === "PENDING").length;
  const approvedCount = filteredByYearRequests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = filteredByYearRequests.filter(
    (r) => r.status === "REJECTED" || r.status === "CANCELLED",
  ).length;

  // Obtener años disponibles
  const availableYears = Array.from(new Set(requests.map((r) => new Date(r.startDate).getFullYear()))).sort(
    (a, b) => b - a,
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis ausencias"
        description="Consulta y gestiona tus ausencias fácilmente."
        actionLabel={canCreateRequests ? "Nueva Solicitud" : undefined}
        onAction={() => {
          if (!canCreateRequests) {
            return;
          }
          setNewRequestDialogOpen(true);
        }}
      >
        {!canCreateRequests && (
          <p className="text-muted-foreground text-sm">
            {hasProvisionalContract
              ? "Tu contrato está pendiente de completar. En cuanto RRHH añada los detalles podrás solicitar ausencias."
              : "Aún no tienes un contrato activo. Podrás solicitar ausencias cuando se registre."}
          </p>
        )}
      </SectionHeader>

      {/* Mostrar error si existe */}
      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-destructive text-sm font-medium">Error al cargar datos</p>
          <p className="text-destructive/80 text-sm">{error}</p>
        </Card>
      )}

      {/* Cards de balance */}
      <PtoBalanceCards error={error} />

      {/* Tabs con solicitudes */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
          <div className="flex items-center gap-3">
            {/* Select para móvil */}
            <Select value={selectedTab} onValueChange={setSelectedTab}>
              <SelectTrigger className="w-[200px] @4xl/main:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Tabs para desktop */}
            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="approved">Aprobadas</TabsTrigger>
              <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro de año */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los años</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Link de ayuda */}
            <a
              href="/guia-usuario.html#vacaciones"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              title="Ver guía de ausencias"
            >
              <HelpCircle className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Contenido de tabs */}
        {isLoadingRequests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <TabsContent value="all">
              <PtoRequestsTable status="all" yearFilter={selectedYear} />
            </TabsContent>

            <TabsContent value="pending">
              <PtoRequestsTable status="pending" yearFilter={selectedYear} />
            </TabsContent>

            <TabsContent value="approved">
              <PtoRequestsTable status="approved" yearFilter={selectedYear} />
            </TabsContent>

            <TabsContent value="rejected">
              <PtoRequestsTable status="rejected" yearFilter={selectedYear} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Dialog de nueva solicitud */}
      <NewPtoRequestDialog open={newRequestDialogOpen} onOpenChange={setNewRequestDialogOpen} />
    </div>
  );
}
