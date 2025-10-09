"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/hr/section-header";
import { MySpaceMetrics } from "./_components/my-space-metrics";
import { UpcomingEvents } from "./_components/upcoming-events";
import { getMySpaceDashboard, type MySpaceDashboard } from "@/server/actions/my-space";
import { Clock, CalendarDays, FileText, UserCircle, Bell } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function MySpacePage() {
  const [data, setData] = useState<MySpaceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getMySpaceDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el dashboard");
      console.error("Error al cargar dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header con nombre del empleado */}
      <SectionHeader
        title={data?.profile.name || "Mi Espacio"}
        description={
          data?.profile.position || data?.profile.department
            ? `${data.profile.position || ""}${data.profile.position && data.profile.department ? " • " : ""}${data.profile.department || ""}`
            : "Dashboard personal del empleado"
        }
      />

      {/* Error state */}
      {error && (
        <Card className="p-6">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button onClick={loadDashboard} className="mt-4" variant="outline" size="sm">
            Reintentar
          </Button>
        </Card>
      )}

      {/* Métricas principales */}
      <MySpaceMetrics data={data} isLoading={isLoading} />

      {/* Acciones rápidas */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Acciones rápidas</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
            <Link href="/dashboard/me/clock">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Fichar</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
            <Link href="/dashboard/me/pto">
              <CalendarDays className="h-5 w-5" />
              <span className="text-sm font-medium">Mis Vacaciones</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
            <Link href="/dashboard/me/calendar">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Mi Calendario</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
            <Link href="/dashboard/me/profile">
              <UserCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Mi Perfil</span>
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Próximos eventos */}
        {data && <UpcomingEvents events={data.upcomingEvents} />}

        {/* Notificaciones recientes */}
        {data && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Notificaciones recientes</h3>
              </div>
            </div>

            {data.recentNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tienes notificaciones recientes</p>
            ) : (
              <div className="space-y-3">
                {data.recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-3 transition-colors hover:bg-accent ${
                      !notification.read ? "border-primary/50 bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm">{notification.message}</p>
                      {!notification.read && (
                        <Badge variant="default" className="flex-shrink-0 text-xs">
                          Nueva
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(notification.createdAt), "d 'de' MMMM 'a las' HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
