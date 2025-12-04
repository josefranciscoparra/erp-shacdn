"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, AlertTriangle, Bell, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { getActiveAlerts, getActiveAlertsCount } from "@/server/actions/alert-detection";

type AlertSimple = {
  id: string;
  type: string;
  severity: string;
  title: string;
  date: string;
  employee: {
    firstName: string;
    lastName: string;
  };
};

export function AlertsBell() {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const [alertsCount, setAlertsCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<AlertSimple[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // No mostrar campana si no tiene permiso view_time_tracking
  // Solo usuarios MANAGER y superiores pueden ver alertas
  const canViewAlerts = hasPermission("view_time_tracking");

  // Cargar al montar y al cambiar ruta (solo si tiene permiso)
  useEffect(() => {
    if (!canViewAlerts) return;

    const loadData = async () => {
      try {
        const [count, alerts] = await Promise.all([getActiveAlertsCount(), getActiveAlerts({})]);

        setAlertsCount(count);
        setRecentAlerts(alerts.slice(0, 5) as unknown as AlertSimple[]);
      } catch {
        // Error al cargar alertas
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pathname, canViewAlerts]);

  // Auto-refresh cada 2 minutos (solo si tiene permiso)
  useEffect(() => {
    if (!canViewAlerts) return;

    const loadData = async () => {
      try {
        const [count, alerts] = await Promise.all([getActiveAlertsCount(), getActiveAlerts({})]);

        setAlertsCount(count);
        setRecentAlerts(alerts.slice(0, 5) as unknown as AlertSimple[]);
      } catch {
        // Error al cargar alertas
      } finally {
        setIsLoading(false);
      }
    };

    const interval = setInterval(
      () => {
        if (!document.hidden && !isOpen) {
          loadData();
        }
      },
      2 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [isOpen, canViewAlerts]);

  // Si no tiene permiso, no renderizar nada (después de los hooks)
  if (!canViewAlerts) {
    return null;
  }

  const severityConfig = {
    INFO: { icon: Info, color: "text-blue-500" },
    WARNING: { icon: AlertTriangle, color: "text-yellow-500" },
    CRITICAL: { icon: AlertCircle, color: "text-red-500" },
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          {alertsCount > 0 && (
            <span className="ring-background absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h4 className="leading-none font-semibold">Notificaciones</h4>
          {alertsCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {alertsCount} nuevas
            </Badge>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-sm">Cargando...</div>
          ) : recentAlerts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <Bell className="text-muted-foreground/50 h-8 w-8" />
              <p className="text-muted-foreground text-sm">No tienes notificaciones nuevas</p>
            </div>
          ) : (
            <div className="grid gap-1">
              {recentAlerts.map((alert) => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.INFO;
                const Icon = config.icon;

                return (
                  <Link
                    key={alert.id}
                    href="/dashboard/time-tracking/alerts"
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-muted/50 flex items-start gap-3 p-4 transition-colors"
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm leading-none font-medium">
                          {alert.employee.firstName} {alert.employee.lastName}
                        </p>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(alert.date), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-xs">{alert.title}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="p-4">
          <Button asChild variant="outline" className="w-full justify-center">
            <Link href="/dashboard/time-tracking/alerts" onClick={() => setIsOpen(false)}>
              Ver todas las alertas
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
