"use client";

import * as React from "react";

import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const dateFilterPresets = [
  { name: "Hoy", value: "today" },
  { name: "7 días", value: "last7Days" },
  { name: "30 días", value: "last30Days" },
  { name: "Este mes", value: "thisMonth" },
  { name: "Mes pasado", value: "lastMonth" },
];

interface CalendarDateRangePickerProps {
  className?: string;
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

export function CalendarDateRangePicker({
  className,
  dateRange,
  onDateRangeChange,
  selectedPeriod = "today",
  onPeriodChange,
}: CalendarDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [internalPeriod, setInternalPeriod] = React.useState(selectedPeriod);

  const handleQuickSelect = (from: Date, to: Date, periodValue: string) => {
    const newDateRange = { from, to };
    onDateRangeChange?.(newDateRange);
    setCurrentMonth(from);
    setInternalPeriod(periodValue);
    onPeriodChange?.(periodValue);
  };

  const changeHandle = (type: string) => {
    const today = new Date();

    switch (type) {
      case "today": {
        handleQuickSelect(startOfDay(today), startOfDay(today), type);
        break;
      }
      case "last7Days": {
        const sevenDaysAgo = subDays(today, 6);
        handleQuickSelect(startOfDay(sevenDaysAgo), startOfDay(today), type);
        break;
      }
      case "last30Days": {
        const thirtyDaysAgo = subDays(today, 29);
        handleQuickSelect(startOfDay(thirtyDaysAgo), startOfDay(today), type);
        break;
      }
      case "thisMonth": {
        handleQuickSelect(startOfMonth(today), endOfDay(today), type);
        break;
      }
      case "lastMonth": {
        const lastMonth = subMonths(today, 1);
        handleQuickSelect(startOfMonth(lastMonth), endOfMonth(lastMonth), type);
        break;
      }
      case "custom":
        setInternalPeriod(type);
        onPeriodChange?.(type);
        break;
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd MMM yyyy", { locale: es })} -{" "}
                  {format(dateRange.to, "dd MMM yyyy", { locale: es })}
                </>
              ) : (
                format(dateRange.from, "dd MMM yyyy", { locale: es })
              )
            ) : (
              <span>Seleccionar rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="start">
          <div className="flex flex-col lg:flex-row">
            <div className="me-0 lg:me-4">
              <ToggleGroup type="single" value={internalPeriod} className="hidden w-32 flex-col lg:flex">
                {dateFilterPresets.map((item) => (
                  <ToggleGroupItem
                    key={item.value}
                    className="text-muted-foreground w-full justify-start"
                    value={item.value}
                    onClick={() => changeHandle(item.value)}
                    asChild
                  >
                    <Button variant="ghost" className="justify-start rounded-md">
                      {item.name}
                    </Button>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Select value={internalPeriod} onValueChange={(value) => changeHandle(value)}>
                <SelectTrigger className="mb-4 flex w-full lg:hidden" size="sm" aria-label="Select a value">
                  <SelectValue placeholder="Hoy" />
                </SelectTrigger>
                <SelectContent>
                  {dateFilterPresets.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Calendar
              className="border-s-0 py-0! ps-0! pe-0! lg:border-s lg:ps-4!"
              mode="range"
              month={currentMonth}
              selected={dateRange}
              onSelect={(newDate) => {
                onDateRangeChange?.(newDate);
                if (newDate?.from) {
                  setCurrentMonth(newDate.from);
                }
                setInternalPeriod("custom");
                onPeriodChange?.("custom");
              }}
              onMonthChange={setCurrentMonth}
              locale={es}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
