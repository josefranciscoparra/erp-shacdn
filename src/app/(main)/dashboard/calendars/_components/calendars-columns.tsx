"use client";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { Calendar, Building2 } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarData } from "@/stores/calendars-store";

const calendarTypeLabels: Record<string, string> = {
  NATIONAL_HOLIDAY: "Nacional",
  LOCAL_HOLIDAY: "Local",
  CORPORATE_EVENT: "Corporativo",
  CUSTOM: "Personalizado",
};

const calendarTypeVariants: Record<string, "default" | "secondary" | "outline"> = {
  NATIONAL_HOLIDAY: "default",
  LOCAL_HOLIDAY: "secondary",
  CORPORATE_EVENT: "outline",
  CUSTOM: "outline",
};

export const calendarsColumns: ColumnDef<CalendarData>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => {
      const calendar = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: calendar.color }} />
          <Link href={`/dashboard/calendars/${calendar.id}`}>
            <Button variant="link" className="h-auto p-0 font-medium">
              {calendar.name}
            </Button>
          </Link>
        </div>
      );
    },
  },
  {
    accessorKey: "year",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
    cell: ({ row }) => {
      return <span className="font-medium tabular-nums">{row.getValue("year")}</span>;
    },
  },
  {
    accessorKey: "calendarType",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const type = row.getValue("calendarType");
      return <Badge variant={calendarTypeVariants[type] ?? "outline"}>{calendarTypeLabels[type] ?? type}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "costCenter",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Centro" />,
    cell: ({ row }) => {
      const costCenter = row.original.costCenter;
      if (!costCenter) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <Building2 className="text-muted-foreground h-4 w-4" />
          <span className="text-sm">{costCenter.name}</span>
        </div>
      );
    },
  },
  {
    id: "events",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Eventos" />,
    cell: ({ row }) => {
      const count = row.original._count?.events ?? 0;
      return (
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <span className="tabular-nums">{count}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "active",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const active = row.getValue("active");
      return (
        <Badge
          variant={active ? "default" : "secondary"}
          className={active ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}
        >
          {active ? "Activo" : "Inactivo"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
];
