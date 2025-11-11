"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Clock,
  CalendarDays,
  UserCircle,
  Users,
  Timer,
  UserCog,
  Building2,
  Loader2,
  ChevronRight,
  Calendar,
} from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getMySpaceDashboard, type MySpaceDashboard } from "@/server/actions/my-space";

import { MySpaceMetrics } from "./_components/my-space-metrics";
import { RecentNotifications } from "./_components/recent-notifications";
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
        <Card>
          <CardHeader>
            <CardTitle>Acceso rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              <Link
                href="/dashboard/employees"
                className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                  <Users className="text-primary size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Empleados</p>
                  <p className="text-muted-foreground text-xs">Gestionar equipo</p>
                </div>
                <ChevronRight className="text-muted-foreground size-4" />
              </Link>

              <Link
                href="/dashboard/departments"
                className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                  <Building2 className="text-primary size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Departamentos</p>
                  <p className="text-muted-foreground text-xs">Organizar estructura</p>
                </div>
                <ChevronRight className="text-muted-foreground size-4" />
              </Link>

              <Link
                href="/dashboard/time-tracking/live"
                className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                  <Timer className="text-primary size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Monitor en Vivo</p>
                  <p className="text-muted-foreground text-xs">Ver fichajes activos</p>
                </div>
                <ChevronRight className="text-muted-foreground size-4" />
              </Link>

              <Link
                href="/dashboard/admin/users"
                className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                  <UserCog className="text-primary size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Usuarios y Roles</p>
                  <p className="text-muted-foreground text-xs">Configurar permisos</p>
                </div>
                <ChevronRight className="text-muted-foreground size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Notificaciones recientes */}
        <RecentNotifications notifications={data.recentNotifications} />
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
      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <Link
              href="/dashboard/me/clock"
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                <Clock className="text-primary size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Fichar</p>
                <p className="text-muted-foreground text-xs">Registrar entrada/salida</p>
              </div>
              <ChevronRight className="text-muted-foreground size-4" />
            </Link>

            <Link
              href="/dashboard/me/pto"
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                <CalendarDays className="text-primary size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Mis Vacaciones</p>
                <p className="text-muted-foreground text-xs">Solicitar días libres</p>
              </div>
              <ChevronRight className="text-muted-foreground size-4" />
            </Link>

            <Link
              href="/dashboard/me/calendar"
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                <Calendar className="text-primary size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Mi Calendario</p>
                <p className="text-muted-foreground text-xs">Ver próximos eventos</p>
              </div>
              <ChevronRight className="text-muted-foreground size-4" />
            </Link>

            <Link
              href="/dashboard/me/profile"
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                <UserCircle className="text-primary size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Mi Perfil</p>
                <p className="text-muted-foreground text-xs">Ver información personal</p>
              </div>
              <ChevronRight className="text-muted-foreground size-4" />
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
        {/* Próximos eventos */}
        {data && <UpcomingEvents events={data.upcomingEvents} />}

        {/* Notificaciones recientes */}
        {data && <RecentNotifications notifications={data.recentNotifications} />}
      </div>
    </div>
  );
}
