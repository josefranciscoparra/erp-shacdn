"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { FileText, RefreshCcw } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { getDataExports, type DataExportCounts, type DataExportListItem } from "@/server/actions/data-exports";

import { createExportColumns } from "./_components/export-columns";

type TabValue = "all" | "in-progress" | "completed" | "failed" | "canceled" | "expired";

const TAB_CONFIG: Array<{ value: TabValue; label: string; countKey: keyof DataExportCounts }> = [
  { value: "all", label: "Todos", countKey: "total" },
  { value: "in-progress", label: "En curso", countKey: "inProgress" },
  { value: "completed", label: "Listos", countKey: "completed" },
  { value: "failed", label: "Fallidos", countKey: "failed" },
  { value: "canceled", label: "Cancelados", countKey: "canceled" },
  { value: "expired", label: "Caducados", countKey: "expired" },
];

function mapTabToStatus(tab: TabValue) {
  switch (tab) {
    case "in-progress":
      return "IN_PROGRESS";
    case "completed":
      return "COMPLETED";
    case "failed":
      return "FAILED";
    case "canceled":
      return "CANCELED";
    case "expired":
      return "EXPIRED";
    case "all":
    default:
      return "ALL";
  }
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [exports, setExports] = useState<DataExportListItem[]>([]);
  const [counts, setCounts] = useState<DataExportCounts>({
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    canceled: 0,
    expired: 0,
    inProgress: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalRows, setTotalRows] = useState(0);

  const pageCount = totalRows > 0 ? Math.ceil(totalRows / pagination.pageSize) : 0;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getDataExports({
      status: mapTabToStatus(activeTab),
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    });
    if (result.success && result.exports) {
      setExports(result.exports);
      setTotalRows(result.total ?? 0);
      if (result.counts) {
        setCounts(result.counts);
      }
    }
    setIsLoading(false);
  }, [activeTab, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (value: TabValue) => {
    setActiveTab(value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const columns = useMemo(() => createExportColumns(loadData), [loadData]);

  const table = useDataTableInstance({
    data: exports,
    columns,
    manualPagination: true,
    pageCount,
    paginationState: pagination,
    onPaginationChange: setPagination,
  });

  return (
    <PermissionGuard
      permissions={["view_reports", "export_time_tracking", "manage_time_tracking"]}
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Informes y KPIs" description="Exportaciones y análisis de datos." />
          <EmptyState
            icon={<FileText className="text-muted-foreground/60 mx-auto h-10 w-10" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección."
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Informes y KPIs"
          description="Exportaciones generadas en segundo plano para análisis y descarga."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={loadData} disabled={isLoading}>
                {isLoading ? <Spinner size="sm" className="mr-2" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Actualizar
              </Button>
              <Button asChild>
                <Link href="/dashboard/reports/new">Nuevo informe</Link>
              </Button>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabValue)} className="w-full">
          <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
            <Select value={activeTab} onValueChange={(value) => handleTabChange(value as TabValue)}>
              <SelectTrigger className="w-fit @4xl/main:hidden" size="sm">
                <SelectValue placeholder="Selecciona vista" />
              </SelectTrigger>
              <SelectContent>
                {TAB_CONFIG.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label} ({counts[tab.countKey]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TabsList className="hidden @4xl/main:flex">
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label} <Badge variant="secondary">{counts[tab.countKey]}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <DataTableViewOptions table={table} />
            </div>
          </div>

          <TabsContent value={activeTab} className="flex flex-col gap-4">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-[200px]" />
                  <Skeleton className="h-8 w-[100px]" />
                </div>
                <div className="rounded-lg border">
                  <div className="border-b p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4 border-b p-4 last:border-0">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              </div>
            ) : exports.length === 0 ? (
              <EmptyState
                icon={<FileText className="text-muted-foreground/60 mx-auto h-10 w-10" />}
                title="No hay exportaciones"
                description="Genera tu primer informe desde este panel."
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border">
                  <DataTable table={table} columns={columns} />
                </div>
                <DataTablePagination table={table} rowCount={totalRows} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
