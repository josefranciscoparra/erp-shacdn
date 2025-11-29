"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, AlertTriangle, Info, MoreHorizontal } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  };
  costCenter: {
    name: string;
  } | null;
  team: {
    name: string;
    code: string | null;
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
  },
  WARNING: {
    icon: AlertTriangle,
    variant: "warning" as const,
    color: "text-yellow-600 dark:text-yellow-400",
  },
  CRITICAL: {
    icon: AlertCircle,
    variant: "destructive" as const,
    color: "text-red-600 dark:text-red-400",
  },
};

// Configuración de tipos de alerta
const alertTypeLabels: Record<string, string> = {
  DAILY_SUMMARY: "Resumen del Día",
  LATE_ARRIVAL: "Llegada Tarde",
  CRITICAL_LATE_ARRIVAL: "Llegada Tarde Crítica",
  EARLY_DEPARTURE: "Salida Temprana",
  CRITICAL_EARLY_DEPARTURE: "Salida Temprana Crítica",
  MISSING_CLOCK_IN: "Falta Fichaje Entrada",
  MISSING_CLOCK_OUT: "Falta Fichaje Salida",
  EXCESSIVE_HOURS: "Horas Excesivas",
  NON_WORKDAY_CLOCK_IN: "Fichaje Día No Laboral",
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
              <p>{severity}</p>
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const type = row.original.type;
      const label = alertTypeLabels[type] ?? type;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="max-w-[120px] truncate font-normal">
                {label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Detalles" />,
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

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex max-w-[250px] cursor-help flex-col gap-1.5">
                  <span className="truncate text-sm font-medium">{row.original.title}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {counts.late > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-5 border-orange-200 bg-orange-50 px-1.5 text-[10px] font-normal text-orange-700 dark:border-orange-900 dark:bg-orange-900/30 dark:text-orange-400"
                      >
                        {counts.late} Tarde
                      </Badge>
                    )}
                    {counts.early > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-5 border-blue-200 bg-blue-50 px-1.5 text-[10px] font-normal text-blue-700 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {counts.early} Salida
                      </Badge>
                    )}
                    {counts.other > 0 && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                        {counts.other} Otros
                      </Badge>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {tooltipContent}
                <p className="text-muted-foreground mt-2 border-t pt-1 text-xs">Clic para ver detalles completos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      // Alertas normales (no DAILY_SUMMARY)
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex max-w-[250px] cursor-help flex-col">
                <span className="truncate font-medium">{row.original.title}</span>
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
            <Badge variant="destructive" className="mt-1 w-fit px-2 text-[10px]">
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
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = status === "ACTIVE" ? "default" : status === "RESOLVED" ? "secondary" : "outline";

      // Versión compacta del badge
      const label = status === "ACTIVE" ? "Activa" : status === "RESOLVED" ? "Resuelta" : "Desc.";

      return (
        <Badge variant={variant} className="h-5 px-1.5 text-xs">
          {label}
        </Badge>
      );
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
      const { onResolve, onDismiss, onViewDetails } = (table.options.meta as any) ?? {};

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails?.(alert)}>Ver detalles</DropdownMenuItem>
            {alert.status === "ACTIVE" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onResolve?.(alert)}>Resolver</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDismiss?.(alert)}>Descartar</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 50,
  },
];
