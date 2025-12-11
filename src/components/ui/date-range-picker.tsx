"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange, DayPicker, DayButton as DayButtonOriginal } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
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
  markers?: DateMarker[];
}

export type DateMarker = {
  date: Date;
  color: string;
  label?: string;
  status?: string;
};

// Context para pasar los markers a los componentes internos
const MarkerContext = React.createContext<Map<string, DateMarker[]>>(new Map());

// Componente DayButton customizado que lee los markers del context
function CustomDayButton(props: React.ComponentProps<typeof DayButtonOriginal>) {
  const { day, modifiers, ...rest } = props;
  const markersByDay = React.useContext(MarkerContext);

  const dayDate = day.date;
  const key = format(dayDate, "yyyy-MM-dd");
  const dayMarkers = markersByDay.get(key);
  const firstMarker = dayMarkers?.[0];

  // Determinar si este día está seleccionado o es parte de un rango
  const isSelected = modifiers.selected;
  const isRangeMiddle = modifiers.range_middle;
  const isRangeStart = modifiers.range_start;
  const isRangeEnd = modifiers.range_end;
  const isInRange = isSelected || isRangeMiddle || isRangeStart || isRangeEnd;

  return (
    <button
      {...rest}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "size-8 rounded-md p-0 font-normal transition-none aria-selected:opacity-100 relative overflow-hidden",
        // Estilos de selección estándar del calendar
        isRangeStart && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-s-md",
        isRangeEnd && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-e-md",
        isRangeMiddle && "bg-accent text-foreground",
        modifiers.today && !isInRange && "bg-accent text-accent-foreground ring-1 ring-primary",
        modifiers.outside && "text-muted-foreground opacity-50",
        modifiers.disabled && "text-muted-foreground opacity-50"
      )}
      style={
        firstMarker && !isInRange
          ? {
              backgroundColor: firstMarker.color,
              opacity: firstMarker.status === "PENDING" ? 0.6 : 0.85,
              color: "#fff",
              fontWeight: 600,
            }
          : undefined
      }
    >
      <span className="relative z-10">{format(dayDate, "d")}</span>
      {/* Indicador de múltiples ausencias */}
      {dayMarkers && dayMarkers.length > 1 && !isInRange && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
          style={{ backgroundColor: dayMarkers[1].color }}
        >
          +{dayMarkers.length - 1}
        </span>
      )}
    </button>
  );
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Seleccionar rango",
  className,
  disabled = false,
  markers = [],
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Crear el mapa de markers por día
  const markersByDay = React.useMemo(() => {
    const map = new Map<string, DateMarker[]>();
    markers.forEach((marker) => {
      const key = format(marker.date, "yyyy-MM-dd");
      const existing = map.get(key) ?? [];
      existing.push(marker);
      map.set(key, existing);
    });
    return map;
  }, [markers]);

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
        <MarkerContext.Provider value={markersByDay}>
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={1}
            defaultMonth={dateRange?.from ?? new Date()}
            locale={es}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            showOutsideDays
            className="p-3"
            classNames={{
              months: "relative flex",
              month_caption: "relative mx-10 flex h-7 items-center justify-center",
              weekdays: "flex flex-row",
              weekday: "w-8 text-sm font-normal text-muted-foreground",
              month: "w-full",
              caption: "relative flex items-center justify-center pt-1",
              caption_label: "truncate text-sm font-medium",
              button_next: cn(
                buttonVariants({ variant: "outline" }),
                "absolute right-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              button_previous: cn(
                buttonVariants({ variant: "outline" }),
                "absolute left-0 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              nav: "flex items-start",
              month_grid: "mx-auto mt-4",
              week: "mt-2 flex w-max items-start",
              day: "flex size-8 flex-1 items-center justify-center p-0 text-sm",
              day_button: cn(
                buttonVariants({ variant: "ghost" }),
                "size-8 rounded-md p-0 font-normal transition-none aria-selected:opacity-100"
              ),
              range_start: "bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground day-range-start rounded-s-md",
              range_middle: "bg-accent !text-foreground [&>button]:bg-transparent [&>button]:!text-foreground [&>button]:hover:bg-transparent [&>button]:hover:!text-foreground",
              range_end: "bg-accent [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground day-range-end rounded-e-md",
              selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
              today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
              outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              disabled: "text-muted-foreground opacity-50",
              hidden: "invisible flex-1",
            }}
            components={{
              DayButton: CustomDayButton,
            }}
          />
        </MarkerContext.Provider>
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
