"use client";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface EmployeeTimeTracking {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  department: string;
  costCenter: string;
  status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
  lastAction: Date | null;
  todayWorkedMinutes: number;
  todayBreakMinutes: number;
  clockIn?: Date;
  clockOut?: Date;
  // Nuevos campos para validación de días laborables
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  expectedHours: number;
  expectedEntryTime: string | null;
  isAbsent: boolean;
}

const statusConfig = {
  CLOCKED_IN: {
    label: "Trabajando",
    variant: "default" as const,
    color: "bg-green-500",
  },
  ON_BREAK: {
    label: "En pausa",
    variant: "secondary" as const,
    color: "bg-yellow-500",
  },
  CLOCKED_OUT: {
    label: "Sin fichar",
    variant: "outline" as const,
    color: "bg-gray-400",
  },
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}

export const employeeColumns: ColumnDef<EmployeeTimeTracking>[] = [
  {
    accessorKey: "name",
    header: "Empleado",
    cell: ({ row }) => {
      const name = row.getValue("name");
      const email = row.original.email;

      return (
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-muted-foreground text-xs">{email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "department",
    header: "Departamento",
    cell: ({ row }) => {
      const department = row.getValue("department");
      return <span className={department ? "" : "text-muted-foreground"}>{department ?? "Sin departamento"}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status");
      const config = statusConfig[status];

      return (
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${config.color}`} />
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "todayWorkedMinutes",
    header: "Hoy",
    cell: ({ row }) => {
      const minutes = row.getValue("todayWorkedMinutes");
      if (minutes === 0) {
        return <span className="text-muted-foreground">--</span>;
      }
      return (
        <div className="flex items-center gap-1.5">
          <Clock className="text-muted-foreground size-3.5" />
          <span>{formatMinutes(minutes)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "lastAction",
    header: "Última Actividad",
    cell: ({ row }) => {
      const lastAction = row.getValue("lastAction");
      if (!lastAction) {
        return <span className="text-muted-foreground">Sin actividad</span>;
      }
      return format(new Date(lastAction), "HH:mm", { locale: es });
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary" asChild>
            <Link href={`/dashboard/time-tracking/${row.original.id}`} className="flex items-center gap-1.5">
              <span>Ver fichajes</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      );
    },
  },
];
