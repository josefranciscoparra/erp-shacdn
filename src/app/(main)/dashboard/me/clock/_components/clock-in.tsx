"use client";

import { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  LogOut,
  Coffee,
  FilePlus,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  List,
  Map,
  Loader2,
  Clock,
} from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import { toast } from "sonner";

import { GeolocationConsentDialog } from "@/components/geolocation/geolocation-consent-dialog";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { useGeolocation } from "@/hooks/use-geolocation";
import { checkGeolocationConsent, getOrganizationGeolocationConfig } from "@/server/actions/geolocation";
import { useTimeTrackingStore } from "@/stores/time-tracking-store";

import { ManualTimeEntryDialog } from "./manual-time-entry-dialog";
import { TimeEntriesMap } from "./time-entries-map-wrapper";

export function ClockIn() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Estados de geolocalización
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const geolocation = useGeolocation();

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

  // Cargar estado inicial y configuración de geolocalización
  useEffect(() => {
    const load = async () => {
      await loadInitialData();

      // Verificar si la organización tiene geolocalización habilitada
      try {
        const config = await getOrganizationGeolocationConfig();
        setGeolocationEnabled(config.geolocationEnabled);
      } catch (error) {
        console.error("Error al cargar config de geolocalización:", error);
      }
    };
    load();
  }, [loadInitialData]);

  // Helper para ejecutar fichaje con geolocalización
  const executeWithGeolocation = async (
    action: (latitude?: number, longitude?: number, accuracy?: number) => Promise<void>,
  ) => {
    // Si la org no tiene geolocalización habilitada, fichar sin GPS
    if (!geolocationEnabled) {
      await action();
      return;
    }

    // Verificar consentimiento
    try {
      const { hasConsent } = await checkGeolocationConsent();

      if (!hasConsent) {
        // Guardar la acción pendiente y mostrar dialog de consentimiento
        setPendingAction(() => async () => await action());
        setShowConsentDialog(true);
        return;
      }

      // Capturar ubicación
      const locationData = await geolocation.getCurrentPosition();

      if (!locationData) {
        // Error al capturar GPS, pero permitir fichar sin ubicación
        console.warn("Ubicación no disponible:", geolocation.error);

        // Mostrar mensaje específico para Safari en localhost
        if (geolocation.error?.includes("denegado") || geolocation.error?.includes("PERMISSION_DENIED")) {
          toast.warning("GPS no disponible", {
            description:
              "Safari en localhost no permite geolocalización. Fichaje registrado sin GPS. Para usar GPS, prueba en Chrome o en HTTPS.",
            duration: 6000,
          });
        } else {
          toast.warning("GPS no disponible", {
            description: `${geolocation.error ?? "Error desconocido"}. Fichaje registrado sin GPS.`,
            duration: 5000,
          });
        }

        await action();
        return;
      }

      // Verificar precisión GPS
      if (locationData.accuracy > 100) {
        console.warn(`Precisión GPS baja: ${Math.round(locationData.accuracy)}m`);
        toast.info("Precisión GPS baja", {
          description: `La precisión es de ${Math.round(locationData.accuracy)}m. Se recomienda estar al aire libre.`,
          duration: 4000,
        });
      }

      // Fichar con geolocalización - pasar parámetros individuales
      await action(locationData.latitude, locationData.longitude, locationData.accuracy);
    } catch (error) {
      console.error("Error en proceso de geolocalización:", error);
      toast.error("Error al capturar GPS", {
        description: "Se guardará el fichaje sin ubicación GPS.",
        duration: 5000,
      });
      await action();
    }
  };

  const handleClockIn = async () => {
    await executeWithGeolocation(clockInAction);
  };

  const handleClockOut = async () => {
    await executeWithGeolocation(clockOutAction);
  };

  const handleBreak = async () => {
    if (currentStatus === "ON_BREAK") {
      await executeWithGeolocation(endBreakAction);
    } else {
      await executeWithGeolocation(startBreakAction);
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

  // Configuración del gráfico de progreso
  const workedMinutes = todaySummary?.totalWorkedMinutes ?? 0;
  const breakMinutes = todaySummary?.totalBreakMinutes ?? 0;
  const totalMinutes = expectedDailyHours * 60;
  const chartRemainingMinutes = Math.max(0, totalMinutes - workedMinutes);
  const progressPercentage = Math.min(Math.round((workedMinutes / totalMinutes) * 100), 100);

  const chartConfig = {
    worked: {
      label: "Trabajado",
      color: "var(--chart-1)",
    },
    breaks: {
      label: "Pausas",
      color: "var(--chart-2)",
    },
    remaining: {
      label: "Restante",
      color: "#e5e7eb",
    },
  } satisfies ChartConfig;

  const chartData = [
    { name: "worked", value: workedMinutes, fill: "var(--color-worked)" },
    { name: "breaks", value: breakMinutes, fill: "var(--color-breaks)" },
    { name: "remaining", value: chartRemainingMinutes, fill: "var(--color-remaining)" },
  ];

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

      {/* Diálogo de consentimiento de geolocalización */}
      <GeolocationConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConsent={async () => {
          setShowConsentDialog(false);
          if (pendingAction) {
            await executeWithGeolocation(pendingAction);
            setPendingAction(null);
          }
        }}
        onDeny={() => {
          setShowConsentDialog(false);
          setPendingAction(null);
        }}
      />

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
                  <span className="font-display text-5xl font-bold">{workedTime.hours}</span>
                  <span className="text-muted-foreground text-2xl font-bold">:</span>
                  <span className="font-display text-5xl font-bold">{workedTime.minutes}</span>
                  <span className="text-muted-foreground text-2xl font-bold">:</span>
                  <span className="text-muted-foreground font-display text-3xl font-bold">{workedTime.seconds}</span>
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
                    <span className="text-muted-foreground font-display text-2xl font-semibold">
                      {remainingTime.hours}
                    </span>
                    <span className="text-muted-foreground text-lg">:</span>
                    <span className="text-muted-foreground font-display text-2xl font-semibold">
                      {remainingTime.minutes}
                    </span>
                    <span className="text-muted-foreground text-lg">:</span>
                    <span className="text-muted-foreground/70 font-display text-xl">{remainingTime.seconds}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <AnimatePresence mode="wait" initial={false}>
              {currentStatus === "CLOCKED_OUT" ? (
                <motion.div
                  key="clocked-out"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <Button
                    size="lg"
                    onClick={handleClockIn}
                    className="w-full disabled:opacity-70"
                    disabled={isLoading || isClocking}
                  >
                    {isLoading || isClocking ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <LogIn className="mr-2 h-5 w-5" />
                    )}
                    Fichar Entrada
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="clocked-in"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex w-full flex-col gap-3"
                >
                  <Button
                    size="lg"
                    onClick={handleClockOut}
                    variant="destructive"
                    className="w-full disabled:opacity-70"
                    disabled={isLoading || isClocking}
                  >
                    {isLoading || isClocking ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-5 w-5" />
                    )}
                    Fichar Salida
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleBreak}
                    variant="outline"
                    className="w-full disabled:opacity-70"
                    disabled={isLoading || isClocking}
                  >
                    {isLoading || isClocking ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Coffee className="mr-2 h-5 w-5" />
                    )}
                    {currentStatus === "ON_BREAK" ? "Volver del descanso" : "Iniciar descanso"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Card de resumen del día */}
        <Card className="h-full">
          <CardContent className="space-y-2 pb-0">
            {isLoading ? (
              <div className="bg-muted relative mx-auto aspect-square max-h-[270px] overflow-hidden rounded-lg">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            ) : (
              <>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[270px]">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy ?? 0) - 8}
                                  className="fill-foreground font-display text-3xl"
                                >
                                  {progressPercentage}%
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy ?? 0) + 20}
                                  className="fill-muted-foreground text-sm"
                                >
                                  de tu jornada
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <p className="text-muted-foreground text-center text-xs">
                  Actualizado a las {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start justify-start gap-4 border-t pt-4 md:flex-row md:justify-around lg:items-center lg:gap-0">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex w-full items-center gap-3">
                    <div className="bg-muted relative size-10 overflow-hidden rounded-full">
                      <div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        style={{ animation: `shimmer 1.5s infinite ${i * 0.1}s` }}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="bg-muted relative h-3 w-16 overflow-hidden rounded">
                        <div
                          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                          style={{ animation: `shimmer 1.5s infinite ${i * 0.1 + 0.05}s` }}
                        />
                      </div>
                      <div className="bg-muted relative h-4 w-20 overflow-hidden rounded">
                        <div
                          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                          style={{ animation: `shimmer 1.5s infinite ${i * 0.1 + 0.1}s` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* Entrada */}
                <div className="flex w-full items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-green-400 bg-green-200 dark:bg-green-900">
                    <LogIn className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="text-sm">Entrada</div>
                    <div className="text-muted-foreground text-sm font-semibold tabular-nums">
                      {todaySummary?.clockIn
                        ? new Date(todaySummary.clockIn).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </div>
                  </div>
                </div>

                {/* Salida */}
                <div className="flex w-full items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-red-400 bg-red-200 dark:bg-red-900">
                    <LogOut className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="text-sm">Salida</div>
                    <div className="text-muted-foreground text-sm font-semibold tabular-nums">
                      {todaySummary?.clockOut
                        ? new Date(todaySummary.clockOut).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </div>
                  </div>
                </div>

                {/* Pausas */}
                <div className="flex w-full items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-yellow-400 bg-yellow-200 dark:bg-yellow-900">
                    <Coffee className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="text-sm">Pausas</div>
                    <div className="text-muted-foreground text-sm font-semibold tabular-nums">
                      {todaySummary ? formatMinutes(todaySummary.totalBreakMinutes) : "0h 0m"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Historial de fichajes del día */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Fichajes de hoy</CardTitle>

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
                Mapa
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
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
                    <div key={entry.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        {entry.entryType === "CLOCK_IN" && <LogIn className="h-4 w-4 shrink-0 text-green-500" />}
                        {entry.entryType === "CLOCK_OUT" && <LogOut className="h-4 w-4 shrink-0 text-red-500" />}
                        {entry.entryType === "BREAK_START" && <Coffee className="h-4 w-4 shrink-0 text-yellow-500" />}
                        {entry.entryType === "BREAK_END" && <Coffee className="h-4 w-4 shrink-0 text-green-500" />}
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

                      {/* Información de geolocalización - al lado */}
                      {entry.latitude && entry.longitude && (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="mr-1 h-3 w-3 text-red-500" />
                            {Math.round(entry.accuracy ?? 0)}m
                          </Badge>

                          {entry.isWithinAllowedArea === true && (
                            <Badge
                              variant="outline"
                              className="border-green-500/20 bg-green-500/10 text-xs text-green-700 dark:text-green-400"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Área OK
                            </Badge>
                          )}

                          {entry.requiresReview && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Revisión
                            </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}
