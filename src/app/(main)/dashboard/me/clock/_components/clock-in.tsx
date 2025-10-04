"use client";

import { useState, useEffect } from "react";
import { Clock, LogIn, LogOut, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [isClocking, setIsClocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Actualizar hora cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cargar estado y resumen al montar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [status, summary] = await Promise.all([
        getCurrentStatus(),
        getTodaySummary(),
      ]);

      console.log("📊 Summary cargado:", summary);
      console.log("📋 TimeEntries:", summary?.timeEntries);

      setCurrentStatus(status.status);
      setTodaySummary(summary as any);
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

  // Formatear minutos a horas y minutos
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

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
          <div className="flex flex-col items-center gap-4">
            <Clock className="h-16 w-16 text-muted-foreground" />
            <div className="text-center">
              <h2 className="text-4xl font-bold tabular-nums">
                {currentTime.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentTime.toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {getStatusBadge()}
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
            {todaySummary.timeEntries.map((entry) => (
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
