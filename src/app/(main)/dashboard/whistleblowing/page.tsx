"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSearch,
  Filter,
  Layers3,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getWhistleblowingReports,
  getWhistleblowingStats,
  type WhistleblowingReportSummary,
} from "@/server/actions/whistleblowing";

import { WhistleblowingDataTable } from "./_components/whistleblowing-data-table";

export default function WhistleblowingPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Gestión de Denuncias"
        description="Panel de administración para el cumplimiento de la Ley 2/2023"
      />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );
  const [reports, setReports] = useState<WhistleblowingReportSummary[]>([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, inReview: 0, resolved: 0, closed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, [priorityFilter]);

  async function loadData() {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
      // Removed status filter
      if (priorityFilter !== "all") filters.priority = priorityFilter;

      const [reportsResult, statsResult] = await Promise.all([
        getWhistleblowingReports(filters as Parameters<typeof getWhistleblowingReports>[0]),
        getWhistleblowingStats(),
      ]);

      if (reportsResult.success) {
        setReports(reportsResult.reports);
      }
      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;
    const query = searchTerm.toLowerCase().trim();
    return reports.filter(
      (report) => report.trackingCode.toLowerCase().includes(query) || report.title.toLowerCase().includes(query),
    );
  }, [reports, searchTerm]);

  // Estilos de tarjetas "Apple/Factorial"
  const cardHoverEffect =
    "group relative overflow-hidden rounded-xl border bg-card text-card-foreground p-4 transition-all duration-300 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:border-primary/20 hover:bg-accent/5";

  const iconContainerStyle =
    "flex size-12 items-center justify-center rounded-full border transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm";

  return (
    <PermissionGuard permission="manage_organization" fallback={permissionFallback}>
      <div className="mx-auto max-w-7xl space-y-8 py-6">
        <SectionHeader
          title="Gestión de Denuncias"
          description="Panel de administración para el cumplimiento de la Ley 2/2023"
          actionLabel="Registrar incidencia"
          actionHref="/dashboard/whistleblowing/new"
          actionIcon={<Plus className="h-4 w-4" />}
        />

        {/* Tarjetas de estadísticas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total */}
          <div className={cardHoverEffect}>
            <div className="flex items-center gap-4">
              <div
                className={`${iconContainerStyle} border-primary/10 bg-primary/5 text-primary group-hover:bg-primary/10`}
              >
                <Layers3 className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Total</p>
                <p className="text-foreground text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>

          {/* Pendientes */}
          <div className={cardHoverEffect}>
            <div className="flex items-center gap-4">
              <div
                className={`${iconContainerStyle} border-amber-200/50 bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20 dark:border-amber-500/20 dark:text-amber-400`}
              >
                <Clock className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Pendientes</p>
                <p className="text-foreground text-2xl font-bold">{stats.submitted}</p>
              </div>
            </div>
          </div>

          {/* En Investigación */}
          <div className={cardHoverEffect}>
            <div className="flex items-center gap-4">
              <div
                className={`${iconContainerStyle} border-blue-200/50 bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 dark:border-blue-500/20 dark:text-blue-400`}
              >
                <FileSearch className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Investigación</p>
                <p className="text-foreground text-2xl font-bold">{stats.inReview}</p>
              </div>
            </div>
          </div>

          {/* Resueltas */}
          <div className={cardHoverEffect}>
            <div className="flex items-center gap-4">
              <div
                className={`${iconContainerStyle} border-emerald-200/50 bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 dark:border-emerald-500/20 dark:text-emerald-400`}
              >
                <CheckCircle2 className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Resueltas</p>
                <p className="text-foreground text-2xl font-bold">{stats.resolved}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                placeholder="Buscar por código de expediente, título o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-muted bg-background h-10 rounded-lg pl-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="border-muted h-10 w-full rounded-lg md:w-[220px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="LOW">Baja</SelectItem>
                <SelectItem value="MEDIUM">Media</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="CRITICAL">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={<AlertTriangle className="text-muted-foreground/30 h-10 w-10" />}
                  title="No se encontraron resultados"
                  description={
                    searchTerm || priorityFilter !== "all"
                      ? "Intenta ajustar los filtros de búsqueda para encontrar lo que buscas."
                      : "No hay denuncias registradas en el sistema."
                  }
                />
              </div>
            ) : (
              <WhistleblowingDataTable reports={filteredReports} />
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
