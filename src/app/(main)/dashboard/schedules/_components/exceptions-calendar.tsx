"use client";

import { useState } from "react";

import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Tipo de excepción y sus colores
const exceptionTypeColors: Record<string, string> = {
  HOLIDAY: "bg-red-500 hover:bg-red-600",
  REDUCED_HOURS: "bg-yellow-500 hover:bg-yellow-600",
  SPECIAL_SCHEDULE: "bg-blue-500 hover:bg-blue-600",
  TRAINING: "bg-purple-500 hover:bg-purple-600",
  EARLY_CLOSURE: "bg-orange-500 hover:bg-orange-600",
  CUSTOM: "bg-gray-500 hover:bg-gray-600",
};

const exceptionTypeLabels: Record<string, string> = {
  HOLIDAY: "Festivo",
  REDUCED_HOURS: "Jornada Reducida",
  SPECIAL_SCHEDULE: "Horario Especial",
  TRAINING: "Formación",
  EARLY_CLOSURE: "Cierre Anticipado",
  CUSTOM: "Personalizado",
};

export interface ExceptionForCalendar {
  id: string;
  date: Date;
  endDate?: Date | null;
  exceptionType: string;
  reason?: string | null;
  isRecurring: boolean;
}

interface ExceptionsCalendarProps {
  exceptions: ExceptionForCalendar[];
  onDayClick?: (date: Date) => void;
  onExceptionClick?: (exception: ExceptionForCalendar) => void;
  onCreateException?: () => void;
  className?: string;
}

export function ExceptionsCalendar({
  exceptions,
  onDayClick,
  onExceptionClick,
  onCreateException,
  className,
}: ExceptionsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Obtener excepciones del mes actual
  const exceptionsInMonth = exceptions.filter((exception) => {
    const exceptionDate = new Date(exception.date);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return exceptionDate >= monthStart && exceptionDate <= monthEnd;
  });

  // Agrupar excepciones por día
  const exceptionsByDay = exceptionsInMonth.reduce(
    (acc, exception) => {
      const dateKey = format(new Date(exception.date), "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(exception);
      return acc;
    },
    {} as Record<string, ExceptionForCalendar[]>,
  );

  // Días con excepciones
  const daysWithExceptions = Object.keys(exceptionsByDay).map((dateKey) => new Date(dateKey));

  // Navegar mes
  function handlePreviousMonth() {
    setCurrentMonth(subMonths(currentMonth, 1));
  }

  function handleNextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1));
  }

  function handleToday() {
    setCurrentMonth(new Date());
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header con navegación */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendario de Excepciones
              </CardTitle>
              <CardDescription>
                {format(currentMonth, "MMMM yyyy", { locale: es }).charAt(0).toUpperCase() +
                  format(currentMonth, "MMMM yyyy", { locale: es }).slice(1)}
                {" · "}
                {exceptionsInMonth.length} excepción
                {exceptionsInMonth.length !== 1 ? "es" : ""}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleToday}>
                Hoy
              </Button>
              {onCreateException && (
                <Button size="sm" onClick={onCreateException}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Navegación de mes */}
          <div className="mb-4 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-medium">
              {format(currentMonth, "MMMM yyyy", { locale: es }).charAt(0).toUpperCase() +
                format(currentMonth, "MMMM yyyy", { locale: es }).slice(1)}
            </h3>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendario personalizado con grid */}
          <div className="space-y-2">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => (
                <div key={index} className="text-muted-foreground py-2 text-sm font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-2">
              {eachDayOfInterval({
                start: startOfMonth(currentMonth),
                end: endOfMonth(currentMonth),
              }).map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayExceptions = exceptionsByDay[dateKey] ?? [];
                const hasExceptions = dayExceptions.length > 0;
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={dateKey}
                    onClick={() => {
                      if (hasExceptions && onExceptionClick) {
                        onExceptionClick(dayExceptions[0]);
                      } else if (onDayClick) {
                        onDayClick(day);
                      }
                    }}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center rounded-md border p-2 text-sm transition-colors",
                      isToday && "border-primary ring-primary ring-1",
                      hasExceptions
                        ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-accent hover:text-accent-foreground",
                      !isSameDay(day, currentMonth) && "text-muted-foreground opacity-50",
                    )}
                  >
                    <span className={cn("font-medium", isToday && "text-primary")}>{format(day, "d")}</span>

                    {/* Indicadores de excepciones */}
                    {hasExceptions && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayExceptions.slice(0, 3).map((exception, index) => (
                          <div
                            key={exception.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              exceptionTypeColors[exception.exceptionType] ?? "bg-gray-500",
                            )}
                            title={exceptionTypeLabels[exception.exceptionType] ?? exception.exceptionType}
                          />
                        ))}
                        {dayExceptions.length > 3 && (
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-400" title="Más excepciones" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leyenda de colores */}
          <div className="mt-6 flex flex-wrap gap-3 border-t pt-4">
            <div className="text-muted-foreground text-sm font-medium">Tipos:</div>
            {Object.entries(exceptionTypeLabels).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={cn("h-3 w-3 rounded-full", exceptionTypeColors[type] ?? "bg-gray-500")} />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de excepciones del mes */}
      {exceptionsInMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Excepciones del Mes</CardTitle>
            <CardDescription>
              {exceptionsInMonth.length} excepción{exceptionsInMonth.length !== 1 ? "es" : ""} configurada
              {exceptionsInMonth.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exceptionsInMonth
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((exception) => {
                  const typeInfo = exceptionTypeLabels[exception.exceptionType] ?? exception.exceptionType;
                  const colorClass = exceptionTypeColors[exception.exceptionType] ?? "bg-gray-500";

                  return (
                    <button
                      key={exception.id}
                      onClick={() => onExceptionClick?.(exception)}
                      className="hover:bg-accent flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors"
                    >
                      <div className={cn("h-3 w-3 rounded-full", colorClass)} />
                      <div className="flex-1">
                        <div className="font-medium">
                          {format(new Date(exception.date), "dd MMM yyyy", { locale: es })}
                          {exception.endDate && (
                            <>
                              {" - "}
                              {format(new Date(exception.endDate), "dd MMM yyyy", { locale: es })}
                            </>
                          )}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {typeInfo}
                          {exception.reason && ` · ${exception.reason}`}
                        </div>
                      </div>
                      {exception.isRecurring && (
                        <Badge variant="outline" className="text-xs">
                          Anual
                        </Badge>
                      )}
                    </button>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
