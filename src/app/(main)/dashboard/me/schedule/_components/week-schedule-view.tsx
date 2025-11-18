"use client";

import { useCallback, useEffect, useState } from "react";

import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDuration, minutesToTime } from "@/lib/schedule-helpers";
import { getMyWeekSchedule } from "@/server/actions/employee-schedule";
import type { EffectiveSchedule } from "@/types/schedule";

const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_OF_WEEK_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startStr = weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const endStr = weekEnd.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

  return `${startStr} - ${endStr}`;
}

export function WeekScheduleView() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [weekSchedule, setWeekSchedule] = useState<EffectiveSchedule[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeekSchedule = useCallback(async (weekStart: Date) => {
    try {
      setIsLoading(true);
      const result = await getMyWeekSchedule(weekStart);

      if (result.success && result.days) {
        setWeekSchedule(result.days);
        setError(null);
      } else {
        setError(result.error ?? "Error al cargar horario");
      }
    } catch (err) {
      setError("Error al cargar horario");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeekSchedule(currentWeekStart);
  }, [currentWeekStart, loadWeekSchedule]);

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const isCurrentWeek = () => {
    const now = getWeekStart(new Date());
    return currentWeekStart.getTime() === now.getTime();
  };

  const totalWeekHours = weekSchedule
    ? weekSchedule.reduce((sum, day) => sum + (day.isWorkingDay ? day.expectedMinutes : 0), 0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <CardTitle className="text-base">Horario Semanal</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {!isCurrentWeek() && (
              <Button variant="outline" size="sm" onClick={goToCurrentWeek} disabled={isLoading}>
                Hoy
              </Button>
            )}

            <span className="text-muted-foreground text-sm font-medium">{formatWeekRange(currentWeekStart)}</span>

            <Button variant="outline" size="icon" onClick={goToNextWeek} disabled={isLoading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="bg-muted relative h-32 w-full overflow-hidden rounded-lg">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </div>
        ) : (error ?? !weekSchedule) ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <Clock className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-sm">{error ?? "No se pudo cargar el horario"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop view */}
            <div className="hidden @3xl/main:grid @3xl/main:grid-cols-7 @3xl/main:gap-4">
              {weekSchedule.map((daySchedule, index) => {
                const dayOfWeek = (currentWeekStart.getDay() + index) % 7;
                const date = new Date(currentWeekStart);
                date.setDate(currentWeekStart.getDate() + index);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div key={index} className={`rounded-lg border p-3 ${isToday ? "border-primary bg-primary/5" : ""}`}>
                    <div className="mb-3 text-center">
                      <div className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                        {DAYS_OF_WEEK_SHORT[dayOfWeek]}
                      </div>
                      <div className={`text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {date.getDate()}
                      </div>
                    </div>

                    {daySchedule.isWorkingDay ? (
                      <div className="space-y-2">
                        {daySchedule.timeSlots.map((slot, slotIndex) => (
                          <div
                            key={slotIndex}
                            className={`rounded border-l-2 p-2 text-xs ${
                              slot.slotType === "WORK"
                                ? "border-l-primary bg-primary/10"
                                : slot.slotType === "BREAK"
                                  ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30"
                                  : "border-l-blue-500 bg-blue-50 dark:bg-blue-950/30"
                            }`}
                          >
                            <div className="font-medium">
                              {minutesToTime(slot.startMinutes)} - {minutesToTime(slot.endMinutes)}
                            </div>
                            <div className="text-muted-foreground mt-0.5 text-[10px]">
                              {slot.slotType === "WORK" ? "Trabajo" : slot.slotType === "BREAK" ? "Pausa" : "Guardia"}
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-2 text-center text-xs font-medium">
                          {formatDuration(daySchedule.expectedMinutes)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center justify-center py-4 text-center">
                        <div className="text-xs">Descanso</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile view */}
            <div className="space-y-2 @3xl/main:hidden">
              {weekSchedule.map((daySchedule, index) => {
                const dayOfWeek = (currentWeekStart.getDay() + index) % 7;
                const date = new Date(currentWeekStart);
                date.setDate(currentWeekStart.getDate() + index);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div key={index} className={`rounded-lg border p-4 ${isToday ? "border-primary bg-primary/5" : ""}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className={`font-medium ${isToday ? "text-primary" : ""}`}>{DAYS_OF_WEEK[dayOfWeek]}</div>
                        <div className={`text-sm ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {date.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                        </div>
                      </div>
                      {isToday && <Badge variant="default">Hoy</Badge>}
                    </div>

                    {daySchedule.isWorkingDay ? (
                      <div className="space-y-2">
                        {daySchedule.timeSlots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center justify-between rounded border p-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  slot.slotType === "WORK"
                                    ? "default"
                                    : slot.slotType === "BREAK"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {slot.slotType === "WORK" ? "Trabajo" : slot.slotType === "BREAK" ? "Pausa" : "Guardia"}
                              </Badge>
                              <span className="text-sm">
                                {minutesToTime(slot.startMinutes)} - {minutesToTime(slot.endMinutes)}
                              </span>
                            </div>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total día:</span>
                          <span className="font-medium">{formatDuration(daySchedule.expectedMinutes)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground rounded border border-dashed p-4 text-center text-sm">
                        Día de descanso
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Resumen semanal */}
            <div className="bg-muted/50 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total semanal:</span>
                <span className="text-lg font-semibold">{formatDuration(totalWeekHours)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
