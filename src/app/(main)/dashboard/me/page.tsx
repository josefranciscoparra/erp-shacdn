"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  CalendarDays,
  FileText,
  UserCog,
  Building2,
  Loader2,
  ChevronRight,
  Calendar,
  Shield,
  Users,
  Play,
  Pause,
  Coffee,
  Bell,
  Sparkles,
  TrendingUp,
  Palmtree,
  Timer,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMySpaceDashboard, type MySpaceDashboard } from "@/server/actions/my-space";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function getStatusConfig(status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK") {
  switch (status) {
    case "CLOCKED_IN":
      return {
        label: "Trabajando",
        icon: Play,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        ring: "ring-emerald-500/20",
        pulse: "bg-emerald-500",
      };
    case "ON_BREAK":
      return {
        label: "En pausa",
        icon: Coffee,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        ring: "ring-amber-500/20",
        pulse: "bg-amber-500",
      };
    default:
      return {
        label: "Fuera",
        icon: Pause,
        color: "text-slate-500 dark:text-slate-400",
        bg: "bg-slate-500/10",
        ring: "ring-slate-500/20",
        pulse: "bg-slate-400",
      };
  }
}

function getEventTypeConfig(eventType: string) {
  switch (eventType) {
    case "HOLIDAY":
      return { icon: Palmtree, color: "bg-rose-500" };
    case "COMPANY_EVENT":
      return { icon: Building2, color: "bg-violet-500" };
    case "TRAINING":
      return { icon: Sparkles, color: "bg-cyan-500" };
    case "MEETING":
      return { icon: Users, color: "bg-blue-500" };
    default:
      return { icon: Calendar, color: "bg-slate-500" };
  }
}

// ============================================================================
// HERO SECTION COMPONENT
// ============================================================================

function HeroSection({
  profile,
  timeTracking,
}: {
  profile: MySpaceDashboard["profile"];
  timeTracking: MySpaceDashboard["timeTracking"];
}) {
  const statusConfig = getStatusConfig(timeTracking.today.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-4 md:p-5 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-800/50">
      {/* Decorative element */}
      <div className="from-primary/5 to-primary/10 pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Profile info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-14 ring-2 ring-white/80 md:size-16 dark:ring-slate-800/80">
              {profile.photoUrl ? <AvatarImage src={profile.photoUrl} alt={profile.name} /> : null}
              <AvatarFallback className="from-primary/80 to-primary bg-gradient-to-br text-base font-semibold text-white">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            {/* Status indicator */}
            <div
              className={`absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full ${statusConfig.bg} ring-2 ring-white dark:ring-slate-900`}
            >
              <span className={`size-2 animate-pulse rounded-full ${statusConfig.pulse}`} />
            </div>
          </div>

          <div className="space-y-0.5">
            <p className="text-muted-foreground text-xs font-medium">{getGreeting()}</p>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">{profile.name}</h1>
            {(profile.position ?? profile.department) && (
              <p className="text-muted-foreground text-xs">
                {profile.position}
                {profile.position && profile.department ? " · " : ""}
                {profile.department}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <Link
          href="/dashboard/me/clock"
          className={`flex items-center gap-2 rounded-lg ${statusConfig.bg} px-3 py-2 ring-1 ${statusConfig.ring} transition-all hover:opacity-80`}
        >
          <StatusIcon className={`size-4 ${statusConfig.color}`} />
          <div className="text-sm">
            <span className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
            <span className="text-muted-foreground ml-1.5 text-xs">
              · {formatMinutesToTime(timeTracking.today.workedMinutes)}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// METRICS CARDS COMPONENT
// ============================================================================

function MetricsSection({ data }: { data: MySpaceDashboard }) {
  const { timeTracking, pto } = data;

  const todayProgress =
    timeTracking.today.expectedMinutes > 0
      ? Math.min(Math.round((timeTracking.today.workedMinutes / timeTracking.today.expectedMinutes) * 100), 100)
      : 0;

  const weekProgress =
    timeTracking.week.expectedMinutes > 0
      ? Math.min(Math.round((timeTracking.week.totalWorkedMinutes / timeTracking.week.expectedMinutes) * 100), 100)
      : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Today's progress */}
      <Card className="group gap-2 transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-xl">Progreso de hoy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <Clock className="size-5" />
            </div>
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-semibold">
                {formatMinutesToTime(timeTracking.today.workedMinutes)}
              </span>{" "}
              de {formatMinutesToTime(timeTracking.today.expectedMinutes)} ·{" "}
              {todayProgress >= 100 ? (
                <span className="text-emerald-600 dark:text-emerald-400">Completado</span>
              ) : (
                <span>{todayProgress}%</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Week's progress */}
      <Card className="group gap-2 transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-xl">Esta semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <TrendingUp className="size-5" />
            </div>
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-semibold">
                {formatMinutesToTime(timeTracking.week.totalWorkedMinutes)}
              </span>{" "}
              de {formatMinutesToTime(timeTracking.week.expectedMinutes)} · {weekProgress}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PTO Balance */}
      <Card className="group gap-2 transition-all duration-200 hover:shadow-md md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle className="font-display text-xl">Vacaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <Palmtree className="size-5" />
            </div>
            {pto ? (
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-semibold">{Math.round(pto.daysAvailable)} días</span> disponibles
                · {pto.daysUsed} usados · {pto.daysPending} pendientes
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">Sin contrato activo</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// QUICK ACTIONS COMPONENT
// ============================================================================

function QuickActions() {
  const actions = [
    {
      href: "/dashboard/me/clock",
      icon: Clock,
      label: "Fichar",
      description: "Entrada y salida",
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      href: "/dashboard/me/pto",
      icon: CalendarDays,
      label: "Ausencias",
      description: "Solicitar días",
      gradient: "from-orange-500/10 to-amber-500/10",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      href: "/dashboard/me/calendar",
      icon: Calendar,
      label: "Calendario",
      description: "Ver eventos",
      gradient: "from-violet-500/10 to-purple-500/10",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      href: "/dashboard/me/documents",
      icon: FileText,
      label: "Documentos",
      description: "Mis archivos",
      gradient: "from-emerald-500/10 to-teal-500/10",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className={`group relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-gradient-to-br ${action.gradient} p-3 transition-all duration-200 hover:shadow-md`}
          >
            <div className={`w-fit rounded-lg ${action.iconBg} p-2`}>
              <Icon className={`size-4 ${action.iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-muted-foreground text-xs">{action.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ============================================================================
// EVENTS TIMELINE COMPONENT
// ============================================================================

function EventsTimeline({ events }: { events: MySpaceDashboard["upcomingEvents"] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-4" />
            Próximos eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-muted mb-3 rounded-full p-3">
              <CalendarDays className="text-muted-foreground size-6" />
            </div>
            <p className="text-sm font-medium">Sin eventos próximos</p>
            <p className="text-muted-foreground mt-1 text-xs">No tienes eventos programados para los próximos días</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="size-4" />
          Próximos eventos
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="-mr-2">
          <Link href="/dashboard/me/calendar">
            Ver todos
            <ChevronRight className="ml-1 size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.slice(0, 4).map((event) => {
            const config = getEventTypeConfig(event.eventType);
            const EventIcon = config.icon;
            const eventDate = new Date(event.date);

            return (
              <div
                key={event.id}
                className="group hover:bg-muted/50 flex items-start gap-3 rounded-lg p-2 transition-colors"
              >
                <div className={`mt-0.5 rounded-md ${config.color} p-1.5`}>
                  <EventIcon className="size-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {eventDate.toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                {event.calendar.color && (
                  <div className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: event.calendar.color }} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// NOTIFICATIONS COMPONENT
// ============================================================================

function NotificationsPanel({ notifications }: { notifications: MySpaceDashboard["recentNotifications"] }) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-muted mb-3 rounded-full p-3">
              <Bell className="text-muted-foreground size-6" />
            </div>
            <p className="text-sm font-medium">Todo al día</p>
            <p className="text-muted-foreground mt-1 text-xs">No tienes notificaciones pendientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4" />
          Notificaciones
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="-mr-2">
          <Link href="/dashboard/notifications">
            Ver todas
            <ChevronRight className="ml-1 size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.slice(0, 4).map((notification) => (
            <Link
              key={notification.id}
              href="/dashboard/notifications"
              className={`group hover:bg-muted/50 flex items-start gap-3 rounded-lg p-2.5 transition-colors ${
                !notification.read ? "bg-primary/5" : ""
              }`}
            >
              <div
                className={`mt-0.5 shrink-0 rounded-full p-1.5 ${!notification.read ? "bg-primary/10" : "bg-muted"}`}
              >
                <Bell className={`size-3.5 ${!notification.read ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className={`line-clamp-2 text-sm ${!notification.read ? "font-medium" : "text-muted-foreground"}`}>
                  {notification.message}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
              {!notification.read && <div className="bg-primary mt-2 size-2 shrink-0 rounded-full" />}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ADMIN VIEW COMPONENT
// ============================================================================

function AdminView({ data }: { data: MySpaceDashboard }) {
  const cardStyle =
    "group relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5";

  const adminActions = [
    {
      href: "/dashboard/employees",
      icon: Users,
      label: "Empleados",
      description: "Gestionar equipo",
      gradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      href: "/dashboard/departments",
      icon: Building2,
      label: "Departamentos",
      description: "Organizar estructura",
      gradient: "from-violet-500/10 to-purple-500/10",
    },
    {
      href: "/dashboard/time-tracking/live",
      icon: Timer,
      label: "Monitor en Vivo",
      description: "Fichajes activos",
      gradient: "from-emerald-500/10 to-teal-500/10",
    },
    {
      href: "/dashboard/admin/users",
      icon: UserCog,
      label: "Usuarios y Roles",
      description: "Configurar permisos",
      gradient: "from-orange-500/10 to-amber-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm font-medium">{getGreeting()}</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{data.profile.name}</h1>
        <p className="text-muted-foreground text-sm">Panel de acceso rápido para administradores</p>
      </div>

      {/* Quick actions grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adminActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className={`${cardStyle} bg-gradient-to-br ${action.gradient}`}>
              <div className="flex items-center gap-4">
                <div className="bg-background/80 rounded-lg p-2.5">
                  <Icon className="text-primary size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{action.label}</p>
                  <p className="text-muted-foreground text-xs">{action.description}</p>
                </div>
                <ChevronRight className="text-muted-foreground/50 size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Notifications */}
      <NotificationsPanel notifications={data.recentNotifications} />
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function MySpacePage() {
  const [data, setData] = useState<MySpaceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const whistleblowingEnabled = useOrganizationFeaturesStore((state) => state.features.whistleblowingEnabled);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="bg-primary/20 absolute inset-0 rounded-full blur-xl" />
            <Loader2 className="text-primary relative mx-auto size-10 animate-spin" />
          </div>
          <p className="text-muted-foreground mt-4 animate-pulse text-sm">Cargando tu espacio...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <Card className="border-destructive/20 max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="bg-destructive/10 mb-4 inline-flex rounded-full p-3">
              <Bell className="text-destructive size-6" />
            </div>
            <h3 className="mb-2 font-semibold">Error al cargar</h3>
            <p className="text-muted-foreground mb-4 text-sm">{error}</p>
            <Button onClick={loadDashboard} variant="outline" size="sm">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin without employee view
  if (data?.isAdminWithoutEmployee) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <AdminView data={data} />
      </div>
    );
  }

  // Main employee view
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500 md:space-y-8">
      {/* Hero Section */}
      {data && <HeroSection profile={data.profile} timeTracking={data.timeTracking} />}

      {/* Metrics Grid */}
      {data && <MetricsSection data={data} />}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Acciones rápidas</h2>
        <QuickActions />
      </div>

      {/* Events & Notifications Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data && <EventsTimeline events={data.upcomingEvents} />}
        {data && <NotificationsPanel notifications={data.recentNotifications} />}
      </div>

      {/* Whistleblowing footer */}
      {whistleblowingEnabled && (
        <div className="pt-4">
          <Link
            href="/dashboard/me/whistleblowing"
            className="group border-muted-foreground/20 bg-muted/30 hover:border-primary/30 hover:bg-primary/5 flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-center transition-all duration-300"
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
