"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

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
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { MoreHorizontal } from "lucide-react";

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
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  };
  costCenter: {
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

// Configuración de estados
const statusLabels: Record<string, string> = {
  ACTIVE: "Activa",
  RESOLVED: "Resuelta",
  DISMISSED: "Descartada",
};

export const alertColumns: ColumnDef<AlertRow>[] = [
  {
    accessorKey: "severity",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Severidad" />,
    cell: ({ row }) => {
      const severity = row.getValue("severity") as keyof typeof severityConfig;
      const config = severityConfig[severity];
      const Icon = config.icon;

      return (
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <Badge variant={config.variant}>{severity}</Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return (
        <Badge variant="outline" className="font-normal">
          {alertTypeLabels[type] || type}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "employee",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
    cell: ({ row }) => {
      const employee = row.original.employee;
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {employee.firstName} {employee.lastName}
          </span>
          <span className="text-muted-foreground text-xs">{employee.email}</span>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "costCenter",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Centro" />,
    cell: ({ row }) => {
      const costCenter = row.original.costCenter;
      return (
        <span className="text-sm">
          {costCenter ? costCenter.name : <span className="text-muted-foreground">Sin centro</span>}
        </span>
      );
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
          <div className="flex max-w-[350px] flex-col gap-1.5">
            <span className="truncate text-sm font-medium" title={row.original.title}>
              {row.original.title}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {counts.late > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 border-orange-200 bg-orange-50 px-1.5 text-[10px] font-normal text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-900/30 dark:text-orange-400"
                >
                  {counts.late} Tarde
                </Badge>
              )}
              {counts.early > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 border-blue-200 bg-blue-50 px-1.5 text-[10px] font-normal text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {counts.early} Salida Temp.
                </Badge>
              )}
              {counts.other > 0 && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                  {counts.other} Otros
                </Badge>
              )}
            </div>
            <span className="text-muted-foreground text-[10px]">Ver detalles completos &rarr;</span>
          </div>
        );
      }

      // Alertas normales (no DAILY_SUMMARY)
      return (
        <div className="flex max-w-[300px] flex-col">
          <span className="truncate font-medium" title={row.original.title}>
            {row.original.title}
          </span>
          {row.original.description && (
            <span className="text-muted-foreground line-clamp-2 text-xs" title={row.original.description}>
              {row.original.description}
            </span>
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "deviationMinutes",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Desviación" />,
    cell: ({ row }) => {
      const deviation = row.original.deviationMinutes;
      if (deviation === null) return <span className="text-muted-foreground">-</span>;

      const hours = Math.floor(Math.abs(deviation) / 60);
      const minutes = Math.abs(deviation) % 60;

      return (
        <span className="font-mono text-sm">
          {hours > 0 ? `${hours}h ` : ""}
          {minutes}min
        </span>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      return <span className="text-sm">{format(new Date(row.original.date), "PPP", { locale: es })}</span>;
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "ACTIVE" ? "default" : status === "RESOLVED" ? "secondary" : "outline";

      return <Badge variant={variant}>{statusLabels[status] || status}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "resolvedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Resuelta" />,
    cell: ({ row }) => {
      const resolvedAt = row.original.resolvedAt;
      if (!resolvedAt) return <span className="text-muted-foreground">-</span>;

      return (
        <div className="flex flex-col">
          <span className="text-sm">{format(new Date(resolvedAt), "PPP", { locale: es })}</span>
          {row.original.resolver && (
            <span className="text-muted-foreground text-xs">por {row.original.resolver.name}</span>
          )}
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const alert = row.original;
      const { onResolve, onDismiss, onViewDetails } = (table.options.meta as any) || {};

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
  },
];
