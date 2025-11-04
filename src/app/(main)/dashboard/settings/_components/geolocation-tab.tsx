"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { MapPin, Satellite, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  getGeolocationStats,
  getOrganizationGeolocationConfig,
  updateOrganizationGeolocationStatus,
} from "@/server/actions/geolocation";

interface GeolocationStats {
  totalEntries: number;
  entriesWithGPS: number;
  entriesRequiringReview: number;
  totalConsents: number;
  gpsPercentage: string;
}

export function GeolocationTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<GeolocationStats | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [config, statsData] = await Promise.all([getOrganizationGeolocationConfig(), getGeolocationStats()]);

        setEnabled(config.geolocationEnabled);
        setStats(statsData);
      } catch (error) {
        console.error("Error loading geolocation data:", error);
        toast.error("Error al cargar la configuración de geolocalización");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleToggle = async (newValue: boolean) => {
    try {
      setIsSaving(true);
      await updateOrganizationGeolocationStatus(newValue);

      setEnabled(newValue);
      toast.success(newValue ? "Geolocalización activada" : "Geolocalización desactivada");
    } catch (error) {
      console.error("Error updating geolocation status:", error);
      toast.error("Error al actualizar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              <div className="flex-1">
                <h3 className="font-semibold">Control de Geolocalización</h3>
                <p className="text-muted-foreground text-sm">Activa o desactiva el sistema de geolocalización</p>
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </div>
        </Card>

        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Estadísticas</h3>
                <p className="text-muted-foreground text-sm">Datos de uso de geolocalización</p>
              </div>
            </div>
            <div className="grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card de Control */}
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Control de Geolocalización</h3>
                <p className="text-muted-foreground text-sm">
                  {enabled
                    ? "El sistema capturará coordenadas GPS en cada fichaje"
                    : "Los empleados pueden fichar sin capturar ubicación"}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isSaving} />
          </div>

          {enabled && (
            <div className="bg-muted/50 rounded-lg border p-4">
              <div className="flex gap-3">
                <ShieldCheck className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Protección de privacidad activa</p>
                  <p className="text-muted-foreground text-xs">
                    Los empleados deben dar consentimiento RGPD/LOPDGDD antes del primer fichaje con GPS. Los datos se
                    almacenan de forma segura y cumplen con la normativa vigente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Card de Estadísticas */}
      {stats && (
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Estadísticas de Geolocalización</h3>
                <p className="text-muted-foreground text-sm">Datos de uso del sistema</p>
              </div>
            </div>

            <div className="grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Total de fichajes</p>
                <p className="text-2xl font-bold">{stats.totalEntries}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Fichajes con GPS</p>
                <p className="text-2xl font-bold">{stats.entriesWithGPS}</p>
                <p className="text-muted-foreground text-xs">{stats.gpsPercentage}% del total</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Requieren revisión</p>
                <p className="text-2xl font-bold">{stats.entriesRequiringReview}</p>
                <p className="text-muted-foreground text-xs">Fuera de área permitida</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Consentimientos</p>
                <p className="text-2xl font-bold">{stats.totalConsents}</p>
                <p className="text-muted-foreground text-xs">Empleados con permiso</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Card de Acciones */}
      {enabled && (
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Mapa de Fichajes</h3>
                <p className="text-muted-foreground text-sm">Visualiza los fichajes en un mapa interactivo</p>
              </div>
            </div>

            <Link href="/dashboard/me/clock?view=map">
              <Button variant="outline" className="w-full @xl/main:w-auto">
                <MapPin className="mr-2 h-4 w-4" />
                Ver mapa de fichajes
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
