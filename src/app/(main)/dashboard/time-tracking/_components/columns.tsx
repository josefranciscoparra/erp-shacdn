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

const statusLabels = {
  IN_PROGRESS: "En curso",
  COMPLETED: "Completado",
  INCOMPLETE: "Incompleto",
  ABSENT: "Ausente",
};

const statusVariants = {
  IN_PROGRESS: "default" as const,
  COMPLETED: "secondary" as const,
  INCOMPLETE: "destructive" as const,
  ABSENT: "outline" as const,
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
      return (
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground" />
          <span>{formatMinutes(minutes)}</span>
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
      const status = row.getValue("status") as keyof typeof statusLabels;
      return (
        <Badge variant={statusVariants[status]}>
          {statusLabels[status]}
        </Badge>
      );
    },
  },
];
