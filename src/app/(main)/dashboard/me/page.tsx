"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Clock, CalendarDays, UserCircle, Bell, Users, Timer, UserCog, Building2, Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMySpaceDashboard, type MySpaceDashboard } from "@/server/actions/my-space";

import { MySpaceMetrics } from "./_components/my-space-metrics";
import { NotificationItem } from "./_components/notification-item";
import { UpcomingEvents } from "./_components/upcoming-events";

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

  // Estado de carga: Spinner centralizado
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-2 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="@container/main flex flex-col gap-3 md:gap-5">
        <Card className="p-6">
          <p className="text-destructive text-sm font-medium">{error}</p>
          <Button onClick={loadDashboard} className="mt-4" variant="outline" size="sm">
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  // Vista para administradores sin empleado
  if (data?.isAdminWithoutEmployee) {
    return (
      <div className="@container/main flex flex-col gap-3 md:gap-5">
        {/* Header con mensaje para administrador */}
        <SectionHeader
          title={`Buenas, ${data.profile.name} 👋`}
          description="Panel de acceso rápido para administradores"
        />

        {/* Acciones rápidas de administración */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Acceso rápido</h3>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/employees">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Empleados</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/departments">
                <Building2 className="h-5 w-5" />
                <span className="text-sm font-medium">Departamentos</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/time-tracking/live">
                <Timer className="h-5 w-5" />
                <span className="text-sm font-medium">Monitor en Vivo</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/admin/users">
                <UserCog className="h-5 w-5" />
                <span className="text-sm font-medium">Usuarios y Roles</span>
              </Link>
            </Button>
          </div>
        </Card>

        {/* Notificaciones recientes */}
        <Card className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="text-muted-foreground h-5 w-5" />
              <h3 className="text-lg font-semibold">Notificaciones recientes</h3>
            </div>
          </div>

          {data.recentNotifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tienes notificaciones recientes</p>
          ) : (
            <div className="space-y-2">
              {data.recentNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Vista normal para empleados
  return (
    <div className="@container/main flex flex-col gap-3 md:gap-5">
      {/* Header con nombre del empleado */}
      <SectionHeader
        title={data?.profile.name ? `Buenas, ${data.profile.name} 👋` : "Mi Espacio"}
        description={
          data?.profile.position || data?.profile.department
            ? `${data.profile.position ?? ""}${data.profile.position && data.profile.department ? " • " : ""}${data.profile.department ?? ""}`
            : "Dashboard personal del empleado"
        }
      />

      {/* Métricas principales */}
      <MySpaceMetrics data={data} isLoading={false} />

      {/* Acciones rápidas */}
      <Card className="p-6">
        <h3 className="mb-2 text-lg font-semibold">Acciones rápidas</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto flex-col gap-2 py-4 transition-colors" asChild>
            <Link href="/dashboard/me/clock">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Fichar</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4 transition-colors" asChild>
            <Link href="/dashboard/me/pto">
              <CalendarDays className="h-5 w-5" />
              <span className="text-sm font-medium">Mis Vacaciones</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4 transition-colors" asChild>
            <Link href="/dashboard/me/calendar">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Mi Calendario</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4 transition-colors" asChild>
            <Link href="/dashboard/me/profile">
              <UserCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Mi Perfil</span>
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
        {/* Próximos eventos */}
        {data && <UpcomingEvents events={data.upcomingEvents} />}

        {/* Notificaciones recientes */}
        {data && (
          <Card className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="text-muted-foreground h-5 w-5" />
                <h3 className="text-lg font-semibold">Notificaciones recientes</h3>
              </div>
            </div>

            {data.recentNotifications.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tienes notificaciones recientes</p>
            ) : (
              <div className="space-y-2">
                {data.recentNotifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
