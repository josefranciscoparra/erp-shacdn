"use client";

import { useEffect, useState } from "react";

import { LogIn, LogOut, Coffee, MapPin } from "lucide-react";
import { toast } from "sonner";

import { GeolocationConsentDialog } from "@/components/geolocation/geolocation-consent-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGeolocation } from "@/hooks/use-geolocation";
import { usePermissions } from "@/hooks/use-permissions";
import { checkGeolocationConsent, getOrganizationGeolocationConfig } from "@/server/actions/geolocation";
import { useTimeTrackingStore } from "@/stores/time-tracking-store";

export function QuickClockWidget() {
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
  const { hasEmployeeProfile } = usePermissions();
  const canClock = hasEmployeeProfile();
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Estados de geolocalización
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const geolocation = useGeolocation();

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

      setIsInitialMount(false);
    };
    load();
  }, [loadInitialData]);

  // Actualizar contador en vivo cada segundo
  useEffect(() => {
    const updateLiveMinutes = () => {
      if (currentStatus === "CLOCKED_IN" && todaySummary?.timeEntries) {
        const now = new Date();
        const entries = todaySummary.timeEntries;
        const lastWorkStart = [...entries]
          .reverse()
          .find((e) => e.entryType === "CLOCK_IN" || e.entryType === "BREAK_END");

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
      await executeWithGeolocation(pendingAction);
      setPendingAction(null);
    }
  };

  // Handler cuando se niega el consentimiento
  const handleConsentDenied = () => {
    setShowConsentDialog(false);
    setPendingAction(null);

    console.warn("Consentimiento de geolocalización denegado");
    // TODO: Mostrar mensaje al usuario cuando se implemente el sistema de toast
  };

  const formatTime = (totalMinutes: number) => {
    const totalSeconds = Math.max(0, Math.round(totalMinutes * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  };

  const tooltipMessage = "Solo los empleados pueden fichar";

  // Mostrar skeleton mientras se cargan los datos iniciales o si es el primer montaje
  if (isLoading || isInitialMount || todaySummary === null) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-muted-foreground text-sm font-medium tabular-nums">{formatTime(liveWorkedMinutes)}</span>

        {currentStatus === "CLOCKED_OUT" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  onClick={handleClockIn}
                  disabled={isClocking || !canClock || geolocation.loading}
                  className="rounded-full bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed"
                >
                  {geolocation.loading ? (
                    <MapPin className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                  ) : (
                    <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {geolocation.loading ? "Ubicando..." : "Entrar"}
                </Button>
              </span>
            </TooltipTrigger>
            {!canClock && <TooltipContent>{tooltipMessage}</TooltipContent>}
          </Tooltip>
        )}

        {currentStatus === "CLOCKED_IN" && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    onClick={handleClockOut}
                    disabled={isClocking || !canClock || geolocation.loading}
                    variant="destructive"
                    className="rounded-full disabled:cursor-not-allowed"
                  >
                    {geolocation.loading ? (
                      <MapPin className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                    ) : (
                      <LogOut className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {geolocation.loading ? "Ubicando..." : "Salir"}
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
                    className="rounded-full disabled:cursor-not-allowed"
                  >
                    {geolocation.loading ? (
                      <MapPin className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                    ) : (
                      <Coffee className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {geolocation.loading ? "Ubicando..." : "Pausa"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canClock && <TooltipContent>{tooltipMessage}</TooltipContent>}
            </Tooltip>
          </>
        )}

        {currentStatus === "ON_BREAK" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  onClick={handleBreak}
                  disabled={isClocking || !canClock || geolocation.loading}
                  className="rounded-full bg-yellow-600 hover:bg-yellow-700 disabled:cursor-not-allowed"
                >
                  {geolocation.loading ? (
                    <MapPin className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                  ) : (
                    <Coffee className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {geolocation.loading ? "Ubicando..." : "Volver"}
                </Button>
              </span>
            </TooltipTrigger>
            {!canClock && <TooltipContent>{tooltipMessage}</TooltipContent>}
          </Tooltip>
        )}
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
