"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, AlertTriangle, Eye, Info, MoreHorizontal } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Tipo de incidencia individual
export type Incident = {
  type: string;
  severity: string;
  time: string; // ISO timestamp del fichaje
  deviationMinutes?: number;
  description: string;
};

// Tipo de alerta con toda la información necesaria
// Las fechas vienen como strings desde el servidor (serializadas en ISO)
export type AlertRow = {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string | null;
  date: string; // ISO string
  deviationMinutes: number | null;
  status: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  resolvedAt: string | null; // ISO string o null
  resolutionComment: string | null;
  incidents: Incident[] | null; // Array de incidencias detalladas
  teamId: string | null; // ID del equipo (para filtrado)
  employeeId: string; // ID del empleado para navegar a sus fichajes
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  };
  costCenter: {
    name: string;
    id?: string;
  } | null;
  team: {
    name: string;
    code: string | null;
    id?: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  resolver?: {
    name: string;
  } | null;
};

// Configuración de severidad
const severityConfig = {
  INFO: {
    icon: Info,
    variant: "default" as const,
    color: "text-blue-600 dark:text-blue-400",
    label: "Info",
  },
  WARNING: {
    icon: AlertTriangle,
    variant: "warning" as const,
    color: "text-yellow-600 dark:text-yellow-400",
    label: "Aviso",
  },
  CRITICAL: {
    icon: AlertCircle,
    variant: "destructive" as const,
    color: "text-red-600 dark:text-red-400",
    label: "Crítico",
  },
};

// Configuración de tipos de alerta
const alertTypeLabels: Record<string, string> = {
  DAILY_SUMMARY: "Resumen diario",
  LATE_ARRIVAL: "Llega tarde",
  CRITICAL_LATE_ARRIVAL: "Llega tarde (crítico)",
  EARLY_DEPARTURE: "Se va antes",
  CRITICAL_EARLY_DEPARTURE: "Se va antes (crítico)",
  MISSING_CLOCK_IN: "Falta fichaje de entrada",
  MISSING_CLOCK_OUT: "Falta fichaje de salida",
  EXCESSIVE_HOURS: "Horas excesivas",
  NON_WORKDAY_CLOCK_IN: "Fichaje en día no laboral",
};

export const alertColumns: ColumnDef<AlertRow>[] = [
  {
    accessorKey: "severity",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sev." />,
    cell: ({ row }) => {
      const severity = row.original.severity as keyof typeof severityConfig;
      const config = severityConfig[severity];
      const Icon = config.icon;

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{config.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
    enableHiding: false,
    size: 50,
  },
  {
    accessorKey: "employee",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado / Centro" />,
    cell: ({ row }) => {
      const employee = row.original.employee;
      const costCenter = row.original.costCenter;
      const team = row.original.team;

      return (
        <div className="flex min-w-[160px] flex-col">
          <span className="truncate font-medium">
            {employee.firstName} {employee.lastName}
          </span>
          <div className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            <span>{costCenter ? costCenter.name : "Sin centro"}</span>
            {team && (
              <>
                <span>•</span>
                <span title={team.name}>{team.name}</span>
              </>
            )}
          </div>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
    cell: ({ row }) => {
      const type = row.original.type;
      const label = alertTypeLabels[type] ?? type;
      return (
        <span className="max-w-[160px] truncate text-sm" title={label}>
          {label}
        </span>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Resumen" />,
    cell: ({ row }) => {
      const incidents = row.original.incidents;
      const type = row.original.type;
      const description = row.original.description;

      // Contenido para el tooltip
      const tooltipContent = (
        <div className="space-y-1">
          <p className="font-semibold">{row.original.title}</p>
          {description && <p className="text-sm">{description}</p>}
        </div>
      );

      // Si es DAILY_SUMMARY y tiene incidencias, mostrar resumen compacto
      if (type === "DAILY_SUMMARY" && incidents && incidents.length > 0) {
        // Contar tipos de incidencias
        const counts = incidents.reduce(
          (acc, curr) => {
            if (curr.type.includes("LATE")) acc.late++;
            else if (curr.type.includes("EARLY")) acc.early++;
            else acc.other++;
            return acc;
          },
          { late: 0, early: 0, other: 0 },
        );
        const summaryParts: string[] = [];
        if (counts.late > 0) summaryParts.push(`Llegadas tarde: ${counts.late}`);
        if (counts.early > 0) summaryParts.push(`Salidas antes: ${counts.early}`);
        if (counts.other > 0) summaryParts.push(`Otras: ${counts.other}`);
        const summaryText = summaryParts.join(" · ");

        return (
          <div className="flex max-w-[260px] flex-col gap-1">
            <span className="truncate text-sm font-medium">{row.original.title}</span>
            {summaryText && <span className="text-muted-foreground truncate text-xs">{summaryText}</span>}
          </div>
        );
      }

      // Alertas normales (no DAILY_SUMMARY)
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex max-w-[260px] cursor-help flex-col">
                <span className="truncate text-sm font-medium">{row.original.title}</span>
                {description && <span className="text-muted-foreground truncate text-xs">{description}</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{tooltipContent}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "deviationMinutes",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Desvío" />,
    cell: ({ row }) => {
      const deviation = row.original.deviationMinutes;
      if (deviation === null) return <span className="text-muted-foreground text-xs">-</span>;

      const hours = Math.floor(Math.abs(deviation) / 60);
      const minutes = Math.abs(deviation) % 60;

      return (
        <span className="font-mono text-sm">
          {hours > 0 ? `${hours}h ` : ""}
          {minutes}m
        </span>
      );
    },
    enableSorting: true,
    enableHiding: true,
    size: 80,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      return (
        <span className="text-sm whitespace-nowrap">
          {format(new Date(row.original.date), "d MMM", { locale: es })}
        </span>
      );
    },
    enableSorting: true,
    enableHiding: true,
    size: 100,
  },
  {
    id: "timeline",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ciclo" />,
    cell: ({ row }) => {
      const createdAt = new Date(row.original.createdAt);
      const resolvedAt = row.original.resolvedAt ? new Date(row.original.resolvedAt) : null;
      const status = row.original.status;
      const ageLabel = formatDistanceToNow(resolvedAt ?? createdAt, { addSuffix: true, locale: es });
      const resolver = row.original.resolver?.name;
      const olderThanDay = status === "ACTIVE" && Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000;

      return (
        <div className="flex flex-col text-xs">
          <span className="font-medium">{status === "ACTIVE" ? `Abierta ${ageLabel}` : `Cerrada ${ageLabel}`}</span>
          {resolver && status !== "ACTIVE" && <span className="text-muted-foreground">Por {resolver}</span>}
          {olderThanDay && (
            <Badge variant="outline" className="text-muted-foreground mt-1 w-fit px-2 text-[10px]">
              +24h abierta
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: true,
    size: 140,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row, table }) => {
      const status = row.original.status;
      const allowResolution = (table.options.meta as any)?.allowResolution !== false;
      const label =
        status === "ACTIVE"
          ? allowResolution
            ? "Activa"
            : "Registrada"
          : status === "RESOLVED"
            ? "Resuelta"
            : "Descartada";
      const tone = status === "ACTIVE" && allowResolution ? "text-foreground" : "text-muted-foreground";

      return <span className={`text-xs font-medium ${tone}`}>{label}</span>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
    enableHiding: true,
    size: 90,
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const alert = row.original;
      const { onResolve, onDismiss, onViewDetails, allowResolution } = (table.options.meta as any) ?? {};
      const canResolve = allowResolution ?? true;

      return (
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewDetails?.(alert)}>
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Ver detalles</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalles</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {alert.status === "ACTIVE" && canResolve && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onResolve?.(alert)}>Resolver</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDismiss?.(alert)}>Descartar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      );
    },
    size: 50,
  },
];
