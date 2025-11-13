"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-semibold capitalize">{format(month, "MMMM yyyy", { locale: es })}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "actualHours",
    header: "Horas trabajadas",
    cell: ({ row }) => {
      const actual = row.getValue("actualHours");
      const expected = row.original.expectedHours;
      const compliance = row.original.compliance;

      // Color de la barra según cumplimiento
      let progressColor = "bg-green-500";
      if (compliance < 95) progressColor = "bg-amber-500";
      if (compliance < 70) progressColor = "bg-red-500";

      return (
        <div className="flex min-w-[180px] flex-col gap-1.5 py-1">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">{actual}h</span>
            <span className="text-muted-foreground text-xs">de {expected}h</span>
          </div>
          <div className="relative">
            <Progress
              value={Math.min(compliance, 100)}
              className="border-border/50 h-1.5 border"
              indicatorClassName={progressColor}
            />
          </div>
          <span className="text-muted-foreground text-right text-xs">{compliance}%</span>
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
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold">
              {worked}/{expected}
            </span>
            <span className="text-muted-foreground text-xs">días</span>
          </div>
          {(completed > 0 || incomplete > 0) && (
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              ({completed > 0 && <span className="text-green-600">{completed} ✓</span>}
              {incomplete > 0 && (
                <>
                  {completed > 0 && <span>,</span>}
                  <span className="text-amber-600">{incomplete} ⚠</span>
                </>
              )}
              )
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "totalBreakMinutes",
    header: () => <div className="text-right">Pausas</div>,
    cell: ({ row }) => {
      const minutes = row.getValue("totalBreakMinutes");
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return (
        <div className="text-muted-foreground py-1 text-right text-sm">
          {hours > 0 ? `${hours}h ` : ""}
          {mins}m
        </div>
      );
    },
  },
  {
    accessorKey: "averageWeekly",
    header: "Promedio semanal",
    cell: ({ row }) => {
      const average = row.getValue("averageWeekly");
      const expectedWeekly = row.original.expectedHours / 4.33; // Promedio semanas por mes

      const Icon = average > expectedWeekly ? TrendingUp : average < expectedWeekly ? TrendingDown : Minus;
      const color =
        average >= expectedWeekly
          ? "text-green-600 dark:text-green-500"
          : average >= expectedWeekly * 0.75
            ? "text-amber-600 dark:text-amber-500"
            : "text-red-600 dark:text-red-500";

      return (
        <div className="flex flex-col items-start gap-0.5 py-1">
          <div className="flex items-center gap-1.5">
            <Icon className={`size-3.5 ${color}`} />
            <span className="font-semibold">{average}h</span>
          </div>
          <span className="text-muted-foreground text-xs">promedio semanal</span>
        </div>
      );
    },
  },
];
