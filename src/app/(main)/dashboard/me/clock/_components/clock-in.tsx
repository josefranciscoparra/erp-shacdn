"use client";

import { useState } from "react";
import { Clock, LogIn, LogOut, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/hr/section-header";

type ClockStatus = "clocked-out" | "clocked-in" | "on-break";

export function ClockIn() {
  const [status, setStatus] = useState<ClockStatus>("clocked-out");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar hora cada segundo
  useState(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  });

  const handleClockIn = () => {
    setStatus("clocked-in");
    // TODO: Llamar API para registrar entrada
  };

  const handleClockOut = () => {
    setStatus("clocked-out");
    // TODO: Llamar API para registrar salida
  };

  const handleBreak = () => {
    setStatus(status === "on-break" ? "clocked-in" : "on-break");
    // TODO: Llamar API para registrar pausa
  };

  const getStatusBadge = () => {
    switch (status) {
      case "clocked-in":
        return <Badge className="bg-green-500">Trabajando</Badge>;
      case "on-break":
        return <Badge className="bg-yellow-500">En pausa</Badge>;
      case "clocked-out":
        return <Badge variant="secondary">Fuera de servicio</Badge>;
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Fichar" />

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
            {status === "clocked-out" ? (
              <Button size="lg" onClick={handleClockIn} className="w-full">
                <LogIn className="mr-2 h-5 w-5" />
                Fichar Entrada
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={handleClockOut} variant="destructive" className="w-full">
                  <LogOut className="mr-2 h-5 w-5" />
                  Fichar Salida
                </Button>
                <Button size="lg" onClick={handleBreak} variant="outline" className="w-full">
                  <Coffee className="mr-2 h-5 w-5" />
                  {status === "on-break" ? "Volver del descanso" : "Iniciar descanso"}
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
              <span className="font-semibold tabular-nums">09:00:00</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Salida prevista</span>
              <span className="font-semibold tabular-nums">18:00:00</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Tiempo trabajado</span>
              <span className="font-semibold tabular-nums">5h 32m</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Pausas totales</span>
              <span className="font-semibold tabular-nums">0h 15m</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Historial reciente */}
      <Card className="@container/card flex flex-col gap-4 p-6">
        <h3 className="text-lg font-semibold">Últimos fichajes</h3>

        <div className="flex flex-col gap-2">
          {[
            { date: "Lunes, 29 Ene 2025", entry: "09:05", exit: "18:10", total: "8h 50m" },
            { date: "Martes, 28 Ene 2025", entry: "08:58", exit: "17:55", total: "8h 42m" },
            { date: "Miércoles, 27 Ene 2025", entry: "09:02", exit: "18:05", total: "8h 48m" },
          ].map((day, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{day.date}</span>
                <span className="text-xs text-muted-foreground">
                  Entrada: {day.entry} • Salida: {day.exit}
                </span>
              </div>
              <span className="font-semibold tabular-nums">{day.total}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
