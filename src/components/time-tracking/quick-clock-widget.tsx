"use client";

import { useState, useEffect } from "react";

import { LogIn, LogOut, Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export function QuickClockWidget() {
  const [currentStatus, setCurrentStatus] = useState<ClockStatus>("CLOCKED_OUT");
  const [todaySummary, setTodaySummary] = useState<WorkdaySummary | null>(null);
  const [isClocking, setIsClocking] = useState(false);
  const [liveWorkedMinutes, setLiveWorkedMinutes] = useState<number>(0);

  // Cargar estado inicial
  useEffect(() => {
    loadData();
  }, []);

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
          const baseMinutes = Number(todaySummary.totalWorkedMinutes) || 0;
          setLiveWorkedMinutes(baseMinutes + minutesFromStart);
        }
      } else {
        setLiveWorkedMinutes(todaySummary?.totalWorkedMinutes ?? 0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStatus, todaySummary]);

  const loadData = async () => {
    try {
      const [status, summary] = await Promise.all([getCurrentStatus(), getTodaySummary()]);
      setCurrentStatus(status.status);
      setTodaySummary(summary as any);
    } catch {
      // Silenciar errores en widget
    }
  };

  const handleClockIn = async () => {
    setIsClocking(true);
    try {
      await clockInAction();
      setCurrentStatus("CLOCKED_IN");
      await loadData();
    } catch {
      // Silenciar errores
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    setIsClocking(true);
    try {
      await clockOutAction();
      setCurrentStatus("CLOCKED_OUT");
      await loadData();
    } catch {
      // Silenciar errores
    } finally {
      setIsClocking(false);
    }
  };

  const handleBreak = async () => {
    setIsClocking(true);
    try {
      if (currentStatus === "ON_BREAK") {
        await endBreakAction();
        setCurrentStatus("CLOCKED_IN");
      } else {
        await startBreakAction();
        setCurrentStatus("ON_BREAK");
      }
      await loadData();
    } catch {
      // Silenciar errores
    } finally {
      setIsClocking(false);
    }
  };

  const formatTime = (totalMinutes: number) => {
    const totalSeconds = Math.max(0, Math.round(totalMinutes * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  };

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="text-muted-foreground text-sm font-medium tabular-nums">{formatTime(liveWorkedMinutes)}</span>

      {currentStatus === "CLOCKED_OUT" && (
        <Button
          size="sm"
          onClick={handleClockIn}
          disabled={isClocking}
          className="rounded-full bg-green-600 hover:bg-green-700"
        >
          <LogIn className="mr-1.5 h-3.5 w-3.5" />
          Entrar
        </Button>
      )}

      {currentStatus === "CLOCKED_IN" && (
        <>
          <Button
            size="sm"
            onClick={handleClockOut}
            disabled={isClocking}
            variant="destructive"
            className="rounded-full"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Salir
          </Button>
          <Button size="sm" onClick={handleBreak} disabled={isClocking} variant="outline" className="rounded-full">
            <Coffee className="mr-1.5 h-3.5 w-3.5" />
            Pausa
          </Button>
        </>
      )}

      {currentStatus === "ON_BREAK" && (
        <Button
          size="sm"
          onClick={handleBreak}
          disabled={isClocking}
          className="rounded-full bg-yellow-600 hover:bg-yellow-700"
        >
          <Coffee className="mr-1.5 h-3.5 w-3.5" />
          Volver
        </Button>
      )}
    </div>
  );
}
