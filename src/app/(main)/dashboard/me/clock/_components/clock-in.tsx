"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  LogOut,
  Coffee,
  AlertTriangle,
  List,
  Map,
  Loader2,
  Clock,
  ArrowRight,
  Info,
  HelpCircle,
  Play,
  Pause,
  Timer,
  Sparkles,
} from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import { toast } from "sonner";

import { GeolocationConsentDialog } from "@/components/geolocation/geolocation-consent-dialog";
import { ExcessiveTimeDialog } from "@/components/time-tracking/excessive-time-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGeolocation } from "@/hooks/use-geolocation";
import { cn } from "@/lib/utils";
import { getClockBootstrap } from "@/server/actions/clock-bootstrap";
import { dismissNotification } from "@/server/actions/dismissed-notifications";
import { checkGeolocationConsent } from "@/server/actions/geolocation";
import { clockOut } from "@/server/actions/time-tracking";
import { formatDuration } from "@/services/schedules";
import { useTimeTrackingStore } from "@/stores/time-tracking-store";
import type { EffectiveSchedule } from "@/types/schedule";

import { MinifiedDailyInfo } from "./minified-daily-info";
import { ProjectSelector } from "./project-selector";
import { TimeEntriesMap } from "./time-entries-map-wrapper";
import { TimeEntriesTimeline } from "./time-entries-timeline";

// ============================================================================
// TYPES
// ============================================================================

type ClockBootstrapResult = Awaited<ReturnType<typeof getClockBootstrap>>;
type ClockBootstrapReady = ClockBootstrapResult & {
  todaySummary: NonNullable<ClockBootstrapResult["todaySummary"]>;
  currentStatus: NonNullable<ClockBootstrapResult["currentStatus"]>;
};

type ClockAction = (
  latitude?: number,
  longitude?: number,
  accuracy?: number,
  projectId?: string,
  task?: string,
) => Promise<unknown>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const isBootstrapReady = (result: ClockBootstrapResult): result is ClockBootstrapReady =>
  Boolean(result.success && result.todaySummary && result.currentStatus);

function getStatusConfig(status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK") {
  switch (status) {
    case "CLOCKED_IN":
      return {
        label: "Trabajando",
        shortLabel: "Activo",
        icon: Play,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        ring: "ring-emerald-500/20",
        pulse: "bg-emerald-500",
        gradient: "from-emerald-500/10 to-teal-500/10",
      };
    case "ON_BREAK":
      return {
        label: "En pausa",
        shortLabel: "Pausa",
        icon: Coffee,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        ring: "ring-amber-500/20",
        pulse: "bg-amber-500",
        gradient: "from-amber-500/10 to-orange-500/10",
      };
    default:
      return {
        label: "Fuera de servicio",
        shortLabel: "Fuera",
        icon: Pause,
        color: "text-slate-500 dark:text-slate-400",
        bg: "bg-slate-500/10",
        border: "border-slate-500/20",
        ring: "ring-slate-500/20",
        pulse: "bg-slate-400",
        gradient: "from-slate-500/10 to-gray-500/10",
      };
  }
}

function formatTimeWithSeconds(totalMinutes: number) {
  const totalSeconds = Math.max(0, Math.round(totalMinutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    hours: hours.toString().padStart(2, "0"),
    minutes: minutes.toString().padStart(2, "0"),
    seconds: seconds.toString().padStart(2, "0"),
  };
}

function formatMinutesToDisplay(minutes: number) {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours}h ${mins}m ${secs}s`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClockIn() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [shouldAnimateChart, setShouldAnimateChart] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState<EffectiveSchedule | null>(null);
  const [scheduleExpectedMinutes, setScheduleExpectedMinutes] = useState<number | null>(null);
  const [todayDeviation, setTodayDeviation] = useState<number | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(true);
  const [canClock, setCanClock] = useState(true);
  const [orgContextMessage, setOrgContextMessage] = useState<string | null>(null);
  const [chartSnapshot, setChartSnapshot] = useState<{
    workedMinutes: number;
    breakMinutes: number;
    updatedAt: Date;
  } | null>(null);
  const latestChartValuesRef = useRef({ workedMinutes: 0, breakMinutes: 0 });
  const isMountedRef = useRef(true);

  // Geolocation states
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: ClockAction;
    projectId?: string | null;
    task?: string;
  } | null>(null);
  const geolocation = useGeolocation();

  // Project states
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectTask, setProjectTask] = useState("");

  // Incomplete entry states
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    setLoading,
    setError,
    hydrateFromBootstrap,
  } = useTimeTrackingStore();

  // Update time and live counter every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());

      if (currentStatus === "CLOCKED_IN" && todaySummary?.timeEntries) {
        const now = new Date();
        const entries = todaySummary.timeEntries;
        const lastWorkStart = [...entries]
          .reverse()
          .find((e) => e.entryType === "CLOCK_IN" || e.entryType === "BREAK_END" || e.entryType === "PROJECT_SWITCH");

        if (lastWorkStart) {
          const startTime = new Date(lastWorkStart.timestamp);
          const secondsFromStart = (now.getTime() - startTime.getTime()) / 1000;
          const minutesFromStart = secondsFromStart / 60;
          const baseMinutes = Number(todaySummary.totalWorkedMinutes || 0);
          setLiveWorkedMinutes(baseMinutes + minutesFromStart);
        }
      } else {
        setLiveWorkedMinutes(todaySummary?.totalWorkedMinutes ?? 0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStatus, todaySummary, setLiveWorkedMinutes]);

  const applyBootstrapResult = useCallback(
    (result: ClockBootstrapReady) => {
      const hoursInfo = result.hoursInfo;
      const expectedDailyHours = hoursInfo ? hoursInfo.hoursToday : 0;
      const hasActive = hoursInfo ? hoursInfo.hasActiveContract : false;
      const workingDay = hoursInfo ? hoursInfo.isWorkingDay : true;

      hydrateFromBootstrap({
        currentStatus: result.currentStatus,
        todaySummary: result.todaySummary,
        expectedDailyHours,
        hasActiveContract: hasActive,
        isWorkingDay: workingDay,
      });

      setTodaySchedule(result.schedule ?? null);
      const expectedMinutes = result.scheduleSummary ? result.scheduleSummary.expectedMinutes : null;
      const deviationMinutes = result.scheduleSummary ? result.scheduleSummary.deviationMinutes : null;
      setScheduleExpectedMinutes(expectedMinutes);
      setTodayDeviation(deviationMinutes);

      const geoEnabled = result.geolocationConfig ? result.geolocationConfig.geolocationEnabled : false;
      setGeolocationEnabled(geoEnabled);
      setCanClock(result.canClock !== false);
      setOrgContextMessage(result.orgContextMessage ?? null);

      if (result.incompleteEntry) {
        setHasIncompleteEntry(true);
        setIsExcessive(result.incompleteEntry.isExcessive ?? false);
        setIncompleteEntryInfo({
          date: result.incompleteEntry.clockInDate,
          lastEntryTime: result.incompleteEntry.clockInTime,
          durationHours: result.incompleteEntry.durationHours,
          durationMinutes: result.incompleteEntry.durationMinutes,
          dailyHours: result.incompleteEntry.dailyHours,
          percentageOfJourney: result.incompleteEntry.percentageOfJourney,
          clockInId: result.incompleteEntry.clockInId,
        });
      } else {
        setHasIncompleteEntry(false);
        setIsExcessive(false);
        setIncompleteEntryInfo(null);
      }
    },
    [hydrateFromBootstrap],
  );

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsScheduleLoading(true);

    try {
      const result = await getClockBootstrap();
      if (!isMountedRef.current) return;

      if (!isBootstrapReady(result)) {
        setError(result.error ?? "Error al cargar datos de fichaje");
        return;
      }

      applyBootstrapResult(result);
    } catch (err) {
      console.error("Error al cargar bootstrap de fichaje:", err);
      setError(err instanceof Error ? err.message : "Error al cargar fichaje");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsScheduleLoading(false);
      }
    }
  }, [applyBootstrapResult, setError, setLoading]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

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
    if (isLoading || isScheduleLoading) return;

    const handleFocus = () => updateChartSnapshot();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") updateChartSnapshot();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    updateChartSnapshot();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoading, isScheduleLoading, updateChartSnapshot]);

  const handleManualProjectSelection = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (!projectId) setProjectTask("");
  }, []);

  const executeWithGeolocation = async <T,>(
    action: (latitude?: number, longitude?: number, accuracy?: number, projectId?: string, task?: string) => Promise<T>,
    projectId?: string | null,
    task?: string,
  ): Promise<T | undefined> => {
    if (!canClock) return;

    if (!geolocationEnabled) {
      return await action(undefined, undefined, undefined, projectId ?? undefined, task);
    }

    try {
      const { hasConsent } = await checkGeolocationConsent();

      if (!hasConsent) {
        setPendingAction({ action, projectId: projectId ?? null, task });
        setShowConsentDialog(true);
        return;
      }

      const locationData = await geolocation.getCurrentPosition();

      if (!locationData) {
        console.warn("Ubicación no disponible:", geolocation.error);
        if (geolocation.error?.includes("denegado") || geolocation.error?.includes("PERMISSION_DENIED")) {
          toast.warning("GPS no disponible", {
            description: "Safari en localhost no permite geolocalización. Fichaje registrado sin GPS.",
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

      if (locationData.accuracy > 100) {
        toast.info("Precisión GPS baja", {
          description: `La precisión es de ${Math.round(locationData.accuracy)}m.`,
          duration: 4000,
        });
      }

      return await action(
        locationData.latitude,
        locationData.longitude,
        locationData.accuracy,
        projectId ?? undefined,
        task,
      );
    } catch (err) {
      console.error("Error en proceso de geolocalización:", err);
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
      setSelectedProjectId(null);
      setProjectTask("");

      if (result?.alerts && result.alerts.length > 0) {
        result.alerts.forEach((alert: { severity: string; title: string; description: string }) => {
          const toastFn =
            alert.severity === "CRITICAL" ? toast.error : alert.severity === "WARNING" ? toast.warning : toast.info;
          toastFn(alert.title, { description: alert.description, duration: 8000 });
        });
      }
    } catch (err) {
      console.error("Error en handleClockIn:", err);
    }
  };

  const handleClockOut = async () => {
    if (isExcessive && incompleteEntryInfo) {
      setShowExcessiveDialog(true);
      return;
    }
    await executeWithGeolocation(clockOutAction);
  };

  const handleConfirmCloseExcessive = async () => {
    if (!incompleteEntryInfo) return;

    try {
      const geoData =
        geolocationEnabled && geolocation.location
          ? {
              latitude: geolocation.location.latitude,
              longitude: geolocation.location.longitude,
              accuracy: geolocation.location.accuracy,
            }
          : {};

      await clockOut(geoData.latitude, geoData.longitude, geoData.accuracy, true, {
        reason: "EXCESSIVE_DURATION",
        originalDurationHours: incompleteEntryInfo.durationHours,
        clockInId: incompleteEntryInfo.clockInId,
        notes: `Fichaje cancelado por larga duración (${incompleteEntryInfo.percentageOfJourney.toFixed(0)}% de jornada)`,
      });

      toast.success("Fichaje cerrado y cancelado correctamente");
      setShowExcessiveDialog(false);
      await loadBootstrap();
    } catch (err) {
      console.error("Error al cerrar fichaje excesivo:", err);
      toast.error("Error al cerrar fichaje");
    }
  };

  const handleGoToRegularize = () => {
    setShowExcessiveDialog(false);
    router.push("/dashboard/me/clock/requests");
  };

  const handleDismissIncompleteEntry = async () => {
    if (!incompleteEntryInfo?.clockInId) return;
    try {
      await dismissNotification("INCOMPLETE_ENTRY", incompleteEntryInfo.clockInId);
      setHasIncompleteEntry(false);
      setIncompleteEntryInfo(null);
    } catch (err) {
      console.error("Error al descartar notificación:", err);
    }
  };

  const handleBreak = async () => {
    if (currentStatus === "ON_BREAK") {
      await executeWithGeolocation(endBreakAction);
    } else {
      await executeWithGeolocation(startBreakAction);
    }
  };

  // Calculations
  const effectiveExpectedMinutes = scheduleExpectedMinutes ?? 0;
  const remainingMinutes = Math.max(0, effectiveExpectedMinutes - liveWorkedMinutes);
  const scheduleIsWorkingDay = todaySchedule?.isWorkingDay;
  const uiIsWorkingDay = scheduleIsWorkingDay ?? isWorkingDay;
  const isCompleted = effectiveExpectedMinutes > 0 && liveWorkedMinutes >= effectiveExpectedMinutes;
  const workedTime = formatTimeWithSeconds(liveWorkedMinutes);
  const remainingTime = formatTimeWithSeconds(remainingMinutes);
  const progressPercentage =
    effectiveExpectedMinutes > 0 ? Math.min(Math.round((liveWorkedMinutes / effectiveExpectedMinutes) * 100), 100) : 0;
  const entriesWithGPS = todaySummary?.timeEntries?.filter((e) => e.latitude && e.longitude).length ?? 0;

  // Chart configuration
  const chartWorkedMinutes = chartSnapshot?.workedMinutes ?? liveWorkedMinutes;
  const chartBreakMinutes = chartSnapshot?.breakMinutes ?? todaySummary?.totalBreakMinutes ?? 0;
  const chartTotalMinutes = effectiveExpectedMinutes;
  const chartRemainingMinutes = Math.max(0, chartTotalMinutes - chartWorkedMinutes);
  const chartProgressPercentage =
    chartTotalMinutes > 0 ? Math.round((chartWorkedMinutes / chartTotalMinutes) * 100) : 0;

  const chartConfig = {
    worked: { label: "Trabajado", color: "var(--chart-1)" },
    breaks: { label: "Pausas", color: "var(--chart-2)" },
    remaining: { label: "Restante", color: "#e5e7eb" },
  } satisfies ChartConfig;

  const chartData =
    chartTotalMinutes > 0
      ? chartWorkedMinutes > chartTotalMinutes
        ? [{ name: "worked", value: chartWorkedMinutes, fill: "var(--color-worked)" }]
        : [
            { name: "worked", value: chartWorkedMinutes, fill: "var(--color-worked)" },
            { name: "breaks", value: chartBreakMinutes, fill: "var(--color-breaks)" },
            { name: "remaining", value: chartRemainingMinutes, fill: "var(--color-remaining)" },
          ]
      : [
          { name: "worked", value: chartWorkedMinutes > 0 ? chartWorkedMinutes : 0, fill: "var(--color-worked)" },
          { name: "remaining", value: chartWorkedMinutes > 0 ? 0 : 1, fill: "var(--color-remaining)" },
        ];

  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    if (!hasAnimated && chartWorkedMinutes > 0) {
      const timer = setTimeout(() => setHasAnimated(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated, chartWorkedMinutes]);

  const statusConfig = getStatusConfig(currentStatus);

  const memoizedChart = useMemo(
    () => (
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
        <PieChart key="progress-chart">
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={70}
            strokeWidth={4}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
            isAnimationActive={!hasAnimated || shouldAnimateChart}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) - 6}
                        className="fill-foreground text-2xl font-bold tracking-tight"
                      >
                        {chartProgressPercentage}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 14}
                        className="fill-muted-foreground text-[10px] font-medium tracking-wide uppercase"
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
    [
      Math.floor(chartWorkedMinutes),
      chartBreakMinutes,
      chartProgressPercentage,
      chartTotalMinutes,
      shouldAnimateChart,
      hasAnimated,
    ],
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Fichaje</h1>
          <p className="text-muted-foreground text-sm">Gestiona tu jornada laboral</p>
        </div>
        <Link href="/dashboard/me/clock/requests">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-orange-200 bg-orange-50/50 text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400"
          >
            <Clock className="size-3.5" />
            <span>¿Olvidaste fichar?</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* Geolocation consent dialog */}
      <GeolocationConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConsentGiven={async () => {
          setShowConsentDialog(false);
          if (pendingAction) {
            await executeWithGeolocation(pendingAction.action, pendingAction.projectId, pendingAction.task);
            setPendingAction(null);
          }
        }}
        onConsentDenied={() => {
          setShowConsentDialog(false);
          setPendingAction(null);
        }}
      />

      {/* Alerts */}
      {!canClock && orgContextMessage && (
        <Alert className="border-orange-500 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/30">
          <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-800 dark:text-orange-300">Acceso restringido</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-400">{orgContextMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-destructive text-sm">{error}</p>
        </Card>
      )}

      {hasIncompleteEntry && incompleteEntryInfo && (
        <Alert className="border-orange-500 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/30">
          <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-800 dark:text-orange-300">Fichaje Pendiente</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            <div className="flex flex-col gap-2">
              <p>
                Entrada sin cerrar desde el{" "}
                <strong>{new Date(incompleteEntryInfo.lastEntryTime).toLocaleString("es-ES")}</strong>
              </p>
              <Link href="/dashboard/me/clock/requests" onClick={handleDismissIncompleteEntry}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-orange-300 bg-orange-100 text-orange-800 hover:bg-orange-200 dark:border-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                >
                  <Clock className="size-3.5" />
                  Resolver
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!hasActiveContract && (
        <Card className="border-amber-500/50 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-500/10 p-1.5">
              <AlertTriangle className="size-4 text-amber-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Sin contrato activo</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Usando horario asignado:{" "}
                <span className="font-semibold">{(effectiveExpectedMinutes / 60).toFixed(1)}h diarias</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clock Card - Hero */}
        <Card
          className={cn(
            "relative overflow-hidden border-2 transition-all duration-300",
            statusConfig.border,
            `bg-gradient-to-br ${statusConfig.gradient}`,
          )}
        >
          {/* Decorative elements */}
          <div className="from-primary/5 to-primary/10 pointer-events-none absolute -top-20 -right-20 size-40 rounded-full bg-gradient-to-br blur-3xl" />

          <CardContent className="relative space-y-6 p-6 md:p-8">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5", statusConfig.bg)}>
                <span className={cn("size-2 animate-pulse rounded-full", statusConfig.pulse)} />
                <span className={cn("text-sm font-semibold", statusConfig.color)}>{statusConfig.label}</span>
              </div>
              <p className="text-muted-foreground text-sm">
                {currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}
              </p>
            </div>

            {/* Time display */}
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground text-sm font-medium">Tiempo trabajado</p>
              {isLoading || isScheduleLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="text-primary size-8 animate-spin" />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 font-mono">
                  <span className="text-5xl font-bold tracking-tight tabular-nums md:text-6xl">{workedTime.hours}</span>
                  <span className="text-muted-foreground text-3xl font-bold">:</span>
                  <span className="text-5xl font-bold tracking-tight tabular-nums md:text-6xl">
                    {workedTime.minutes}
                  </span>
                  <span className="text-muted-foreground text-3xl font-bold">:</span>
                  <span className="text-muted-foreground text-3xl font-bold tabular-nums">{workedTime.seconds}</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {effectiveExpectedMinutes > 0 && !isLoading && !isScheduleLoading && (
              <div className="space-y-2">
                <Progress
                  value={progressPercentage}
                  className="h-2"
                  indicatorClassName={isCompleted ? "bg-emerald-500" : "bg-primary"}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="size-3" />
                        Jornada completada
                      </span>
                    ) : (
                      `Restante: ${remainingTime.hours}h ${remainingTime.minutes}m`
                    )}
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-primary",
                    )}
                  >
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            )}

            {/* Status alerts */}
            {!isLoading && !isScheduleLoading && (
              <>
                {todaySchedule?.source === "ABSENCE" && (
                  <Alert className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/30">
                    <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
                    <AlertTitle className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                      Ausencia: {todaySchedule.absence?.type ?? "Registrada"}
                    </AlertTitle>
                  </Alert>
                )}
                {!uiIsWorkingDay && todaySchedule?.source !== "ABSENCE" && (
                  <Alert className="border-muted bg-muted/50">
                    <Info className="text-muted-foreground size-4" />
                    <AlertTitle className="text-sm font-medium">Día no laborable</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-xs">
                      Los fichajes se registran como tiempo extra.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <AnimatePresence mode="wait" initial={false}>
                {currentStatus === "CLOCKED_OUT" ? (
                  <motion.div
                    key="clocked-out"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <ProjectSelector
                      selectedProjectId={selectedProjectId}
                      onSelectProject={handleManualProjectSelection}
                      task={projectTask}
                      onTaskChange={setProjectTask}
                      disabled={!canClock || isLoading || isClocking || isScheduleLoading}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="lg"
                            onClick={handleClockIn}
                            className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                            disabled={!canClock || isLoading || isClocking || isScheduleLoading}
                          >
                            {isLoading || isClocking || isScheduleLoading ? (
                              <Loader2 className="size-5 animate-spin" />
                            ) : (
                              <LogIn className="size-5" />
                            )}
                            Fichar Entrada
                          </Button>
                        </TooltipTrigger>
                        {!uiIsWorkingDay && (
                          <TooltipContent>Día no laborable - se registrará como extra</TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </motion.div>
                ) : (
                  <motion.div
                    key="clocked-in"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <Button
                      size="lg"
                      onClick={handleClockOut}
                      variant="destructive"
                      className={cn("w-full gap-2", isExcessive && "ring-2 ring-orange-500")}
                      disabled={!canClock || isLoading || isClocking || isScheduleLoading}
                    >
                      {isLoading || isClocking || isScheduleLoading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <LogOut className="size-5" />
                      )}
                      Fichar Salida
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleBreak}
                      variant="outline"
                      className={cn(
                        "w-full gap-2",
                        currentStatus === "ON_BREAK" &&
                          "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30",
                      )}
                      disabled={!canClock || isLoading || isClocking || isScheduleLoading}
                    >
                      {isLoading || isClocking || isScheduleLoading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Coffee className="size-5" />
                      )}
                      {currentStatus === "ON_BREAK" ? "Volver del descanso" : "Iniciar descanso"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="relative">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Resumen del día</CardTitle>
              {todayDeviation !== null && todayDeviation !== 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    todayDeviation > 0
                      ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
                      : "border-red-200 text-red-700 dark:border-red-900 dark:text-red-400",
                  )}
                >
                  {todayDeviation > 0 ? "+" : ""}
                  {formatDuration(Math.round(Math.abs(todayDeviation)))}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || isScheduleLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : (
              <>
                {memoizedChart}

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground text-xs">Entrada</span>
                    </div>
                    <p className="font-mono text-sm font-semibold">
                      {todaySummary?.clockIn
                        ? new Date(todaySummary.clockIn).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </p>
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="size-2 rounded-full bg-amber-500" />
                      <span className="text-muted-foreground text-xs">Pausas</span>
                    </div>
                    <p className="font-mono text-sm font-semibold">
                      {todaySummary ? formatMinutesToDisplay(todaySummary.totalBreakMinutes) : "0h 0m"}
                    </p>
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="size-2 rounded-full bg-red-500" />
                      <span className="text-muted-foreground text-xs">Salida</span>
                    </div>
                    <p className="font-mono text-sm font-semibold">
                      {todaySummary?.clockOut
                        ? new Date(todaySummary.clockOut).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily info bar */}
      <MinifiedDailyInfo schedule={todaySchedule} isLoading={isScheduleLoading} />

      {/* Today's entries */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Fichajes de hoy</CardTitle>
            <a
              href="https://www.notion.so/Fichajes-9d46b3bc551e436aa7bb30e79b2ec331"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              <HelpCircle className="size-3.5" />
              <span className="hidden sm:inline">Ayuda</span>
            </a>
          </div>

          {entriesWithGPS > 0 && !isLoading && (
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                className="h-7 gap-1.5 px-2.5 text-xs"
              >
                <List className="size-3.5" />
                Lista
              </Button>
              <Button
                size="sm"
                variant={viewMode === "map" ? "default" : "ghost"}
                onClick={() => setViewMode("map")}
                className="h-7 gap-1.5 px-2.5 text-xs"
              >
                <Map className="size-3.5" />
                Mapa
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                  <div className="bg-muted size-10 animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-16 animate-pulse rounded" />
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-muted mb-3 rounded-full p-3">
                <Timer className="text-muted-foreground size-6" />
              </div>
              <p className="text-sm font-medium">Sin fichajes hoy</p>
              <p className="text-muted-foreground mt-1 text-xs">Pulsa &quot;Fichar Entrada&quot; para comenzar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excessive time dialog */}
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
