"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { AlertTriangle, Loader2, Plus, Shield } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getWhistleblowingReports,
  getWhistleblowingStats,
  type WhistleblowingReportSummary,
} from "@/server/actions/whistleblowing";

import { WhistleblowingDataTable } from "./_components/whistleblowing-data-table";

export default function WhistleblowingPage() {
  const [reports, setReports] = useState<WhistleblowingReportSummary[]>([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, inReview: 0, resolved: 0, closed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  async function loadData() {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (statusFilter !== "all") filters.status = statusFilter;
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

  const filteredReports = searchTerm
    ? reports.filter(
        (r) =>
          r.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.title.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : reports;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Canal de Denuncias"
        description="Gestiona las denuncias recibidas conforme a la Ley 2/2023"
        icon={<Shield className="h-5 w-5" />}
      />

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 gap-4 @xl/main:grid-cols-4">
        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="to-card bg-gradient-to-t from-yellow-500/5 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card className="to-card bg-gradient-to-t from-blue-500/5 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">En investigación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inReview}</div>
          </CardContent>
        </Card>
        <Card className="to-card bg-gradient-to-t from-green-500/5 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Resueltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 @lg/main:flex-row @lg/main:items-center @lg/main:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Buscar por código o título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="SUBMITTED">Enviadas</SelectItem>
              <SelectItem value="IN_REVIEW">En investigación</SelectItem>
              <SelectItem value="RESOLVED">Resueltas</SelectItem>
              <SelectItem value="CLOSED">Cerradas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="LOW">Baja</SelectItem>
              <SelectItem value="MEDIUM">Media</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
              <SelectItem value="CRITICAL">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Link href="/dashboard/whistleblowing/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva denuncia
          </Button>
        </Link>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12" />}
          title="No hay denuncias"
          description={
            searchTerm || statusFilter !== "all" || priorityFilter !== "all"
              ? "No se encontraron denuncias con los filtros aplicados."
              : "Aún no se han recibido denuncias en el sistema."
          }
        />
      ) : (
        <WhistleblowingDataTable reports={filteredReports} onRefresh={loadData} />
      )}
    </div>
  );
}
