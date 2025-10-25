"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Bell, Users, Settings, BarChart3, Building2, UserCircle, Clock, CalendarDays, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMySpaceDashboard, type MySpaceDashboard } from "@/server/actions/my-space";

import { MySpaceMetrics } from "./_components/my-space-metrics";
import { NotificationItem } from "./_components/notification-item";
import { QuickActionCard } from "./_components/quick-action-card";
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

  // Vista para administradores sin empleado
  if (data?.isAdminWithoutEmployee) {
    return (
      <div className="@container/main flex flex-col gap-6">
        {/* Header con mensaje para administrador */}
        <div className="animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Vista de Administrador</h2>
              <p className="text-muted-foreground">
                Esta página está diseñada para empleados. Utilice los accesos directos para gestionar la organización.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones rápidas de administración */}
        <div className="animate-in fade-in duration-700" style={{ animationDelay: "100ms" }}>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Acceso rápido de Administración</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <QuickActionCard
                title="Empleados"
                icon={Users}
                href="/dashboard/employees"
                className="bg-red-50 hover:bg-red-100 dark:bg-red-900/50 dark:hover:bg-red-900"
              />
              <QuickActionCard
                title="Departamentos"
                icon={Building2}
                href="/dashboard/departments"
                className="bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/50 dark:hover:bg-orange-900"
              />
              <QuickActionCard
                title="Informes"
                icon={BarChart3}
                href="/dashboard/reports"
                className="bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/50 dark:hover:bg-teal-900"
              />
              <QuickActionCard
                title="Configuración"
                icon={Settings}
                href="/dashboard/settings"
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              />
            </div>
          </Card>
        </div>

        {/* Notificaciones recientes */}
        <div className="animate-in fade-in duration-700" style={{ animationDelay: "200ms" }}>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="text-muted-foreground h-5 w-5" />
                <h3 className="text-lg font-semibold">Notificaciones</h3>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/notifications">Ver todas</Link>
              </Button>
            </div>

            {data.recentNotifications.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tienes notificaciones recientes.</p>
            ) : (
              <div className="space-y-3">
                {data.recentNotifications.slice(0, 3).map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Vista normal para empleados
  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Header con bienvenida y perfil */}
      <div className="animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">¡Hola, {data?.profile.name.split(" ")[0]}! 👋</h2>
            <p className="text-muted-foreground">Aquí tienes un resumen de tu espacio de trabajo.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/me/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                Mi Perfil
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="p-6">
          <p className="text-destructive text-sm font-medium">{error}</p>
          <Button onClick={loadDashboard} className="mt-4" variant="outline" size="sm">
            Reintentar
          </Button>
        </Card>
      )}

      {/* Métricas principales */}
      <div className="animate-in fade-in duration-700" style={{ animationDelay: "100ms" }}>
        <MySpaceMetrics data={data} isLoading={isLoading} />
      </div>

      {/* Acciones rápidas y eventos */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Acciones rápidas */}
        <div className="animate-in fade-in duration-700 lg:col-span-1" style={{ animationDelay: "200ms" }}>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Acciones rápidas</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionCard
                title="Fichar"
                icon={Clock}
                href="/dashboard/me/clock"
                className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/50 dark:hover:bg-blue-900"
              />
              <QuickActionCard
                title="Vacaciones"
                icon={CalendarDays}
                href="/dashboard/me/pto"
                className="bg-green-50 hover:bg-green-100 dark:bg-green-900/50 dark:hover:bg-green-900"
              />
              <QuickActionCard
                title="Calendario"
                icon={CalendarDays}
                href="/dashboard/me/calendar"
                className="bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/50 dark:hover:bg-yellow-900"
              />
              <QuickActionCard
                title="Documentos"
                icon={FileText}
                href="/dashboard/me/documents"
                className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/50 dark:hover:bg-purple-900"
              />
            </div>
          </Card>
        </div>

        {/* Próximos eventos y notificaciones */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Próximos eventos */}
          {data && (
            <div className="animate-in fade-in duration-700" style={{ animationDelay: "300ms" }}>
              <UpcomingEvents events={data.upcomingEvents} />
            </div>
          )}

          {/* Notificaciones recientes */}
          {data && (
            <div className="animate-in fade-in duration-700" style={{ animationDelay: "400ms" }}>
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="text-muted-foreground h-5 w-5" />
                    <h3 className="text-lg font-semibold">Notificaciones</h3>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/me/notifications">Ver todas</Link>
                  </Button>
                </div>

                {data.recentNotifications.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No tienes notificaciones recientes.</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentNotifications.slice(0, 3).map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
