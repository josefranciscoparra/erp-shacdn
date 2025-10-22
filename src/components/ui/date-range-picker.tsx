"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Seleccionar rango",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal w-full",
            !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "dd/MM/yy", { locale: es })} -{" "}
                {format(dateRange.to, "dd/MM/yy", { locale: es })}
              </>
            ) : (
              format(dateRange.from, "dd/MM/yyyy", { locale: es })
            )
          ) : (
            <span>{placeholder}</span>
          )}
          {dateRange && (
            <X
              className="ml-auto size-4 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={1}
          defaultMonth={dateRange?.from ?? new Date()}
          initialFocus
          locale={es}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        />
        <div className="flex items-center justify-between border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={!dateRange}
          >
            Limpiar
          </Button>
          <Button
            size="sm"
            onClick={() => setOpen(false)}
            disabled={!dateRange?.from}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
