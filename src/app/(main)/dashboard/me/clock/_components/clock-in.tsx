"use client";

import { useState, useEffect } from "react";

import { LogIn, LogOut, Coffee, FilePlus, MapPin, AlertTriangle, CheckCircle2, List, Map } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTimeTrackingStore } from "@/stores/time-tracking-store";

import { ManualTimeEntryDialog } from "./manual-time-entry-dialog";
import { TimeEntriesMap } from "./time-entries-map-wrapper";

export function ClockIn() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

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

          console.log(
            "🔢 Base:",
            baseMinutes,
            "Desde inicio:",
            minutesFromStart,
            "Total:",
            baseMinutes + minutesFromStart,
          );

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
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      seconds: seconds.toString().padStart(2, "0"),
    };
  };

  // Calcular tiempo restante
  const remainingMinutes = Math.max(0, expectedDailyHours * 60 - liveWorkedMinutes);
  const isCompleted = liveWorkedMinutes >= expectedDailyHours * 60;
  const workedTime = formatTimeWithSeconds(liveWorkedMinutes);
  const remainingTime = formatTimeWithSeconds(remainingMinutes);

  // Contar fichajes con GPS
  const entriesWithGPS = todaySummary?.timeEntries?.filter((e) => e.latitude && e.longitude).length ?? 0;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Fichar"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setManualDialogOpen(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              Solicitar fichaje manual
            </Button>
          </div>
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

      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-2">
        {/* Card principal de fichaje */}
        <Card className="@container/card flex flex-col items-center justify-center gap-6 p-8 md:p-12">
          <div className="flex w-full flex-col items-center gap-6">
            {/* Estado y fecha */}
            <div className="flex flex-col items-center gap-2">
              {getStatusBadge()}
              <p className="text-muted-foreground text-xs">
                {currentTime.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>

            {/* Tiempo trabajado */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground text-sm font-medium">Tiempo trabajado</span>
              {isLoading ? (
                <div className="flex items-center gap-1 tabular-nums">
                  <div className="bg-muted relative h-[60px] w-[80px] overflow-hidden rounded-lg">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                  <span className="text-muted-foreground/30 text-2xl font-bold">:</span>
                  <div className="bg-muted relative h-[60px] w-[80px] overflow-hidden rounded-lg">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite_0.2s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                  <span className="text-muted-foreground/30 text-2xl font-bold">:</span>
                  <div className="bg-muted relative h-[48px] w-[70px] overflow-hidden rounded-lg">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite_0.4s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in-0 slide-in-from-bottom-2 flex items-center gap-1 tabular-nums duration-500">
                  <span className="text-5xl font-bold">{workedTime.hours}</span>
                  <span className="text-muted-foreground text-2xl font-bold">:</span>
                  <span className="text-5xl font-bold">{workedTime.minutes}</span>
                  <span className="text-muted-foreground text-2xl font-bold">:</span>
                  <span className="text-muted-foreground text-3xl font-bold">{workedTime.seconds}</span>
                </div>
              )}
            </div>

            {/* Tiempo restante o completado */}
            <div className="flex flex-col items-center gap-1">
              {isLoading ? (
                <div className="bg-muted relative h-[40px] w-[200px] overflow-hidden rounded-lg">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite_0.6s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              ) : isCompleted ? (
                <div className="animate-in fade-in-0 zoom-in-95 flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 duration-500">
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    ¡Jornada completada! 🎉
                  </span>
                </div>
              ) : (
                <div className="animate-in fade-in-0 slide-in-from-bottom-1 delay-100 duration-500">
                  <span className="text-muted-foreground text-xs">Tiempo restante</span>
                  <div className="flex items-center gap-1 tabular-nums">
                    <span className="text-muted-foreground text-2xl font-semibold">{remainingTime.hours}</span>
                    <span className="text-muted-foreground text-lg">:</span>
                    <span className="text-muted-foreground text-2xl font-semibold">{remainingTime.minutes}</span>
                    <span className="text-muted-foreground text-lg">:</span>
                    <span className="text-muted-foreground/70 text-xl">{remainingTime.seconds}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            {currentStatus === "CLOCKED_OUT" ? (
              <Button size="lg" onClick={clockInAction} className="w-full" disabled={isLoading || isClocking}>
                <LogIn className="mr-2 h-5 w-5" />
                {isLoading ? "Cargando..." : isClocking ? "Fichando..." : "Fichar Entrada"}
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={clockOutAction}
                  variant="destructive"
                  className="w-full"
                  disabled={isLoading || isClocking}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  {isLoading ? "Cargando..." : isClocking ? "Fichando..." : "Fichar Salida"}
                </Button>
                <Button
                  size="lg"
                  onClick={handleBreak}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading || isClocking}
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  {isLoading
                    ? "Cargando..."
                    : isClocking
                      ? "Procesando..."
                      : currentStatus === "ON_BREAK"
                        ? "Volver del descanso"
                        : "Iniciar descanso"}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Card de resumen del día */}
        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Resumen de hoy</h3>

          {isLoading ? (
            <>
              {/* Skeleton para barra de progreso */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="bg-muted relative h-4 w-24 overflow-hidden rounded">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                  <div className="bg-muted relative h-4 w-20 overflow-hidden rounded">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite_0.1s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                </div>
                <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite_0.2s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              </div>

              {/* Skeleton para items */}
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="bg-muted relative h-4 w-20 overflow-hidden rounded">
                      <div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        style={{ animation: `shimmer 1.5s infinite ${i * 0.1}s` }}
                      />
                    </div>
                    <div className="bg-muted relative h-4 w-16 overflow-hidden rounded">
                      <div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        style={{ animation: `shimmer 1.5s infinite ${i * 0.1 + 0.05}s` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Barra de progreso de horas */}
              <div className="animate-in fade-in-0 flex flex-col gap-2 duration-500">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progreso diario</span>
                  <span className={`font-semibold ${!hasActiveContract ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                    {formatMinutes(todaySummary?.totalWorkedMinutes ?? 0)} / {expectedDailyHours}h
                    {!hasActiveContract && <span className="ml-1 text-xs">*</span>}
                  </span>
                </div>
                <Progress
                  value={Math.min(((todaySummary?.totalWorkedMinutes ?? 0) / 60 / expectedDailyHours) * 100, 100)}
                  className="h-2"
                />
                {todaySummary && todaySummary.totalWorkedMinutes >= expectedDailyHours * 60 && (
                  <p className="text-xs text-green-600 dark:text-green-400">¡Has completado tu jornada! 🎉</p>
                )}
              </div>

              <div className="animate-in fade-in-0 flex flex-col gap-3 delay-100 duration-500">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-muted-foreground text-sm">Entrada</span>
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
                  <span className="text-muted-foreground text-sm">Salida</span>
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
                  <span className="text-muted-foreground text-sm">Tiempo trabajado</span>
                  <span className="font-semibold tabular-nums">
                    {todaySummary ? formatMinutes(todaySummary.totalWorkedMinutes) : "0h 0m"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-muted-foreground text-sm">Pausas totales</span>
                  <span className="font-semibold tabular-nums">
                    {todaySummary ? formatMinutes(todaySummary.totalBreakMinutes) : "0h 0m"}
                  </span>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Historial de fichajes del día */}
      <Card className="@container/card flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Fichajes de hoy</h3>

          {/* Toggle Vista Lista/Mapa - solo si hay fichajes con GPS */}
          {entriesWithGPS > 0 && !isLoading && (
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                className="h-8 px-3"
              >
                <List className="mr-1.5 h-4 w-4" />
                Lista
              </Button>
              <Button
                size="sm"
                variant={viewMode === "map" ? "default" : "ghost"}
                onClick={() => setViewMode("map")}
                className="h-8 px-3"
              >
                <Map className="mr-1.5 h-4 w-4" />
                Mapa ({entriesWithGPS})
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="bg-muted relative size-4 overflow-hidden rounded">
                  <div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    style={{ animation: `shimmer 1.5s infinite ${i * 0.15}s` }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="bg-muted relative h-4 w-24 overflow-hidden rounded">
                    <div
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      style={{ animation: `shimmer 1.5s infinite ${i * 0.15 + 0.05}s` }}
                    />
                  </div>
                  <div className="bg-muted relative h-3 w-16 overflow-hidden rounded">
                    <div
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      style={{ animation: `shimmer 1.5s infinite ${i * 0.15 + 0.1}s` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : todaySummary?.timeEntries && todaySummary.timeEntries.length > 0 ? (
          viewMode === "map" ? (
            <TimeEntriesMap entries={todaySummary.timeEntries} />
          ) : (
            <div className="animate-in fade-in-0 flex flex-col gap-2 delay-150 duration-500">
              {todaySummary.timeEntries
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
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

                    {/* Información de geolocalización */}
                    {entry.latitude && entry.longitude && (
                      <div className="flex flex-wrap items-center gap-2 pl-7">
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="mr-1 h-3 w-3" />
                          GPS: {Math.round(entry.accuracy ?? 0)}m
                        </Badge>

                        {entry.isWithinAllowedArea === true && (
                          <Badge
                            variant="outline"
                            className="border-green-500/20 bg-green-500/10 text-xs text-green-700 dark:text-green-400"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Dentro del área
                          </Badge>
                        )}

                        {entry.requiresReview && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Requiere revisión
                          </Badge>
                        )}

                        {entry.distanceFromCenter && (
                          <span className="text-muted-foreground text-xs">
                            {Math.round(entry.distanceFromCenter)}m del centro
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )
        ) : (
          <p className="text-muted-foreground animate-in fade-in-0 text-sm duration-500">
            Aún no has registrado fichajes hoy.
          </p>
        )}
      </Card>
    </div>
  );
}
