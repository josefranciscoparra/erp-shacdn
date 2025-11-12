"use client";

import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CoverageHeatmapProps {
  days: string[];
  hours: string[];
  data: number[][]; // [día][hora] = porcentaje
}

export function CoverageHeatmap({ days, hours, data }: CoverageHeatmapProps) {
  /**
   * Obtener color basado en porcentaje de cobertura
   */
  const getColorClass = (percentage: number): string => {
    if (percentage === 0) return "bg-gray-100 dark:bg-gray-900";
    if (percentage < 50) return "bg-red-500";
    if (percentage < 80) return "bg-orange-500";
    if (percentage < 100) return "bg-yellow-500";
    if (percentage === 100) return "bg-green-500";
    return "bg-blue-500"; // Sobrecubierto (>100%)
  };

  /**
   * Obtener opacidad basada en porcentaje
   */
  const getOpacity = (percentage: number): number => {
    if (percentage === 0) return 0.1;
    if (percentage < 50) return 0.4;
    if (percentage < 80) return 0.6;
    if (percentage < 100) return 0.8;
    return 1;
  };

  /**
   * Formatear tooltip
   */
  const getTooltipText = (day: string, hour: string, percentage: number): string => {
    if (percentage === 0) return `${day} ${hour}: Sin turnos`;
    if (percentage < 100) return `${day} ${hour}: ${percentage.toFixed(0)}% cubierto (déficit)`;
    if (percentage === 100) return `${day} ${hour}: 100% cubierto`;
    return `${day} ${hour}: ${percentage.toFixed(0)}% (sobrecubierto)`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Heatmap de Cobertura Semanal</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-red-500 opacity-60" />
              <span className="text-muted-foreground">&lt;50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-orange-500 opacity-60" />
              <span className="text-muted-foreground">50-79%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-yellow-500 opacity-80" />
              <span className="text-muted-foreground">80-99%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span className="text-muted-foreground">100%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">&gt;100%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Grid container */}
              <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
                {/* Header vacío para la columna de horas */}
                <div className="text-xs font-medium" />

                {/* Headers de días */}
                {days.map((day) => (
                  <div key={day} className="text-center text-xs font-medium">
                    {day.substring(0, 3)}
                  </div>
                ))}

                {/* Filas de horas */}
                {hours.map((hour, hourIndex) => (
                  <Fragment key={`hour-row-${hour}-${hourIndex}`}>
                    {/* Etiqueta de hora */}
                    <div className="text-muted-foreground py-1 text-xs">{hour}</div>

                    {/* Celdas para cada día */}
                    {days.map((day, dayIndex) => {
                      const percentage = data[dayIndex]?.[hourIndex] ?? 0;
                      const colorClass = getColorClass(percentage);
                      const opacity = getOpacity(percentage);

                      return (
                        <Tooltip key={`${day}-${hour}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`hover:ring-primary h-8 rounded transition-all hover:scale-110 hover:ring-2 ${colorClass}`}
                              style={{ opacity }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getTooltipText(day, hour, percentage)}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
