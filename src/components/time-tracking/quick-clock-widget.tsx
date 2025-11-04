"use client";

import { useEffect, useState } from "react";

import { LogIn, LogOut, Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermissions } from "@/hooks/use-permissions";
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

  // Cargar estado inicial
  useEffect(() => {
    const load = async () => {
      await loadInitialData();
      setIsInitialMount(false);
    };
    load();
  }, [loadInitialData]);

  // Actualizar contador en vivo cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
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
        }
      } else {
        setLiveWorkedMinutes(todaySummary?.totalWorkedMinutes ?? 0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStatus, todaySummary, setLiveWorkedMinutes]);

  const handleBreak = async () => {
    if (currentStatus === "ON_BREAK") {
      await endBreak();
    } else {
      await startBreak();
    }
  };

  const formatTime = (totalMinutes: number) => {
    const totalSeconds = Math.max(0, Math.round(totalMinutes * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  };

  const tooltipMessage = "Solo los empleados pueden fichar";

  // Mostrar skeleton mientras se cargan los datos iniciales
  if (isLoading) {
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
                  onClick={clockIn}
                  disabled={isClocking || !canClock}
                  className="rounded-full bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed"
                >
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Entrar
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
                    onClick={clockOut}
                    disabled={isClocking || !canClock}
                    variant="destructive"
                    className="rounded-full disabled:cursor-not-allowed"
                  >
                    <LogOut className="mr-1.5 h-3.5 w-3.5" />
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
                    disabled={isClocking || !canClock}
                    variant="outline"
                    className="rounded-full disabled:cursor-not-allowed"
                  >
                    <Coffee className="mr-1.5 h-3.5 w-3.5" />
                    Pausa
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
                  disabled={isClocking || !canClock}
                  className="rounded-full bg-yellow-600 hover:bg-yellow-700 disabled:cursor-not-allowed"
                >
                  <Coffee className="mr-1.5 h-3.5 w-3.5" />
                  Volver
                </Button>
              </span>
            </TooltipTrigger>
            {!canClock && <TooltipContent>{tooltipMessage}</TooltipContent>}
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
