"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface MonthlySummary {
  month: Date;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  actualHours: number;
  expectedHours: number;
  averageDaily: number;
  averageWeekly: number;
  compliance: number;
  daysWorked: number;
  expectedDays: number;
  daysCompleted: number;
  daysIncomplete: number;
  daysAbsent: number;
}

export const monthlyColumns: ColumnDef<MonthlySummary>[] = [
  {
    accessorKey: "month",
    header: "Mes",
    cell: ({ row }) => {
      const month = new Date(row.getValue("month"));
      return (
        <div className="flex flex-col">
          <span className="font-medium capitalize">{format(month, "MMM yyyy", { locale: es })}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "actualHours",
    header: "Horas Trabajadas",
    cell: ({ row }) => {
      const actual = row.getValue("actualHours");
      const expected = row.original.expectedHours;
      const compliance = row.original.compliance;

      // Color de la barra según cumplimiento
      let progressColor = "bg-green-500";
      if (compliance < 95) progressColor = "bg-yellow-500";
      if (compliance < 70) progressColor = "bg-red-500";

      return (
        <div className="flex min-w-[200px] flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{actual}h</span>
            <span className="text-muted-foreground">/ {expected}h</span>
          </div>
          <Progress value={Math.min(compliance, 100)} className="h-2" indicatorClassName={progressColor} />
          <span className="text-muted-foreground text-xs">{compliance}% cumplimiento</span>
        </div>
      );
    },
  },
  {
    accessorKey: "daysWorked",
    header: "Días",
    cell: ({ row }) => {
      const worked = row.getValue("daysWorked");
      const expected = row.original.expectedDays;
      const completed = row.original.daysCompleted;
      const incomplete = row.original.daysIncomplete;

      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {worked}/{expected}
            </span>
            <span className="text-muted-foreground text-xs">días</span>
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
      const minutes = row.getValue("totalBreakMinutes");
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return (
        <span className="text-muted-foreground">
          {hours > 0 ? `${hours}h ` : ""}
          {mins}m
        </span>
      );
    },
  },
  {
    accessorKey: "averageWeekly",
    header: "Promedio Semanal",
    cell: ({ row }) => {
      const average = row.getValue("averageWeekly");
      const expectedWeekly = row.original.expectedHours / 4.33; // Promedio semanas por mes

      const Icon = average > expectedWeekly ? TrendingUp : average < expectedWeekly ? TrendingDown : Minus;
      const color =
        average >= expectedWeekly
          ? "text-green-600"
          : average >= expectedWeekly * 0.75
            ? "text-yellow-600"
            : "text-red-600";

      return (
        <div className="flex items-center gap-2">
          <Icon className={`size-4 ${color}`} />
          <span className="font-medium">{average}h</span>
        </div>
      );
    },
  },
];
