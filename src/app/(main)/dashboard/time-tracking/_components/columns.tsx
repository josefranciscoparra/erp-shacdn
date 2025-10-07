"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Clock, Coffee } from "lucide-react";

export interface TimeTrackingRecord {
  id: string;
  date: Date;
  clockIn?: Date | null;
  clockOut?: Date | null;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
  employee: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
    department?: {
      id: string;
      name: string;
    } | null;
    costCenter?: {
      id: string;
      name: string;
    } | null;
  };
}

const statusConfig = {
  IN_PROGRESS: {
    label: "En curso",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  COMPLETED: {
    label: "Completado",
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  INCOMPLETE: {
    label: "Incompleto",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  },
  ABSENT: {
    label: "Ausente",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}

export const columns: ColumnDef<TimeTrackingRecord>[] = [
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return format(date, "dd/MM/yyyy", { locale: es });
    },
  },
  {
    accessorKey: "employee.user.name",
    header: "Empleado",
    cell: ({ row }) => {
      const name = row.original.employee.user.name;
      const email = row.original.employee.user.email;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{name || "Sin nombre"}</span>
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "employee.department.name",
    header: "Departamento",
    cell: ({ row }) => {
      return row.original.employee.department?.name || "Sin departamento";
    },
  },
  {
    accessorKey: "clockIn",
    header: "Entrada",
    cell: ({ row }) => {
      const clockIn = row.getValue("clockIn");
      if (!clockIn) return <span className="text-muted-foreground">--:--</span>;
      return format(new Date(clockIn as Date), "HH:mm", { locale: es });
    },
  },
  {
    accessorKey: "clockOut",
    header: "Salida",
    cell: ({ row }) => {
      const clockOut = row.getValue("clockOut");
      if (!clockOut) return <span className="text-muted-foreground">--:--</span>;
      return format(new Date(clockOut as Date), "HH:mm", { locale: es });
    },
  },
  {
    accessorKey: "totalWorkedMinutes",
    header: "Tiempo Trabajado",
    cell: ({ row }) => {
      const minutes = row.getValue("totalWorkedMinutes") as number;
      const totalWorkedHours = row.original.totalWorkedHours || 0;

      // Calcular horas esperadas desde el contrato del empleado
      // Si no hay información del contrato, asumir 8h por defecto
      const expectedHours = 8; // TODO: Obtener del contrato cuando esté disponible

      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{formatMinutes(minutes)}</span>
          </div>
          <span className="text-xs text-muted-foreground">/ {expectedHours}h esperadas</span>
        </div>
      );
    },
  },
  {
    accessorKey: "totalBreakMinutes",
    header: "Pausas",
    cell: ({ row }) => {
      const minutes = row.getValue("totalBreakMinutes") as number;
      if (minutes === 0) {
        return <span className="text-muted-foreground">0m</span>;
      }
      return (
        <div className="flex items-center gap-1.5">
          <Coffee className="size-3.5 text-muted-foreground" />
          <span>{formatMinutes(minutes)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof statusConfig;
      const config = statusConfig[status];
      return (
        <Badge className={config.className}>
          {config.label}
        </Badge>
      );
    },
  },
];
