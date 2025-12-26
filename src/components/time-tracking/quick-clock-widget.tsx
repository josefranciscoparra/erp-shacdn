"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Coffee, Loader2, Building2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { GeolocationConsentDialog } from "@/components/geolocation/geolocation-consent-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGeolocation } from "@/hooks/use-geolocation";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { dismissNotification, isNotificationDismissed } from "@/server/actions/dismissed-notifications";
import { checkGeolocationConsent, getOrganizationGeolocationConfig } from "@/server/actions/geolocation";
import { checkEmployeeOrgContext } from "@/server/actions/shared/get-authenticated-employee";
import { detectIncompleteEntries } from "@/server/actions/time-tracking";
import { useTimeTrackingStore } from "@/stores/time-tracking-store";

export function QuickClockWidget() {
  const { data: session, status } = useSession();
  const { hasEmployeeProfile } = usePermissions();

  const employeeOrgId = session?.user?.employeeOrgId ?? null;
  const activeOrgId = session?.user?.orgId ?? null;
  const canClock = hasEmployeeProfile() && Boolean(employeeOrgId && activeOrgId && employeeOrgId === activeOrgId);

  const {
    currentStatus,
    todaySummary,
    liveWorkedMinutes,
    isClocking,
    isLoading,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    setLiveWorkedMinutes,
    loadInitialData,
  } = useTimeTrackingStore();

  // Ref para evitar cargas duplicadas
  const hasLoadedRef = useRef(false);

  const [isInitialMount, setIsInitialMount] = useState(true);
  const [shouldRenderSkeleton, setShouldRenderSkeleton] = useState(
    () => isLoading || isInitialMount || (todaySummary === null && canClock),
  );

  // Contexto multiempresa
  const [isInOwnOrg, setIsInOwnOrg] = useState(true);
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  // Estados de geolocalización
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    // eslint-disable-next-line func-call-spacing
    action: (latitude?: number, longitude?: number, accuracy?: number) => Promise<void>;
  } | null>(null);
  const geolocation = useGeolocation();

  // Estado para fichajes incompletos
  const [hasIncompleteEntry, setHasIncompleteEntry] = useState(false);
  const [isExcessive, setIsExcessive] = useState(false);
  const [incompleteEntryInfo, setIncompleteEntryInfo] = useState<{
    date: Date;
    lastEntryTime: Date;
    durationHours: number;
    percentageOfJourney: number;
    clockInId: string;
  } | null>(null);

  // Cargar estado inicial y configuración de geolocalización (solo una vez)
  useEffect(() => {
    // Evitar múltiples cargas
    if (hasLoadedRef.current) {
      return;
    }

    const load = async () => {
      hasLoadedRef.current = true;

      try {
        // Verificar contexto de organización (multi-empresa)
        setContextLoading(true);
        try {
          const orgContext = await checkEmployeeOrgContext();
          setIsInOwnOrg(orgContext.canClock);
          setContextMessage(orgContext.message ?? null);
        } catch (error) {
          console.error("Error al verificar contexto de organización:", error);
          setIsInOwnOrg(false);
          setContextMessage("No se pudo verificar tu organización. Intenta recargar.");
        } finally {
          setContextLoading(false);
        }

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
                percentageOfJourney: incompleteData.percentageOfJourney,
                clockInId: incompleteData.clockInId,
              });
            }
          }
        } catch (error) {
          console.error("Error al detectar fichajes incompletos:", error);
        }
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
      } finally {
        // Siempre marcar como montado, incluso si hay errores
        setIsInitialMount(false);
      }
    };
    load();
  }, [loadInitialData]);

  useEffect(() => {
    if (!isInitialMount) {
      setShouldRenderSkeleton(false);
    }
  }, [isInitialMount]);

  // Actualizar contador en vivo cada segundo
  useEffect(() => {
    const updateLiveMinutes = () => {
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
          return;
        }
      }

      setLiveWorkedMinutes(todaySummary?.totalWorkedMinutes ?? 0);
    };

    updateLiveMinutes();
    const interval = setInterval(updateLiveMinutes, 1000);
    return () => clearInterval(interval);
  }, [currentStatus, todaySummary, setLiveWorkedMinutes]);

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
        setPendingAction({ action });
        setShowConsentDialog(true);
        return;
      }

      // Capturar ubicación
      const locationData = await geolocation.getCurrentPosition();

      if (!locationData) {
        // Error al capturar GPS, pero permitir fichar sin ubicación
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
        toast.info("Precisión GPS baja", {
          description: `La precisión es de ${Math.round(locationData.accuracy)}m. Se recomienda estar al aire libre.`,
          duration: 4000,
        });
      }

      // Fichar con geolocalización - pasar parámetros individuales
      await action(locationData.latitude, locationData.longitude, locationData.accuracy);
    } catch (error) {
      console.error("Error al capturar GPS:", error);
      toast.error("Error al capturar GPS", {
        description: "Fichaje registrado sin geolocalización.",
        duration: 4000,
      });
      // Intentar fichar sin geolocalización
      await action();
    }
  };

  // Handlers de fichaje con geolocalización
  const handleClockIn = async () => {
    await executeWithGeolocation(clockIn);
  };

  const handleClockOut = async () => {
    await executeWithGeolocation(clockOut);
  };

  const handleBreak = async () => {
    if (currentStatus === "ON_BREAK") {
      await executeWithGeolocation(endBreak);
    } else {
      await executeWithGeolocation(startBreak);
    }
  };

  // Handler cuando se da consentimiento
  const handleConsentGiven = async () => {
    setShowConsentDialog(false);

    // Ejecutar la acción pendiente
    if (pendingAction) {
      await executeWithGeolocation(pendingAction.action);
      setPendingAction(null);
    }
  };

  // Handler cuando se niega el consentimiento
  const handleConsentDenied = () => {
    setShowConsentDialog(false);
    setPendingAction(null);
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

  const formatTime = (totalMinutes: number) => {
    const totalSeconds = Math.max(0, Math.round(totalMinutes * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  };

  const tooltipMessage = "Solo los empleados pueden fichar";

  if (status === "loading") {
    return null;
  }

  // Mostrar skeleton mientras se cargan los datos iniciales o si es el primer montaje
  // Para usuarios sin empleado (super admins), no mostrar skeleton aunque todaySummary sea null
  if (shouldRenderSkeleton && (isLoading || isInitialMount || (todaySummary === null && canClock))) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    );
  }

  if (!isInOwnOrg || contextLoading || !canClock) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Badge variant="outline" className="text-muted-foreground">
          <Building2 className="mr-1.5 h-3 w-3" />
          {contextMessage ?? "Debes estar en tu empresa para fichar"}
        </Badge>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-muted-foreground text-sm font-medium tabular-nums">{formatTime(liveWorkedMinutes)}</span>

        <AnimatePresence mode="wait" initial={false}>
          {currentStatus === "CLOCKED_OUT" && (
            <motion.div
              key="clocked-out"
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex items-center gap-1.5"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={handleClockIn}
                      disabled={isClocking || !canClock || geolocation.loading}
                      className="rounded-full bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {geolocation.loading || isClocking ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogIn className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Entrar
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canClock && <TooltipContent>{tooltipMessage}</TooltipContent>}
              </Tooltip>

              {/* Indicador de fichaje incompleto */}
              {hasIncompleteEntry && incompleteEntryInfo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/dashboard/me/clock/requests" onClick={handleDismissIncompleteEntry}>
                      <div className="flex h-6 w-6 animate-pulse cursor-pointer items-center justify-center rounded-full bg-orange-500 text-white shadow-sm hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700">
                        <span className="text-xs font-bold">!</span>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    className="bg-card max-w-xs border p-0 shadow-lg"
                    sideOffset={8}
                    hideArrow={true}
                    align="end"
                    alignOffset={-80}
                  >
                    <Link
                      href="/dashboard/me/clock/requests"
                      onClick={handleDismissIncompleteEntry}
                      className="hover:bg-accent block cursor-pointer p-4 transition-colors"
                    >
                      <div className="space-y-2">
                        <p className="text-foreground text-sm font-semibold">Fichaje pendiente de cerrar</p>
                        <p className="text-muted-foreground text-xs">
                          Olvidaste fichar salida el{" "}
                          {new Date(incompleteEntryInfo.lastEntryTime).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                          })}{" "}
                          a las{" "}
                          {new Date(incompleteEntryInfo.lastEntryTime).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Haz click para crear una solicitud de regularización.
                        </p>
                      </div>
                    </Link>
                  </TooltipContent>
                </Tooltip>
              )}
            </motion.div>
          )}

          {currentStatus === "CLOCKED_IN" && (
            <motion.div
              key="clocked-in"
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex items-center gap-2"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={handleClockOut}
                      disabled={isClocking || !canClock || geolocation.loading}
                      variant="destructive"
                      className={cn(
                        "rounded-full disabled:cursor-not-allowed disabled:opacity-70",
                        isExcessive && "border-2 border-orange-500 ring-2 ring-orange-200",
                      )}
                    >
                      {geolocation.loading || isClocking ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Salir
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canClock && <TooltipContent>{tooltipMessage}</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={handleBreak}
                      disabled={isClocking || !canClock || geolocation.loading}
                      variant="outline"
                      className="rounded-full disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {geolocation.loading || isClocking ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Coffee className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Pausa
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canClock && <TooltipContent>{tooltipMessage}</TooltipContent>}
              </Tooltip>
            </motion.div>
          )}

          {currentStatus === "ON_BREAK" && (
            <motion.div
              key="on-break"
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={handleBreak}
                      disabled={isClocking || !canClock || geolocation.loading}
                      className="rounded-full bg-yellow-600 hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {geolocation.loading || isClocking ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Coffee className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Volver
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canClock && <TooltipContent>{tooltipMessage}</TooltipContent>}
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialog de consentimiento de geolocalización */}
      <GeolocationConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConsentGiven={handleConsentGiven}
        onConsentDenied={handleConsentDenied}
      />
    </TooltipProvider>
  );
}
