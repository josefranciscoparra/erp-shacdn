"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActiveAlertsCount } from "@/server/actions/alert-detection";

export function AlertsBell() {
  const pathname = usePathname();
  const [alertsCount, setAlertsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Función para cargar el contador
  const loadAlertsCount = async () => {
    try {
      const count = await getActiveAlertsCount();
      setAlertsCount(count);
    } catch (error) {
      console.error("Error al cargar contador de alertas:", error);
      setAlertsCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar al montar el componente
  useEffect(() => {
    loadAlertsCount();
  }, []);

  // Recargar al cambiar de ruta
  useEffect(() => {
    loadAlertsCount();
  }, [pathname]);

  // Recargar al hacer foco en la ventana
  useEffect(() => {
    const handleFocus = () => {
      loadAlertsCount();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Auto-refresh cada 5 minutos (solo si la pestaña está activa)
  useEffect(() => {
    const interval = setInterval(
      () => {
        if (!document.hidden) {
          loadAlertsCount();
        }
      },
      5 * 60 * 1000,
    ); // 5 minutos

    return () => clearInterval(interval);
  }, []);

  // Si está cargando, mostrar el botón sin badge
  if (isLoading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="group border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:text-foreground relative rounded-lg border transition-colors"
        disabled
      >
        <AlertTriangle
          className="text-muted-foreground group-hover:text-foreground h-5 w-5 transition-colors"
          aria-hidden="true"
        />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="group border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:text-foreground relative rounded-lg border transition-colors"
      asChild
    >
      <Link href="/dashboard/time-tracking/alerts">
        <AlertTriangle
          className="text-muted-foreground group-hover:text-foreground h-5 w-5 transition-colors"
          aria-hidden="true"
        />
        {alertsCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-xs">
            {alertsCount > 99 ? "99+" : alertsCount}
          </Badge>
        )}
        <span className="sr-only">
          {alertsCount > 0 ? `${alertsCount} alertas activas` : "Sin alertas activas"}
        </span>
      </Link>
    </Button>
  );
}
