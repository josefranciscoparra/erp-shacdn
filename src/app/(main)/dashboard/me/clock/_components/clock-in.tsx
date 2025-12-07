"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Coffee, AlertTriangle, List, Map, Loader2, Clock, ArrowRight, Info } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import { toast } from "sonner";

import { GeolocationConsentDialog } from "@/components/geolocation/geolocation-consent-dialog";
import { SectionHeader } from "@/components/hr/section-header";
import { ExcessiveTimeDialog } from "@/components/time-tracking/excessive-time-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGeolocation } from "@/hooks/use-geolocation";
import { cn } from "@/lib/utils";
import { dismissNotification, isNotificationDismissed } from "@/server/actions/dismissed-notifications";
import { getTodaySchedule, getTodaySummary } from "@/server/actions/employee-schedule";
import { checkGeolocationConsent, getOrganizationGeolocationConfig } from "@/server/actions/geolocation";
import { detectIncompleteEntries, clockOut } from "@/server/actions/time-tracking";
import { formatDuration } from "@/services/schedules";
import { useTimeTrackingStore } from "@/stores/time-tracking-store";
import type { EffectiveSchedule } from "@/types/schedule";

import { ChangeProjectDialog } from "./change-project-dialog";
import { MinifiedDailyInfo } from "./minified-daily-info";
import { ProjectSelector } from "./project-selector";
import { TimeEntriesMap } from "./time-entries-map-wrapper";
import { TimeEntriesTimeline } from "./time-entries-timeline";

export function ClockIn() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [shouldAnimateChart, setShouldAnimateChart] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState<EffectiveSchedule | null>(null);
  const [scheduleExpectedMinutes, setScheduleExpectedMinutes] = useState<number | null>(null);
  const [todayDeviation, setTodayDeviation] = useState<number | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(true);
  const [chartSnapshot, setChartSnapshot] = useState<{
    workedMinutes: number;
    breakMinutes: number;
    updatedAt: Date;
  } | null>(null);
  const latestChartValuesRef = useRef({
    workedMinutes: 0,
    breakMinutes: 0,
  });

  // Estados de geolocalización
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const geolocation = useGeolocation();

  // Estados para proyecto
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectTask, setProjectTask] = useState("");

  // Estado para fichajes incompletos
  const [hasIncompleteEntry, setHasIncompleteEntry] = useState(false);
  const [isExcessive, setIsExcessive] = useState(false);
  const [showExcessiveDialog, setShowExcessiveDialog] = useState(false);
  const [incompleteEntryInfo, setIncompleteEntryInfo] = useState<{
    date: Date;
    lastEntryTime: Date;
    durationHours: number;
    durationMinutes: number;
    dailyHours: number;
    percentageOfJourney: number;
    clockInId: string;
  } | null>(null);

  const router = useRouter();

  const {
    currentStatus,
    todaySummary,
    hasActiveContract,
    isWorkingDay,
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
          .find((e) => e.entryType === "CLOCK_IN" || e.entryType === "BREAK_END" || e.entryType === "PROJECT_SWITCH");

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

      // Detectar fichajes incompletos y verificar si ya fueron descartados
      try {
        const incompleteData = await detectIncompleteEntries();
        if (incompleteData?.hasIncompleteEntry) {
          // Verificar si la notificación ya fue descartada
          const isDismissed = await isNotificationDismissed("INCOMPLETE_ENTRY", incompleteData.clockInId);

          if (!isDismissed) {
            setHasIncompleteEntry(true);
            setIsExcessive(incompleteData.isExcessive ?? false);
            setIncompleteEntryInfo({
              date: incompleteData.clockInDate,
              lastEntryTime: incompleteData.clockInTime,
              durationHours: incompleteData.durationHours,
              durationMinutes: incompleteData.durationMinutes,
              dailyHours: incompleteData.dailyHours,
              percentageOfJourney: incompleteData.percentageOfJourney,
              clockInId: incompleteData.clockInId,
            });
          }
        }
      } catch (error) {
        console.error("Error al detectar fichajes incompletos:", error);
      }
    };
    load();
  }, [loadInitialData]);

  // Cargar horario esperado del Schedule V2.0 y Resumen
  useEffect(() => {
    async function loadScheduleAndSummary() {
      try {
        const [scheduleResult, summaryResult] = await Promise.all([getTodaySchedule(), getTodaySummary()]);

        if (scheduleResult.success && scheduleResult.schedule) {
          setTodaySchedule(scheduleResult.schedule);
          setScheduleExpectedMinutes(scheduleResult.schedule.expectedMinutes);
        }

        if (summaryResult.success && summaryResult.summary) {
          setTodayDeviation(summaryResult.summary.deviationMinutes);
        }
      } catch (error) {
        console.error("Error loading schedule/summary:", error);
      } finally {
        setIsScheduleLoading(false);
      }
    }
    loadScheduleAndSummary();
  }, []);

  const restartChartAnimation = useCallback(() => {
    setShouldAnimateChart(false);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => setShouldAnimateChart(true));
    } else {
      setShouldAnimateChart(true);
    }
  }, []);

  useEffect(() => {
    latestChartValuesRef.current = {
      workedMinutes: liveWorkedMinutes,
      breakMinutes: todaySummary?.totalBreakMinutes ?? 0,
    };
  }, [liveWorkedMinutes, todaySummary?.totalBreakMinutes]);

  const updateChartSnapshot = useCallback(() => {
    const latestValues = latestChartValuesRef.current;
    setChartSnapshot({
      workedMinutes: latestValues.workedMinutes,
      breakMinutes: latestValues.breakMinutes,
      updatedAt: new Date(),
    });
    restartChartAnimation();
  }, [restartChartAnimation]);

  useEffect(() => {
    if (isLoading || isScheduleLoading) {
      return;
    }

    const handleFocus = () => {
      updateChartSnapshot();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateChartSnapshot();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    updateChartSnapshot();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoading, isScheduleLoading, updateChartSnapshot]);

  // Helper para ejecutar fichaje con geolocalización y proyecto
  const executeWithGeolocation = async <T,>(
    action: (latitude?: number, longitude?: number, accuracy?: number, projectId?: string, task?: string) => Promise<T>,
    projectId?: string | null,
    task?: string,
  ): Promise<T | undefined> => {
    // Si la org no tiene geolocalización habilitada, fichar sin GPS pero con proyecto
    if (!geolocationEnabled) {
      return await action(undefined, undefined, undefined, projectId ?? undefined, task);
    }

    // Verificar consentimiento
    try {
      const { hasConsent } = await checkGeolocationConsent();

      if (!hasConsent) {
        // Guardar la acción pendiente y mostrar dialog de consentimiento
        setPendingAction(() => async () => await action(undefined, undefined, undefined, projectId ?? undefined, task));
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

        return await action(undefined, undefined, undefined, projectId ?? undefined, task);
      }

      // Verificar precisión GPS
      if (locationData.accuracy > 100) {
        console.warn(`Precisión GPS baja: ${Math.round(locationData.accuracy)}m`);
        toast.info("Precisión GPS baja", {
          description: `La precisión es de ${Math.round(locationData.accuracy)}m. Se recomienda estar al aire libre.`,
          duration: 4000,
        });
      }

      // Fichar con geolocalización - pasar parámetros individuales + proyecto
      return await action(
        locationData.latitude,
        locationData.longitude,
        locationData.accuracy,
        projectId ?? undefined,
        task,
      );
    } catch (error) {
      console.error("Error en proceso de geolocalización:", error);
      toast.error("Error al capturar GPS", {
        description: "Se guardará el fichaje sin ubicación GPS.",
        duration: 5000,
      });
      return await action(undefined, undefined, undefined, projectId ?? undefined, task);
    }
  };

  const handleClockIn = async () => {
    try {
      const result = await executeWithGeolocation(clockInAction, selectedProjectId, projectTask || undefined);

      console.log("📊 [FRONTEND] Resultado de clockIn:", result);

      // Limpiar selección de proyecto después de fichar
      setSelectedProjectId(null);
      setProjectTask("");

      // Si hay alertas, mostrarlas al usuario
      if (result?.alerts && result.alerts.length > 0) {
        console.log("🚨 [FRONTEND] Mostrando alertas:", result.alerts);
        result.alerts.forEach((alert: any) => {
          // Determinar el tipo de toast según la severidad
          const toastFn =
            alert.severity === "CRITICAL" ? toast.error : alert.severity === "WARNING" ? toast.warning : toast.info;

          toastFn(alert.title, {
            description: alert.description,
            duration: 8000,
          });
        });
      } else {
        console.log("ℹ️ [FRONTEND] No se detectaron alertas o result no tiene alerts:", result);
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Error en handleClockIn:", error);
    }
  };

  const handleClockOut = async () => {
    // Si hay fichaje excesivo, mostrar modal de confirmación
    if (isExcessive && incompleteEntryInfo) {
      setShowExcessiveDialog(true);
      return;
    }

    // Fichaje normal
    await executeWithGeolocation(clockOutAction);
  };

  // Handler cuando usuario confirma cerrar fichaje excesivo
  const handleConfirmCloseExcessive = async () => {
    if (!incompleteEntryInfo) return;

    try {
      // Llamar clockOut con parámetros de cancelación
      const geoData =
        geolocationEnabled && geolocation.location
          ? {
              latitude: geolocation.location.latitude,
              longitude: geolocation.location.longitude,
              accuracy: geolocation.location.accuracy,
            }
          : {};

      await clockOut(
        geoData.latitude,
        geoData.longitude,
        geoData.accuracy,
        true, // cancelAsClosed
        {
          reason: "EXCESSIVE_DURATION",
          originalDurationHours: incompleteEntryInfo.durationHours,
          clockInId: incompleteEntryInfo.clockInId,
          notes: `Fichaje cancelado por larga duración (${incompleteEntryInfo.percentageOfJourney.toFixed(0)}% de jornada)`,
        },
      );

      toast.success("Fichaje cerrado y cancelado correctamente");
      setShowExcessiveDialog(false);
      await loadInitialData(); // Recargar datos
    } catch (error) {
      console.error("Error al cerrar fichaje excesivo:", error);
      toast.error("Error al cerrar fichaje");
    }
  };

  // Handler cuando usuario decide regularizar
  const handleGoToRegularize = () => {
    setShowExcessiveDialog(false);
    router.push("/dashboard/me/clock/requests");
  };

  // Handler para descartar notificación de fichaje incompleto
  const handleDismissIncompleteEntry = async (e: React.MouseEvent) => {
    if (!incompleteEntryInfo?.clockInId) return;

    try {
      await dismissNotification("INCOMPLETE_ENTRY", incompleteEntryInfo.clockInId);
      setHasIncompleteEntry(false);
      setIncompleteEntryInfo(null);
    } catch (error) {
      console.error("Error al descartar notificación:", error);
    }
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

  // Calcular tiempo restante usando Schedule V2.0
  // Si no hay horario cargado aún, usar 0 (se actualizará cuando cargue)
  const effectiveExpectedMinutes = scheduleExpectedMinutes ?? 0;

  const remainingMinutes = Math.max(0, effectiveExpectedMinutes - liveWorkedMinutes);

  // Estado completado:
  // - Si se esperaban horas (>0) y se cumplieron -> Completado
  // - Si NO se esperaban horas (0) y se trabajó -> "Trabajando en ausencia" (no es completado estándar)
  const isCompleted = effectiveExpectedMinutes > 0 && liveWorkedMinutes >= effectiveExpectedMinutes;
  const isWorkingOnAbsence = effectiveExpectedMinutes === 0 && liveWorkedMinutes > 0;

  const workedTime = formatTimeWithSeconds(liveWorkedMinutes);
  const remainingTime = formatTimeWithSeconds(remainingMinutes);

  // Contar fichajes con GPS
  const entriesWithGPS = todaySummary?.timeEntries?.filter((e) => e.latitude && e.longitude).length ?? 0;

  // Configuración del gráfico de progreso - usar snapshot estático para evitar parpadeos
  const chartWorkedMinutes = chartSnapshot?.workedMinutes ?? liveWorkedMinutes;
  const chartBreakMinutes = chartSnapshot?.breakMinutes ?? todaySummary?.totalBreakMinutes ?? 0;
  // Usar effectiveExpectedMinutes que ya considera Schedule V2.0
  const chartTotalMinutes = effectiveExpectedMinutes;
  const chartRemainingMinutes = Math.max(0, chartTotalMinutes - chartWorkedMinutes);
  // Permitir porcentajes > 100% cuando trabajas más horas de las esperadas
  const chartProgressPercentage =
    chartTotalMinutes > 0 ? Math.round((chartWorkedMinutes / chartTotalMinutes) * 100) : 0;

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

  // En días no laborables, mostrar solo lo trabajado + un mínimo para que se vea el círculo
  // Si trabajas más de lo esperado (chartWorkedMinutes > chartTotalMinutes), mostrar solo worked
  const chartData =
    chartTotalMinutes > 0
      ? chartWorkedMinutes > chartTotalMinutes
        ? [
            // Si excede el 100%, mostrar todo como "worked" (círculo completo)
            { name: "worked", value: chartWorkedMinutes, fill: "var(--color-worked)" },
          ]
        : [
            { name: "worked", value: chartWorkedMinutes, fill: "var(--color-worked)" },
            { name: "breaks", value: chartBreakMinutes, fill: "var(--color-breaks)" },
            { name: "remaining", value: chartRemainingMinutes, fill: "var(--color-remaining)" },
          ]
      : [
          { name: "worked", value: chartWorkedMinutes > 0 ? chartWorkedMinutes : 0, fill: "var(--color-worked)" },
          { name: "remaining", value: chartWorkedMinutes > 0 ? 0 : 1, fill: "var(--color-remaining)" },
        ];
  const chartLastUpdatedAt = chartSnapshot?.updatedAt ?? currentTime;

  // Controlar animación inicial: Solo animar la primera vez que se carga el gráfico
  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    if (!hasAnimated && chartWorkedMinutes > 0) {
      // Pequeño timeout para asegurar que se monte antes de marcar animado
      const timer = setTimeout(() => setHasAnimated(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated, chartWorkedMinutes]);

  // Memoizar el gráfico para evitar re-renders innecesarios - solo actualizar cada minuto
  const memoizedChart = useMemo(
    () => (
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[270px]">
        <PieChart key="progress-chart">
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            strokeWidth={5}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
            // Solo animar si NO se ha animado previamente O si se fuerza explícitamente
            isAnimationActive={!hasAnimated || shouldAnimateChart}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) - 8}
                        className="fill-foreground text-3xl font-bold tracking-tight"
                      >
                        {chartProgressPercentage}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 20}
                        className="fill-muted-foreground text-sm font-medium tracking-wide uppercase"
                      >
                        {chartTotalMinutes > 0 ? "Completado" : "Extra"}
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    ),
    // Solo actualizar cuando cambian los minutos (redondeados), o cuando se activa la animación
    [Math.floor(chartWorkedMinutes), chartBreakMinutes, chartProgressPercentage, chartTotalMinutes, shouldAnimateChart],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Registrar tu jornada"
        description="Gestiona tus fichajes y revisa tu progreso diario de forma sencilla."
        action={
          <Link href="/dashboard/me/clock/requests">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-orange-200 bg-orange-50/50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400 dark:hover:bg-orange-950/50"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>¿Olvidaste fichar?</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />

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

      {/* Advertencia de fichaje incompleto */}
      {hasIncompleteEntry && incompleteEntryInfo && (
        <Alert className="border-orange-500 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/30">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-800 dark:text-orange-300">Fichaje Pendiente de Resolver</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            <div className="flex flex-col gap-2">
              <p>
                Tienes una entrada sin cerrar desde el{" "}
                <strong>{new Date(incompleteEntryInfo.lastEntryTime).toLocaleString("es-ES")}</strong> (
                {Math.floor(incompleteEntryInfo.durationMinutes / 60)}h{" "}
                {Math.floor(incompleteEntryInfo.durationMinutes % 60)}min abierto).
              </p>
              <Link href="/dashboard/me/clock/requests" onClick={handleDismissIncompleteEntry}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-orange-300 bg-orange-100 text-orange-800 hover:bg-orange-200 dark:border-orange-700 dark:bg-orange-900/50 dark:text-orange-300 dark:hover:bg-orange-900"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Crear solicitud para resolver
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
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
                Usando horario asignado:{" "}
                <span className="font-semibold">
                  {(effectiveExpectedMinutes / 60).toFixed(1)}h diarias (
                  {((effectiveExpectedMinutes / 60) * 5).toFixed(1)}h semanales)
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
              {isLoading || isScheduleLoading ? (
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
                <div className="flex items-center gap-1 tabular-nums">
                  <span className="font-display text-5xl font-bold">{workedTime.hours}</span>
                  <span className="text-muted-foreground text-2xl font-bold">:</span>
                  <span className="font-display text-5xl font-bold">{workedTime.minutes}</span>
                  <span className="text-muted-foreground text-2xl font-bold">:</span>
                  <span className="text-muted-foreground font-display text-3xl font-bold">{workedTime.seconds}</span>
                </div>
              )}
            </div>

            {/* Tiempo restante o completado */}
            <div className="flex w-full flex-col items-center gap-1">
              {isLoading || isScheduleLoading ? (
                <div className="bg-muted relative h-[40px] w-[200px] overflow-hidden rounded-lg">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite_0.6s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              ) : todaySchedule?.source === "ABSENCE" ? (
                <Alert className="w-full border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/30">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertTitle className="font-semibold text-orange-800 dark:text-orange-300">
                    Ausencia Registrada: {todaySchedule.absence?.type ?? "Ausencia"}
                  </AlertTitle>
                  <AlertDescription className="text-xs text-orange-700 dark:text-orange-400">
                    {todaySchedule.absence?.reason ? `Motivo: ${todaySchedule.absence.reason}. ` : ""}
                    Estás fichando en un día marcado como ausencia.
                  </AlertDescription>
                </Alert>
              ) : !isWorkingDay ? (
                <Alert className="border-muted-foreground/20 bg-muted/40 w-full">
                  <Info className="text-muted-foreground h-4 w-4" />
                  <AlertTitle className="font-semibold">Día no laborable según tu contrato.</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    Los fichajes de hoy se registrarán como tiempo extra en la bolsa de horas.
                  </AlertDescription>
                </Alert>
              ) : isCompleted ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2">
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    ¡Jornada completada! 🎉
                  </span>
                </div>
              ) : isWorkingOnAbsence ? (
                <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Actividad registrada en día libre
                  </span>
                </div>
              ) : (
                <div>
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
                  className="flex w-full flex-col gap-4"
                >
                  {/* Selector de proyecto */}
                  <ProjectSelector
                    selectedProjectId={selectedProjectId}
                    onSelectProject={setSelectedProjectId}
                    task={projectTask}
                    onTaskChange={setProjectTask}
                    disabled={isLoading || isClocking || isScheduleLoading}
                  />

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="lg"
                          onClick={handleClockIn}
                          className="w-full disabled:opacity-70"
                          disabled={isLoading || isClocking || isScheduleLoading}
                        >
                          {isLoading || isClocking || isScheduleLoading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <LogIn className="mr-2 h-5 w-5" />
                          )}
                          Fichar Entrada
                        </Button>
                      </TooltipTrigger>
                      {!isWorkingDay && (
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Día no laborable.
                            <br />
                            Se registrará como tiempo extra.
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
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
                    className={cn(
                      "w-full disabled:opacity-70",
                      isExcessive && "border-2 border-orange-500 ring-2 ring-orange-200",
                    )}
                    disabled={isLoading || isClocking || isScheduleLoading}
                  >
                    {isLoading || isClocking || isScheduleLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-5 w-5" />
                    )}
                    Fichar Salida
                  </Button>
                  <div className="flex w-full gap-2">
                    <Button
                      size="lg"
                      onClick={handleBreak}
                      variant="outline"
                      className="flex-1 disabled:opacity-70"
                      disabled={isLoading || isClocking || isScheduleLoading}
                    >
                      {isLoading || isClocking || isScheduleLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Coffee className="mr-2 h-5 w-5" />
                      )}
                      {currentStatus === "ON_BREAK" ? "Volver del descanso" : "Iniciar descanso"}
                    </Button>
                    <ChangeProjectDialog
                      isOnBreak={currentStatus === "ON_BREAK"}
                      disabled={isLoading || isClocking || isScheduleLoading}
                      onProjectChanged={loadInitialData}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Card de resumen del día */}
        <Card className="relative h-full">
          <CardContent className="relative space-y-2 pb-0">
            {todayDeviation !== null && todayDeviation !== 0 && (
              <div className="absolute top-0 right-0 z-10">
                <Badge
                  variant="outline"
                  className={cn(
                    "bg-background/80 h-5 border px-1.5 text-[10px] font-medium backdrop-blur-sm",
                    todayDeviation > 0
                      ? "border-green-200 text-green-700 dark:border-green-900 dark:text-green-400"
                      : "border-red-200 text-red-700 dark:border-red-900 dark:text-red-400",
                  )}
                >
                  {todayDeviation > 0 ? "+" : ""}
                  {formatDuration(Math.round(Math.abs(todayDeviation)))}
                </Badge>
              </div>
            )}
            {isLoading || isScheduleLoading ? (
              <div className="bg-muted relative mx-auto aspect-square max-h-[270px] overflow-hidden rounded-lg">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            ) : (
              <>
                {memoizedChart}
                <p className="text-muted-foreground text-center text-xs">
                  Actualizado a las{" "}
                  {chartLastUpdatedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start justify-start gap-4 border-t pt-6 md:justify-between lg:gap-0">
            {isLoading || isScheduleLoading ? (
              <div className="w-full space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted relative size-2 overflow-hidden rounded-full">
                        <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-white/20" />
                      </div>
                      <div className="bg-muted relative h-3 w-16 overflow-hidden rounded">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      </div>
                    </div>
                    <div className="bg-muted relative h-3 w-12 overflow-hidden rounded">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full space-y-3">
                {/* Entrada */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    Entrada
                  </span>
                  <span className="font-mono font-medium">
                    {todaySummary?.clockIn
                      ? new Date(todaySummary.clockIn).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </span>
                </div>

                {/* Pausas */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <div className="size-2 rounded-full bg-amber-500" />
                    Pausas
                  </span>
                  <span className="font-mono font-medium">
                    {todaySummary ? formatMinutes(todaySummary.totalBreakMinutes) : "0h 0m"}
                  </span>
                </div>

                {/* Salida */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <div className="size-2 rounded-full bg-red-500" />
                    Salida
                  </span>
                  <span className="font-mono font-medium">
                    {todaySummary?.clockOut
                      ? new Date(todaySummary.clockOut).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </span>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Información resumida diaria */}
      <MinifiedDailyInfo schedule={todaySchedule} />

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
              <TimeEntriesTimeline entries={todaySummary.timeEntries} />
            )
          ) : (
            <p className="text-muted-foreground text-sm">Aún no has registrado fichajes hoy.</p>
          )}
        </CardContent>
      </Card>

      {/* Modal de fichaje excesivo */}
      {isExcessive && incompleteEntryInfo && (
        <ExcessiveTimeDialog
          open={showExcessiveDialog}
          onOpenChange={setShowExcessiveDialog}
          excessiveInfo={{
            durationHours: incompleteEntryInfo.durationHours,
            dailyHours: incompleteEntryInfo.dailyHours,
            percentageOfJourney: incompleteEntryInfo.percentageOfJourney,
            clockInDate: incompleteEntryInfo.date,
            clockInTime: incompleteEntryInfo.lastEntryTime,
            clockInId: incompleteEntryInfo.clockInId,
          }}
          onConfirmClose={handleConfirmCloseExcessive}
          onGoToRegularize={handleGoToRegularize}
        />
      )}
    </div>
  );
}
