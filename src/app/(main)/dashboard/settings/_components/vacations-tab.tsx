"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarCheck, CalendarClock, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrganizationPtoConfig, updateOrganizationPtoConfig } from "@/server/actions/admin-pto";

type CarryoverMode = "NONE" | "UNTIL_DATE" | "UNLIMITED";

const monthOptions = [
  { value: 1, label: "enero" },
  { value: 2, label: "febrero" },
  { value: 3, label: "marzo" },
  { value: 4, label: "abril" },
  { value: 5, label: "mayo" },
  { value: 6, label: "junio" },
  { value: 7, label: "julio" },
  { value: 8, label: "agosto" },
  { value: 9, label: "septiembre" },
  { value: 10, label: "octubre" },
  { value: 11, label: "noviembre" },
  { value: 12, label: "diciembre" },
];

const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

export function VacationsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<CarryoverMode>("NONE");
  const [usageDeadlineMonth, setUsageDeadlineMonth] = useState(1);
  const [usageDeadlineDay, setUsageDeadlineDay] = useState(29);
  const [requestDeadlineMonth, setRequestDeadlineMonth] = useState(1);
  const [requestDeadlineDay, setRequestDeadlineDay] = useState(29);
  const [initialConfig, setInitialConfig] = useState({
    mode: "NONE" as CarryoverMode,
    usageDeadlineMonth: 1,
    usageDeadlineDay: 29,
    requestDeadlineMonth: 1,
    requestDeadlineDay: 29,
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const config = await getOrganizationPtoConfig();
        const nextMode = (config.carryoverMode ?? "NONE") as CarryoverMode;
        const nextUsageDeadlineMonth = Number(config.carryoverDeadlineMonth ?? 1);
        const nextUsageDeadlineDay = Number(config.carryoverDeadlineDay ?? 29);
        const nextRequestDeadlineMonth = Number(config.carryoverRequestDeadlineMonth ?? nextUsageDeadlineMonth);
        const nextRequestDeadlineDay = Number(config.carryoverRequestDeadlineDay ?? nextUsageDeadlineDay);

        setMode(nextMode);
        setUsageDeadlineMonth(nextUsageDeadlineMonth);
        setUsageDeadlineDay(nextUsageDeadlineDay);
        setRequestDeadlineMonth(nextRequestDeadlineMonth);
        setRequestDeadlineDay(nextRequestDeadlineDay);
        setInitialConfig({
          mode: nextMode,
          usageDeadlineMonth: nextUsageDeadlineMonth,
          usageDeadlineDay: nextUsageDeadlineDay,
          requestDeadlineMonth: nextRequestDeadlineMonth,
          requestDeadlineDay: nextRequestDeadlineDay,
        });
      } catch (error) {
        console.error("Error loading PTO config:", error);
        toast.error("Error al cargar la configuración de vacaciones");
      } finally {
        setIsLoading(false);
      }
    };

    void loadConfig();
  }, []);

  const hasChanges =
    mode !== initialConfig.mode ||
    usageDeadlineMonth !== initialConfig.usageDeadlineMonth ||
    usageDeadlineDay !== initialConfig.usageDeadlineDay ||
    requestDeadlineMonth !== initialConfig.requestDeadlineMonth ||
    requestDeadlineDay !== initialConfig.requestDeadlineDay;

  const usageDeadlineLabel = useMemo(() => {
    const monthLabel = monthOptions.find((month) => month.value === usageDeadlineMonth)?.label ?? "enero";
    return `${usageDeadlineDay} de ${monthLabel}`;
  }, [usageDeadlineDay, usageDeadlineMonth]);

  const requestDeadlineLabel = useMemo(() => {
    const monthLabel = monthOptions.find((month) => month.value === requestDeadlineMonth)?.label ?? "enero";
    return `${requestDeadlineDay} de ${monthLabel}`;
  }, [requestDeadlineDay, requestDeadlineMonth]);

  const policyDescription = useMemo(() => {
    const nextYear = new Date().getFullYear() + 1;

    if (mode === "UNLIMITED") {
      return "Las vacaciones no usadas se acumulan indefinidamente.";
    }

    if (mode === "UNTIL_DATE") {
      return `Puedes solicitar hasta el ${requestDeadlineLabel} y disfrutarlas hasta el ${usageDeadlineLabel} de ${nextYear}.`;
    }

    return "Las vacaciones no usadas caducan al cierre del año natural.";
  }, [requestDeadlineLabel, usageDeadlineLabel, mode]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateOrganizationPtoConfig({
        carryoverMode: mode,
        carryoverDeadlineMonth: usageDeadlineMonth,
        carryoverDeadlineDay: usageDeadlineDay,
        carryoverRequestDeadlineMonth: requestDeadlineMonth,
        carryoverRequestDeadlineDay: requestDeadlineDay,
      });
      setInitialConfig({
        mode,
        usageDeadlineMonth,
        usageDeadlineDay,
        requestDeadlineMonth,
        requestDeadlineDay,
      });
      toast.success("Configuración de vacaciones actualizada");
    } catch (error) {
      console.error("Error updating PTO config:", error);
      toast.error("No se pudo guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            <div className="flex-1">
              <h3 className="font-semibold">Política de vacaciones</h3>
              <p className="text-muted-foreground text-sm">Configura la acumulación de días no usados</p>
            </div>
          </div>
          <div className="grid gap-4 @xl/main:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Política de vacaciones</h3>
              <p className="text-muted-foreground text-sm">
                Define cómo se gestionan las vacaciones no usadas al cambiar de año
              </p>
            </div>
          </div>

          <div className="grid gap-4 @xl/main:grid-cols-2">
            <div className="space-y-2">
              <Label>Modo de acumulación</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as CarryoverMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin acumulación</SelectItem>
                  <SelectItem value="UNTIL_DATE">Acumular hasta fecha límite</SelectItem>
                  <SelectItem value="UNLIMITED">Acumulación indefinida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Fecha límite para solicitar</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={requestDeadlineMonth.toString()}
                  onValueChange={(value) => setRequestDeadlineMonth(Number(value))}
                  disabled={mode !== "UNTIL_DATE"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={requestDeadlineDay.toString()}
                  onValueChange={(value) => setRequestDeadlineDay(Number(value))}
                  disabled={mode !== "UNTIL_DATE"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Día" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Label>Fecha límite para disfrutar</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={usageDeadlineMonth.toString()}
                  onValueChange={(value) => setUsageDeadlineMonth(Number(value))}
                  disabled={mode !== "UNTIL_DATE"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={usageDeadlineDay.toString()}
                  onValueChange={(value) => setUsageDeadlineDay(Number(value))}
                  disabled={mode !== "UNTIL_DATE"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Día" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className="bg-background mt-0.5 rounded-full p-2 shadow-sm">
                <Info className="text-muted-foreground h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Resumen de política</p>
                <p className="text-muted-foreground text-xs">{policyDescription}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
            {mode === "UNTIL_DATE" && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <CalendarClock className="h-3.5 w-3.5" />
                Solicitud: {requestDeadlineLabel} · Disfrute: {usageDeadlineLabel}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
