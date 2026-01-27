"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Download, MoreHorizontal, XCircle } from "lucide-react";
import { toast } from "sonner";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cancelDataExport, getDataExportDownloadUrl, type DataExportListItem } from "@/server/actions/data-exports";

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  PENDING: { label: "En cola", variant: "outline" },
  RUNNING: { label: "En proceso", variant: "default" },
  COMPLETED: { label: "Listo", variant: "secondary" },
  FAILED: { label: "Fallido", variant: "destructive" },
  CANCELED: { label: "Cancelado", variant: "outline" },
  EXPIRED: { label: "Caducado", variant: "outline" },
};

const TYPE_LABELS: Record<string, string> = {
  TIME_TRACKING_MONTHLY: "Fichajes mensuales",
};

const MONTHS = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatFilters(filters: Record<string, unknown>) {
  const monthValue = Number(filters.month ?? 0);
  const yearValue = Number(filters.year ?? 0);
  const monthLabel = Number.isFinite(monthValue) ? MONTHS[monthValue] : "";
  const yearLabel = Number.isFinite(yearValue) ? String(yearValue) : "";
  const scopeLabel = filters.scope === "DEPARTMENT" ? "Departamento" : "Empresa";
  const departmentName = typeof filters.departmentName === "string" ? filters.departmentName : "";

  const parts = [monthLabel, yearLabel].filter(Boolean);
  const scope = departmentName ? `${scopeLabel}: ${departmentName}` : scopeLabel;
  return `${parts.join(" ")} · ${scope}`;
}

async function handleDownload(exportId: string) {
  const result = await getDataExportDownloadUrl(exportId);
  if (!result.success || !result.url) {
    toast.error(result.error ?? "No se pudo descargar");
    return;
  }
  window.open(result.url, "_blank", "noopener,noreferrer");
}

async function handleCancel(exportId: string, onRefresh: () => void) {
  const result = await cancelDataExport(exportId);
  if (!result.success) {
    toast.error(result.error ?? "No se pudo cancelar");
    return;
  }
  toast.success("Exportación cancelada");
  onRefresh();
}

export function createExportColumns(onRefresh: () => void): ColumnDef<DataExportListItem>[] {
  return [
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => <span className="font-medium">{TYPE_LABELS[row.original.type] ?? row.original.type}</span>,
    },
    {
      accessorKey: "filters",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Detalle" />,
      enableSorting: false,
      cell: ({ row }) => <span className="text-muted-foreground">{formatFilters(row.original.filters)}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = STATUS_LABELS[row.original.status];
        const progress = row.original.progress;
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={status?.variant || "outline"}>{status?.label || row.original.status}</Badge>
            {row.original.status === "RUNNING" ? (
              <span className="text-muted-foreground text-xs">Progreso: {progress}%</span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "requestedBy",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Solicitado por" />,
      enableSorting: false,
      cell: ({ row }) => {
        const name = row.original.requestedBy.name ?? "Usuario";
        const email = row.original.requestedBy.email ?? "";
        return (
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            {email ? <span className="text-muted-foreground text-xs">{email}</span> : null}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Solicitado" />,
      cell: ({ row }) => <span>{new Date(row.original.createdAt).toLocaleDateString("es-ES")}</span>,
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const status = row.original.status;
        const canDownload = status === "COMPLETED";
        const canCancel = status === "PENDING" || status === "RUNNING";

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={!canDownload} onClick={() => handleDownload(row.original.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canCancel} onClick={() => handleCancel(row.original.id, onRefresh)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
