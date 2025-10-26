"use client";

import { useState, useEffect } from "react";

import { LogIn, LogOut, Coffee, FilePlus } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeTrackingStore } from "@/stores/time-tracking-store";

import { LiveClock } from "./live-clock";
import { ManualTimeEntryDialog } from "./manual-time-entry-dialog";

export function ClockIn() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  const {
    currentStatus,
    todaySummary,
    expectedDailyHours,
    hasActiveContract,
    liveWorkedMinutes,
    isClocking,
    isLoading,
    error,
    clockIn: clockInAction,
    clockOut: clockOutAction,
    startBreak: startBreakAction,
    endBreak: endBreakAction,
    setLiveWorkedMinutes,
    loadInitialData,
  } = useTimeTrackingStore();

  // Formatear minutos a horas/minutos para resúmenes
  const formatMinutes = (minutes: number) => {
    const totalSeconds = Math.max(0, Math.round(minutes * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Formatear tiempo con segundos para contador en vivo
  const formatTimeWithSeconds = (totalMinutes: number) => {
    const totalSeconds = Math.max(0, Math.round(totalMinutes * 60)); // Redondear para evitar pérdidas por flotantes
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      seconds: seconds.toString().padStart(2, "0"),
    };
  };

  const workedTime = formatTimeWithSeconds(liveWorkedMinutes);

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
          const baseMinutes = Number(todaySummary.totalWorkedMinutes || 0);

          setLiveWorkedMinutes(baseMinutes + minutesFromStart);
        }
      } else {
        setLiveWorkedMinutes(todaySummary?.totalWorkedMinutes ?? 0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStatus, todaySummary, setLiveWorkedMinutes]);

  // Cargar estado y resumen al montar
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleBreak = async () => {
    if (currentStatus === "ON_BREAK") {
      await endBreakAction();
    } else {
      await startBreakAction();
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

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Fichar"
        action={
          <Button variant="outline" size="sm" onClick={() => setManualDialogOpen(true)}>
            <FilePlus className="mr-2 h-4 w-4" />
            Solicitar fichaje manual
          </Button>
        }
      />

      {/* Dialog de solicitud de fichaje manual */}
      <ManualTimeEntryDialog open={manualDialogOpen} onOpenChange={setManualDialogOpen} />

      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-destructive text-sm">{error}</p>
        </Card>
      )}

      {!hasActiveContract && (
        <Card className="border-yellow-500 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-5 items-center justify-center rounded-full bg-yellow-500/20">
              <span className="text-xs font-bold text-yellow-700">!</span>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Sin contrato activo</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Usando valores por defecto:{" "}
                <span className="font-semibold">
                  {expectedDailyHours}h diarias ({expectedDailyHours * 5}h semanales)
                </span>
                . Contacta con RRHH para configurar tu contrato laboral.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 @xl/main:grid-cols-3">
        {/* Card principal de fichaje */}
        <Card className="@container/card flex flex-col items-center justify-between gap-6 p-8 md:p-12 @xl/main:col-span-2">
          <div className="flex w-full flex-col items-center gap-8">
            {/* Reloj y estado */}
            <div className="flex flex-col items-center gap-4">
              <LiveClock />
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                <p className="text-muted-foreground text-sm">
                  {currentTime.toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>

            {/* Tiempo trabajado y progreso */}
            <div className="flex w-full max-w-md flex-col items-center gap-4">
              <div className="flex w-full items-baseline justify-center gap-2 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground text-xs">Trabajado</span>
                  {isLoading ? (
                    <Skeleton className="h-10 w-32" />
                  ) : (
                    <span className="text-4xl font-bold tabular-nums">
                      {workedTime.hours}:{workedTime.minutes}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground text-2xl">/</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-muted-foreground text-xs">Jornada</span>
                  <span className="text-4xl font-bold tabular-nums">
                    {String(expectedDailyHours).padStart(2, "0")}:00
                  </span>
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-2 w-full" />
              ) : (
                <Progress
                  value={Math.min(((todaySummary?.totalWorkedMinutes ?? 0) / 60 / expectedDailyHours) * 100, 100)}
                  className="h-2"
                />
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid w-full max-w-sm grid-cols-2 gap-4">
            {currentStatus === "CLOCKED_OUT" ? (
              <Button
                size="lg"
                onClick={clockInAction}
                className="col-span-2 h-16 text-lg"
                disabled={isLoading || isClocking}
              >
                <LogIn className="mr-3 h-6 w-6" />
                {isLoading ? "Cargando..." : isClocking ? "Fichando..." : "Fichar Entrada"}
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={handleBreak}
                  variant="outline"
                  className="h-16 text-lg"
                  disabled={isLoading || isClocking}
                >
                  <Coffee className="mr-3 h-6 w-6" />
                  {currentStatus === "ON_BREAK" ? "Volver" : "Pausa"}
                </Button>
                <Button
                  size="lg"
                  onClick={clockOutAction}
                  variant="destructive"
                  className="h-16 text-lg"
                  disabled={isLoading || isClocking}
                >
                  <LogOut className="mr-3 h-6 w-6" />
                  {isClocking ? "Fichando..." : "Salida"}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Historial y resumen */}
        <div className="flex flex-col gap-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {/* Card de resumen del día */}
          <Card className="@container/card flex flex-col gap-4 p-6">
            <h3 className="font-semibold">Resumen de hoy</h3>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 rounded-lg border p-3">
                  <span className="text-muted-foreground text-xs">Entrada</span>
                  <span className="font-semibold tabular-nums">
                    {todaySummary?.clockIn
                      ? new Date(todaySummary.clockIn).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-3">
                  <span className="text-muted-foreground text-xs">Salida</span>
                  <span className="font-semibold tabular-nums">
                    {todaySummary?.clockOut
                      ? new Date(todaySummary.clockOut).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-3">
                  <span className="text-muted-foreground text-xs">Trabajado</span>
                  <span className="font-semibold tabular-nums">
                    {todaySummary ? formatMinutes(todaySummary.totalWorkedMinutes) : "0h 0m"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-3">
                  <span className="text-muted-foreground text-xs">Pausas</span>
                  <span className="font-semibold tabular-nums">
                    {todaySummary ? formatMinutes(todaySummary.totalBreakMinutes) : "0h 0m"}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Historial de fichajes del día */}
          <Card className="@container/card flex flex-1 flex-col gap-4 p-6">
            <h3 className="font-semibold">Fichajes de hoy</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : todaySummary?.timeEntries && todaySummary.timeEntries.length > 0 ? (
              <div className="flex flex-col gap-2">
                {todaySummary.timeEntries
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          {entry.entryType === "CLOCK_IN" && <LogIn className="h-4 w-4 text-green-500" />}
                          {entry.entryType === "CLOCK_OUT" && <LogOut className="h-4 w-4 text-red-500" />}
                          {entry.entryType === "BREAK_START" && <Coffee className="h-4 w-4 text-yellow-500" />}
                          {entry.entryType === "BREAK_END" && <Coffee className="h-4 w-4 text-green-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {entry.entryType === "CLOCK_IN" && "Entrada"}
                            {entry.entryType === "CLOCK_OUT" && "Salida"}
                            {entry.entryType === "BREAK_START" && "Inicio de pausa"}
                            {entry.entryType === "BREAK_END" && "Fin de pausa"}
                          </span>
                          <span className="text-muted-foreground text-xs">
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
              <p className="text-muted-foreground flex-1 text-center text-sm">Aún no has registrado fichajes hoy.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
