"use client";

import { useEffect, useState } from "react";

import { Loader2, Filter } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyApprovals, type PendingApprovalItem } from "@/server/actions/approvals";

import { ApprovalDialog } from "./_components/approval-dialog";
import { ApprovalsKpiCards } from "./_components/approvals-kpi-cards";
import { ApprovalsTable } from "./_components/approvals-table";

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"pending" | "history">("pending");
  const [filterType, setFilterType] = useState("all");

  // Estado para el diálogo de aprobación
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const result = await getMyApprovals(selectedTab);
      if (result.success) {
        setItems(result.items);
      } else {
        setError(result.error ?? "Error al cargar aprobaciones");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [selectedTab]); // Recargar al cambiar de pestaña

  const handleReview = (item: PendingApprovalItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    // Recargar la lista tras aprobar/rechazar
    loadApprovals();
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Bandeja de Aprobaciones"
        description="Revisa y gestiona las solicitudes pendientes de tu equipo."
      />

      {/* Mostrar error si existe */}
      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-destructive text-sm font-medium">Error al cargar datos</p>
          <p className="text-destructive/80 text-sm">{error}</p>
        </Card>
      )}

      {/* KPIs (Solo mostrar en Pendientes para no confundir, o mostrar estadísticas diferentes) */}
      {selectedTab === "pending" && <ApprovalsKpiCards items={items} loading={loading} />}

      {/* Tabs y Filtros */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "pending" | "history")} className="w-full">
        <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
          {/* Selector Tabs (Pendientes / Historial) */}
          <div className="flex items-center gap-3">
            {/* Móvil */}
            <Select value={selectedTab} onValueChange={(v) => setSelectedTab(v as "pending" | "history")}>
              <SelectTrigger className="w-[200px] @4xl/main:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="history">Historial</SelectItem>
              </SelectContent>
            </Select>

            {/* Desktop */}
            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>
          </div>

          {/* Filtro Tipo */}
          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground hidden h-4 w-4 sm:block" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="PTO">Ausencias</SelectItem>
                <SelectItem value="MANUAL_TIME_ENTRY">Fichajes</SelectItem>
                <SelectItem value="EXPENSE">Gastos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contenido Pendientes */}
        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ApprovalsTable items={items} filterType={filterType} onReview={handleReview} />
          )}
        </TabsContent>

        {/* Contenido Historial */}
        <TabsContent value="history" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ApprovalsTable
              items={items}
              filterType={filterType}
              onReview={handleReview} // Reutilizamos la tabla, el diálogo deberá ser "read-only" si status != PENDING
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de Aprobación */}
      <ApprovalDialog item={selectedItem} open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleSuccess} />
    </div>
  );
}
