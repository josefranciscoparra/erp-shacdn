"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { CalendarClock, TrendingUp, Users, Building2, Shield } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  updateOrganizationShiftsStatus,
  getShiftsStats,
  getOrganizationShiftsConfig,
  updateOrganizationShiftsConfig,
} from "@/server/actions/shifts";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

interface ShiftsStats {
  totalEmployees: number;
  employeesWithShifts: number;
  totalZones: number;
  usagePercentage: string;
}

export function ShiftsTab() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [shiftsEnabled, setShiftsEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [stats, setStats] = useState<ShiftsStats | null>(null);
  const [minRestHours, setMinRestHours] = useState(12);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const setOrgFeatures = useOrganizationFeaturesStore((state) => state.setFeatures);
  const updateShiftsFeature = (value: boolean) => {
    const current = useOrganizationFeaturesStore.getState().features;
    setOrgFeatures({ ...current, shiftsEnabled: value });
  };

  // Cargar configuración y estadísticas
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [config, statsData] = await Promise.all([getOrganizationShiftsConfig(), getShiftsStats()]);

        setShiftsEnabled(config.shiftsEnabled);
        setMinRestHours(config.shiftMinRestHours ?? 12);
        setStats(statsData);

        updateShiftsFeature(config.shiftsEnabled);
      } catch (error) {
        console.error("Error loading shifts data:", error);
        toast.error("Error al cargar la configuración de turnos");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleToggle = async (newValue: boolean) => {
    try {
      setIsUpdating(true);
      await updateOrganizationShiftsStatus(newValue);

      // Actualizar estado local y store de Zustand
      setShiftsEnabled(newValue);
      updateShiftsFeature(newValue);
      toast.success(newValue ? "Módulo de turnos activado" : "Módulo de turnos desactivado");

      // Usar router.refresh() para actualizar la navegación sin perder estado
      // Esto invalida el caché de Next.js y refresca los Server Components
      router.refresh();
    } catch (error) {
      console.error("[ShiftsTab] Error updating shifts status:", error);

      // Manejar errores específicos
      if (error instanceof Error) {
        if (error.message === "NO_PERMISSION") {
          toast.error("No tienes permisos para modificar esta configuración.");
        } else if (error.message === "NO_AUTH") {
          toast.error("No estás autenticado. Por favor, inicia sesión de nuevo.");
        } else if (error.message === "MODULE_DISABLED") {
          toast.error("El módulo de turnos no está disponible para esta organización.");
        } else {
          toast.error(`Error al actualizar la configuración: ${error.message}`);
        }
      } else {
        toast.error("Error desconocido al actualizar la configuración");
      }

      // Revertir el estado del switch si hubo error
      setShiftsEnabled(!newValue);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveRestHours = async () => {
    try {
      setIsSavingConfig(true);
      await updateOrganizationShiftsConfig({ shiftMinRestHours: minRestHours });
      toast.success("Configuración de descanso actualizada");
    } catch (error) {
      console.error("[ShiftsTab] Error updating rest config:", error);
      if (error instanceof Error) {
        if (error.message === "NO_PERMISSION") {
          toast.error("No tienes permisos para modificar esta configuración.");
        } else if (error.message === "NO_AUTH") {
          toast.error("No estás autenticado. Por favor, inicia sesión de nuevo.");
        } else if (error.message === "MODULE_DISABLED") {
          toast.error("El módulo de turnos no está disponible para esta organización.");
        } else {
          toast.error("No se pudo guardar la configuración de descanso");
        }
      } else {
        toast.error("No se pudo guardar la configuración de descanso");
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Gestión de Turnos</h2>
        <p className="text-muted-foreground text-sm">
          Controla el acceso al módulo de planificación y gestión de turnos de trabajo
        </p>
      </div>

      {/* Control de activación */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Módulo</CardTitle>
          <CardDescription>
            Activa o desactiva el módulo de gestión de turnos para toda la organización. Solo super administradores
            pueden modificar esta configuración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shifts-enabled">Módulo de Turnos</Label>
                <p className="text-muted-foreground text-xs">
                  {shiftsEnabled ? "El módulo está activo para todos los usuarios" : "El módulo está desactivado"}
                </p>
              </div>
              <Switch
                id="shifts-enabled"
                checked={shiftsEnabled}
                onCheckedChange={handleToggle}
                disabled={isUpdating || isLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración avanzada y estadísticas (solo si está activo) */}
      {shiftsEnabled && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros Operativos</CardTitle>
              <CardDescription>Define reglas globales para validar turnos en tu organización.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-9 w-48" />
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="min-rest-hours">Descanso mínimo entre turnos (horas)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="min-rest-hours"
                        type="number"
                        min={0}
                        step={0.5}
                        value={minRestHours}
                        onChange={(event) => setMinRestHours(Number(event.target.value) || 0)}
                        className="max-w-[160px]"
                        disabled={isSavingConfig}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSaveRestHours}
                        disabled={isSavingConfig}
                        className="gap-2"
                      >
                        <Shield className="size-4" />
                        Guardar
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Este valor se usa para mostrar advertencias cuando se asignan turnos sin respetar el descanso
                      mínimo requerido.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <h3 className="text-sm font-semibold">Estadísticas de Uso</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total de Empleados */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Users className="text-primary size-4" />
                  <CardDescription className="text-xs">Total Empleados</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalEmployees ?? 0}</div>
                )}
              </CardContent>
            </Card>

            {/* Empleados con Turnos */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="text-primary size-4" />
                  <CardDescription className="text-xs">Con Turnos</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">{stats?.employeesWithShifts ?? 0}</div>
                    <Badge variant="secondary" className="text-xs">
                      {stats?.usagePercentage}%
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total de Zonas */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="text-primary size-4" />
                  <CardDescription className="text-xs">Zonas Activas</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalZones ?? 0}</div>
                )}
              </CardContent>
            </Card>

            {/* Tasa de Uso */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-primary size-4" />
                  <CardDescription className="text-xs">Tasa de Uso</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.usagePercentage ?? "0"}%</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Información adicional */}
      {!shiftsEnabled && (
        <Card className="border-muted-foreground/20">
          <CardHeader>
            <CardTitle className="text-base">¿Qué incluye el módulo de turnos?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 text-primary mt-0.5 rounded-full p-1">
                <CalendarClock className="size-3" />
              </div>
              <div>
                <p className="font-medium">Planificación de turnos</p>
                <p className="text-muted-foreground text-xs">Crea y asigna turnos por zonas, empleados y fechas</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 text-primary mt-0.5 rounded-full p-1">
                <Users className="size-3" />
              </div>
              <div>
                <p className="font-medium">Gestión de empleados</p>
                <p className="text-muted-foreground text-xs">
                  Administra disponibilidad, roles y asignaciones de personal
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 text-primary mt-0.5 rounded-full p-1">
                <Building2 className="size-3" />
              </div>
              <div>
                <p className="font-medium">Zonas y centros de trabajo</p>
                <p className="text-muted-foreground text-xs">
                  Configura zonas por centro de trabajo con requisitos de cobertura
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información adicional cuando está activo */}
      {shiftsEnabled && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <strong>Nota:</strong> Desactivar el módulo de turnos ocultará todas las páginas relacionadas del menú de
              navegación y deshabilitará el acceso a las rutas. Los datos existentes se conservarán.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
