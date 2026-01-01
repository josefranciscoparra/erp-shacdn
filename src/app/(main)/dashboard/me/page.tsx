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
  Shield,
} from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getMySpaceDashboard, type MySpaceDashboard } from "@/server/actions/my-space";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

import { MySpaceMetrics } from "./_components/my-space-metrics";
import { RecentNotifications } from "./_components/recent-notifications";
import { UpcomingEvents } from "./_components/upcoming-events";

export default function MySpacePage() {
  const [data, setData] = useState<MySpaceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const whistleblowingEnabled = useOrganizationFeaturesStore((state) => state.features.whistleblowingEnabled);
  const moduleAvailability = useOrganizationFeaturesStore((state) => state.features.moduleAvailability);
  const whistleblowingAvailable = moduleAvailability.whistleblowing && whistleblowingEnabled;

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

  // Clases para el efecto "Apple/Factorial/Workday"
  // - Suave transición (duration-300, ease-out)
  // - Sutil elevación y escalado (translate-y, scale, shadow)
  // - Bordes elegantes
  const cardHoverEffect =
    "group relative overflow-hidden rounded-xl border bg-card text-card-foreground p-4 transition-all duration-300 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:border-primary/20 hover:bg-accent/5";

  const iconContainerStyle =
    "bg-primary/5 flex size-12 items-center justify-center rounded-full border border-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:shadow-sm";

  // Estado de carga: Spinner centralizado
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-2 animate-pulse text-sm">Cargando tu espacio...</p>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 @container/main flex flex-col gap-3 duration-500 md:gap-5">
        <Card className="border-destructive/20 p-6 shadow-sm">
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
      <div className="animate-in fade-in slide-in-from-bottom-4 @container/main flex flex-col gap-3 duration-700 md:gap-5">
        {/* Header con mensaje para administrador */}
        <SectionHeader
          title={`Buenas, ${data.profile.name} 👋`}
          description="Panel de acceso rápido para administradores"
        />

        {/* Acciones rápidas de administración */}
        <div className="grid gap-4">
          <h3 className="text-lg font-semibold tracking-tight">Acceso Rápido</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/employees" className={cardHoverEffect}>
              <div className="flex items-center gap-4">
                <div className={iconContainerStyle}>
                  <Users className="text-primary size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground/90 text-sm font-semibold">Empleados</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">Gestionar equipo</p>
                </div>
                <ChevronRight className="text-muted-foreground/50 group-hover:text-primary size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </Link>

            <Link href="/dashboard/departments" className={cardHoverEffect}>
              <div className="flex items-center gap-4">
                <div className={iconContainerStyle}>
                  <Building2 className="text-primary size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground/90 text-sm font-semibold">Departamentos</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">Organizar estructura</p>
                </div>
                <ChevronRight className="text-muted-foreground/50 group-hover:text-primary size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </Link>

            <Link href="/dashboard/time-tracking/live" className={cardHoverEffect}>
              <div className="flex items-center gap-4">
                <div className={iconContainerStyle}>
                  <Timer className="text-primary size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground/90 text-sm font-semibold">Monitor en Vivo</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">Fichajes activos</p>
                </div>
                <ChevronRight className="text-muted-foreground/50 group-hover:text-primary size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </Link>

            <Link href="/dashboard/admin/users" className={cardHoverEffect}>
              <div className="flex items-center gap-4">
                <div className={iconContainerStyle}>
                  <UserCog className="text-primary size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-foreground/90 text-sm font-semibold">Usuarios y Roles</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">Configurar permisos</p>
                </div>
                <ChevronRight className="text-muted-foreground/50 group-hover:text-primary size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>
        </div>

        {/* Notificaciones recientes */}
        <RecentNotifications notifications={data.recentNotifications} />
      </div>
    );
  }

  // Vista normal para empleados
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 @container/main flex flex-col gap-6 duration-700 ease-out">
      {/* Header con nombre del empleado */}
      <SectionHeader
        title={data?.profile.name ? `Buenas, ${data.profile.name} 👋` : "Mi Espacio"}
        description={
          data?.profile.position || data?.profile.department
            ? `${data.profile.position ?? ""}${data.profile.position && data.profile.department ? " • " : ""}${data.profile.department ?? ""}`
            : "Dashboard personal del empleado"
        }
        className="mb-2"
      />

      {/* Métricas principales */}
      <div className="transition-all delay-100 duration-500">
        <MySpaceMetrics data={data} isLoading={false} />
      </div>

      {/* Acciones rápidas */}
      <div className="space-y-3 transition-all delay-200 duration-500">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground/90 text-lg font-semibold tracking-tight">Acciones Rápidas</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/me/clock" className={cardHoverEffect}>
            <div className="flex items-center gap-4">
              <div
                className={`${iconContainerStyle} border-blue-200/50 bg-blue-500/10 text-blue-600 dark:border-blue-500/20 dark:text-blue-400`}
              >
                <Clock className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Fichar</p>
                <p className="text-muted-foreground truncate text-xs">Entrada/Salida</p>
              </div>
              <ChevronRight className="text-muted-foreground/30 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href="/dashboard/me/pto" className={cardHoverEffect}>
            <div className="flex items-center gap-4">
              <div
                className={`${iconContainerStyle} border-orange-200/50 bg-orange-500/10 text-orange-600 dark:border-orange-500/20 dark:text-orange-400`}
              >
                <CalendarDays className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Mis ausencias</p>
                <p className="text-muted-foreground truncate text-xs">Solicitar ausencias</p>
              </div>
              <ChevronRight className="text-muted-foreground/30 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href="/dashboard/me/calendar" className={cardHoverEffect}>
            <div className="flex items-center gap-4">
              <div
                className={`${iconContainerStyle} border-purple-200/50 bg-purple-500/10 text-purple-600 dark:border-purple-500/20 dark:text-purple-400`}
              >
                <Calendar className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Mi Calendario</p>
                <p className="text-muted-foreground truncate text-xs">Ver eventos</p>
              </div>
              <ChevronRight className="text-muted-foreground/30 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href="/dashboard/me/profile" className={cardHoverEffect}>
            <div className="flex items-center gap-4">
              <div
                className={`${iconContainerStyle} border-emerald-200/50 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400`}
              >
                <UserCircle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Mi Perfil</p>
                <p className="text-muted-foreground truncate text-xs">Datos personales</p>
              </div>
              <ChevronRight className="text-muted-foreground/30 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 transition-all delay-300 duration-500 md:grid-cols-2">
        {/* Próximos eventos */}
        {data && (
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground/90 px-1 text-lg font-semibold tracking-tight">Agenda</h3>
            <UpcomingEvents events={data.upcomingEvents} />
          </div>
        )}

        {/* Notificaciones recientes */}
        {data && (
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground/90 px-1 text-lg font-semibold tracking-tight">Novedades</h3>
            <RecentNotifications notifications={data.recentNotifications} />
          </div>
        )}
      </div>

      {/* Footer discreto - Canal de Denuncias */}
      {whistleblowingAvailable && (
        <div className="mt-8 pt-6 transition-all delay-500 duration-500">
          <Link
            href="/dashboard/me/whistleblowing"
            className="group bg-muted/30 hover:bg-primary/5 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-center transition-all duration-300"
          >
            <Shield className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
            <span className="text-muted-foreground group-hover:text-foreground text-sm transition-colors">
              ¿Necesitas comunicar algo de forma confidencial?{" "}
              <span className="text-primary/80 group-hover:text-primary font-medium">
                Acceder al Canal de Denuncias
              </span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
