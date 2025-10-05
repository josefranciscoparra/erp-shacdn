"use client";

import { useState, useEffect } from "react";
import { Clock, LogIn, LogOut, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "@/components/hr/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  clockIn as clockInAction,
  clockOut as clockOutAction,
  startBreak as startBreakAction,
  endBreak as endBreakAction,
  getTodaySummary,
  getCurrentStatus,
  getExpectedDailyHours,
} from "@/server/actions/time-tracking";

type ClockStatus = "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";

interface WorkdaySummary {
  id: string;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  status: string;
  timeEntries: Array<{
    id: string;
    entryType: string;
    timestamp: Date;
  }>;
}

export function ClockIn() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentStatus, setCurrentStatus] = useState<ClockStatus>("CLOCKED_OUT");
  const [todaySummary, setTodaySummary] = useState<WorkdaySummary | null>(null);
  const [expectedDailyHours, setExpectedDailyHours] = useState<number>(8);
  const [isClocking, setIsClocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveWorkedMinutes, setLiveWorkedMinutes] = useState<number>(0);

  // Actualizar hora y contador en vivo cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());

      // Calcular tiempo trabajado en vivo si está trabajando
      if (currentStatus === "CLOCKED_IN" && todaySummary?.timeEntries) {
        const now = new Date();

        // Buscar el último CLOCK_IN o BREAK_END (inicio de la sesión actual)
        const entries = todaySummary.timeEntries;
        const lastWorkStart = [...entries]
          .reverse()
          .find((e) => e.entryType === "CLOCK_IN" || e.entryType === "BREAK_END");

        if (lastWorkStart) {
          const startTime = new Date(lastWorkStart.timestamp);

          // Calcular segundos exactos desde el inicio de esta sesión
          const secondsFromStart = (now.getTime() - startTime.getTime()) / 1000;
          const minutesFromStart = secondsFromStart / 60;

          // El base es el tiempo acumulado (que NO incluye la sesión actual)
          // Convertir a Number porque viene como Decimal de Prisma
          const baseMinutes = Number(todaySummary.totalWorkedMinutes) || 0;

          console.log("🔢 Base:", baseMinutes, "Desde inicio:", minutesFromStart, "Total:", baseMinutes + minutesFromStart);

          setLiveWorkedMinutes(baseMinutes + minutesFromStart);
        }
      } else {
        setLiveWorkedMinutes(todaySummary?.totalWorkedMinutes || 0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStatus, todaySummary]);

  // Cargar estado y resumen al montar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [status, summary, dailyHours] = await Promise.all([
        getCurrentStatus(),
        getTodaySummary(),
        getExpectedDailyHours(),
      ]);

      console.log("📊 Summary cargado:", summary);
      console.log("📋 TimeEntries:", summary?.timeEntries);

      setCurrentStatus(status.status);
      setTodaySummary(summary as any);
      setExpectedDailyHours(dailyHours);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    }
  };

  const handleClockIn = async () => {
    setIsClocking(true);
    setError(null);
    try {
      await clockInAction();
      setCurrentStatus("CLOCKED_IN");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al fichar entrada");
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    setIsClocking(true);
    setError(null);
    try {
      await clockOutAction();
      setCurrentStatus("CLOCKED_OUT");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al fichar salida");
    } finally {
      setIsClocking(false);
    }
  };

  const handleBreak = async () => {
    setIsClocking(true);
    setError(null);
    try {
      if (currentStatus === "ON_BREAK") {
        await endBreakAction();
        setCurrentStatus("CLOCKED_IN");
      } else {
        await startBreakAction();
        setCurrentStatus("ON_BREAK");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error con el descanso");
    } finally {
      setIsClocking(false);
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "CLOCKED_IN":
        return <Badge className="bg-green-500">Trabajando</Badge>;
      case "ON_BREAK":
        return <Badge className="bg-yellow-500">En pausa</Badge>;
      case "CLOCKED_OUT":
        return <Badge variant="secondary">Fuera de servicio</Badge>;
    }
  };

  // Formatear minutos a horas/minutos/segundos para resúmenes
  const formatMinutes = (minutes: number) => {
    const totalSeconds = Math.max(0, Math.round(minutes * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  // Formatear tiempo con segundos para contador en vivo
  const formatTimeWithSeconds = (totalMinutes: number) => {
    const totalSeconds = Math.max(0, Math.round(totalMinutes * 60)); // Redondear para evitar pérdidas por flotantes
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  };

  // Calcular tiempo restante
  const remainingMinutes = Math.max(0, (expectedDailyHours * 60) - liveWorkedMinutes);
  const isCompleted = liveWorkedMinutes >= expectedDailyHours * 60;
  const workedTime = formatTimeWithSeconds(liveWorkedMinutes);
  const remainingTime = formatTimeWithSeconds(remainingMinutes);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Fichar" />

      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-2">
        {/* Card principal de fichaje */}
        <Card className="@container/card flex flex-col items-center justify-center gap-6 p-8 md:p-12">
          <div className="flex w-full flex-col items-center gap-6">
            {/* Estado y fecha */}
            <div className="flex flex-col items-center gap-2">
              {getStatusBadge()}
              <p className="text-xs text-muted-foreground">
                {currentTime.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>

            {/* Tiempo trabajado */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Tiempo trabajado</span>
              <div className="flex items-center gap-1 tabular-nums">
                <span className="text-5xl font-bold">{workedTime.hours}</span>
                <span className="text-2xl font-bold text-muted-foreground">:</span>
                <span className="text-5xl font-bold">{workedTime.minutes}</span>
                <span className="text-2xl font-bold text-muted-foreground">:</span>
                <span className="text-3xl font-bold text-muted-foreground">{workedTime.seconds}</span>
              </div>
            </div>

            {/* Tiempo restante o completado */}
            <div className="flex flex-col items-center gap-1">
              {isCompleted ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2">
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    ¡Jornada completada! 🎉
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">Tiempo restante</span>
                  <div className="flex items-center gap-1 tabular-nums">
                    <span className="text-2xl font-semibold text-muted-foreground">{remainingTime.hours}</span>
                    <span className="text-lg text-muted-foreground">:</span>
                    <span className="text-2xl font-semibold text-muted-foreground">{remainingTime.minutes}</span>
                    <span className="text-lg text-muted-foreground">:</span>
                    <span className="text-xl text-muted-foreground/70">{remainingTime.seconds}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            {currentStatus === "CLOCKED_OUT" ? (
              <Button size="lg" onClick={handleClockIn} className="w-full" disabled={isClocking}>
                <LogIn className="mr-2 h-5 w-5" />
                {isClocking ? "Fichando..." : "Fichar Entrada"}
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={handleClockOut} variant="destructive" className="w-full" disabled={isClocking}>
                  <LogOut className="mr-2 h-5 w-5" />
                  {isClocking ? "Fichando..." : "Fichar Salida"}
                </Button>
                <Button size="lg" onClick={handleBreak} variant="outline" className="w-full" disabled={isClocking}>
                  <Coffee className="mr-2 h-5 w-5" />
                  {isClocking ? "Procesando..." : currentStatus === "ON_BREAK" ? "Volver del descanso" : "Iniciar descanso"}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Card de resumen del día */}
        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Resumen de hoy</h3>

          {/* Barra de progreso de horas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso diario</span>
              <span className="font-semibold">
                {formatMinutes(todaySummary?.totalWorkedMinutes || 0)} / {expectedDailyHours}h
              </span>
            </div>
            <Progress
              value={Math.min(((todaySummary?.totalWorkedMinutes || 0) / 60 / expectedDailyHours) * 100, 100)}
              className="h-2"
            />
            {todaySummary && todaySummary.totalWorkedMinutes >= expectedDailyHours * 60 && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ¡Has completado tu jornada! 🎉
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Entrada</span>
              <span className="font-semibold tabular-nums">
                {todaySummary?.clockIn
                  ? new Date(todaySummary.clockIn).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "--:--:--"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Salida</span>
              <span className="font-semibold tabular-nums">
                {todaySummary?.clockOut
                  ? new Date(todaySummary.clockOut).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "--:--:--"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Tiempo trabajado</span>
              <span className="font-semibold tabular-nums">
                {todaySummary ? formatMinutes(todaySummary.totalWorkedMinutes) : "0h 0m"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Pausas totales</span>
              <span className="font-semibold tabular-nums">
                {todaySummary ? formatMinutes(todaySummary.totalBreakMinutes) : "0h 0m"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Historial de fichajes del día */}
      <Card className="@container/card flex flex-col gap-4 p-6">
        <h3 className="text-lg font-semibold">Fichajes de hoy</h3>

        {todaySummary?.timeEntries && todaySummary.timeEntries.length > 0 ? (
          <div className="flex flex-col gap-2">
            {todaySummary.timeEntries.slice().reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {entry.entryType === "CLOCK_IN" && <LogIn className="h-4 w-4 text-green-500" />}
                  {entry.entryType === "CLOCK_OUT" && <LogOut className="h-4 w-4 text-red-500" />}
                  {entry.entryType === "BREAK_START" && <Coffee className="h-4 w-4 text-yellow-500" />}
                  {entry.entryType === "BREAK_END" && <Coffee className="h-4 w-4 text-green-500" />}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {entry.entryType === "CLOCK_IN" && "Entrada"}
                      {entry.entryType === "CLOCK_OUT" && "Salida"}
                      {entry.entryType === "BREAK_START" && "Inicio de pausa"}
                      {entry.entryType === "BREAK_END" && "Fin de pausa"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no has registrado fichajes hoy.</p>
        )}
      </Card>
    </div>
  );
}
