"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

export interface EmployeeTimeTracking {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  department: string;
  status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
  lastAction: Date | null;
  todayWorkedMinutes: number;
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const employeeColumns: ColumnDef<EmployeeTimeTracking>[] = [
  {
    accessorKey: "name",
    header: "Empleado",
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      const email = row.original.email;
      const image = row.original.image;

      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarImage src={image || undefined} alt={name} />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "department",
    header: "Departamento",
    cell: ({ row }) => {
      return row.getValue("department") || "Sin departamento";
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof statusConfig;
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
      const minutes = row.getValue("todayWorkedMinutes") as number;
      if (minutes === 0) {
        return <span className="text-muted-foreground">--</span>;
      }
      return (
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground" />
          <span>{formatMinutes(minutes)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "lastAction",
    header: "Última Actividad",
    cell: ({ row }) => {
      const lastAction = row.getValue("lastAction") as Date | null;
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
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <Link href={`/dashboard/time-tracking/${row.original.id}`}>
              Ver fichajes
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      );
    },
  },
];
