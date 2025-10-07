"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  expectedHours: number;
  actualHours: number;
  compliance: number;
  daysWorked: number;
  expectedDays: number;
  daysCompleted: number;
  daysIncomplete: number;
  daysAbsent: number;
  averageDaily: number;
  status: "complete" | "incomplete" | "absent";
}

export const weeklyColumns: ColumnDef<WeeklySummary>[] = [
  {
    accessorKey: "weekStart",
    header: "Semana",
    cell: ({ row }) => {
      const start = new Date(row.getValue("weekStart"));
      const end = new Date(row.original.weekEnd);
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {format(start, "d MMM", { locale: es })} - {format(end, "d MMM yyyy", { locale: es })}
          </span>
          <span className="text-xs text-muted-foreground">
            Semana {format(start, "w", { locale: es })}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "actualHours",
    header: "Horas Trabajadas",
    cell: ({ row }) => {
      const actual = row.getValue("actualHours") as number;
      const expected = row.original.expectedHours;
      const compliance = row.original.compliance;

      // Color de la barra según cumplimiento
      let progressColor = "bg-green-500";
      if (compliance < 95) progressColor = "bg-yellow-500";
      if (compliance < 70) progressColor = "bg-red-500";

      return (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{actual}h</span>
            <span className="text-muted-foreground">/ {expected}h</span>
          </div>
          <Progress
            value={Math.min(compliance, 100)}
            className="h-2"
            indicatorClassName={progressColor}
          />
          <span className="text-xs text-muted-foreground">{compliance}% cumplimiento</span>
        </div>
      );
    },
  },
  {
    accessorKey: "daysWorked",
    header: "Días",
    cell: ({ row }) => {
      const worked = row.getValue("daysWorked") as number;
      const expected = row.original.expectedDays;
      const completed = row.original.daysCompleted;
      const incomplete = row.original.daysIncomplete;

      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{worked}/{expected}</span>
            <span className="text-xs text-muted-foreground">días</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="text-green-600">{completed} ✓</span>
            {incomplete > 0 && <span className="text-yellow-600">{incomplete} ⚠</span>}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "totalBreakMinutes",
    header: "Pausas",
    cell: ({ row }) => {
      const minutes = row.getValue("totalBreakMinutes") as number;
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return (
        <span className="text-muted-foreground">
          {hours > 0 ? `${hours}h ` : ''}{mins}m
        </span>
      );
    },
  },
  {
    accessorKey: "averageDaily",
    header: "Promedio Diario",
    cell: ({ row }) => {
      const average = row.getValue("averageDaily") as number;
      const expectedDaily = row.original.expectedHours / row.original.expectedDays;

      const Icon = average > expectedDaily ? TrendingUp : average < expectedDaily ? TrendingDown : Minus;
      const color = average >= expectedDaily ? "text-green-600" : average >= expectedDaily * 0.75 ? "text-yellow-600" : "text-red-600";

      return (
        <div className="flex items-center gap-2">
          <Icon className={`size-4 ${color}`} />
          <span className="font-medium">{average}h</span>
        </div>
      );
    },
  },
];
