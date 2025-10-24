"use client";

import { startOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";

type PeriodOption = "today" | "7days" | "30days" | "thisMonth" | "lastMonth" | "custom";

interface QuickPeriodFilterProps {
  selectedPeriod: PeriodOption;
  onPeriodChange: (period: PeriodOption, dateRange?: DateRange) => void;
}

export function QuickPeriodFilter({ selectedPeriod, onPeriodChange }: QuickPeriodFilterProps) {
  const handlePeriodClick = (period: PeriodOption) => {
    const today = new Date();
    let dateRange: DateRange | undefined;

    switch (period) {
      case "today":
        dateRange = {
          from: startOfDay(today),
          to: startOfDay(today),
        };
        break;
      case "7days":
        dateRange = {
          from: startOfDay(subDays(today, 6)),
          to: startOfDay(today),
        };
        break;
      case "30days":
        dateRange = {
          from: startOfDay(subDays(today, 29)),
          to: startOfDay(today),
        };
        break;
      case "thisMonth":
        dateRange = {
          from: startOfMonth(today),
          to: endOfMonth(today),
        };
        break;
      case "lastMonth": {
        const lastMonth = subMonths(today, 1);
        dateRange = {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
        break;
      }
      case "custom":
        // Para custom, no enviamos dateRange, el componente padre debe mostrar el DateRangePicker
        break;
    }

    onPeriodChange(period, dateRange);
  };

  const periods: { value: PeriodOption; label: string }[] = [
    { value: "today", label: "Hoy" },
    { value: "7days", label: "7 días" },
    { value: "30days", label: "30 días" },
    { value: "thisMonth", label: "Este mes" },
    { value: "lastMonth", label: "Mes pasado" },
    { value: "custom", label: "Personalizado" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={selectedPeriod === period.value ? "default" : "outline"}
          size="sm"
          onClick={() => handlePeriodClick(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
