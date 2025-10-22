"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  CalendarDays,
  FileText,
  UserCircle,
  Bell,
  Users,
  Settings,
  BarChart3,
  FolderKanban,
  ArrowRight,
} from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMySpaceDashboard, type MySpaceDashboard } from "@/server/actions/my-space";

import { MySpaceMetrics } from "./_components/my-space-metrics";

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
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        {/* Header con mensaje para administrador */}
        <SectionHeader
          title={data.profile.name}
          description="Vista de administrador - Esta página está diseñada para empleados"
        />

        {/* Acciones rápidas de administración */}
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Acceso rápido</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/employees">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Empleados</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/organization">
                <FolderKanban className="h-5 w-5" />
                <span className="text-sm font-medium">Organización</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/reports">
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm font-medium">Informes</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/settings">
                <Settings className="h-5 w-5" />
                <span className="text-sm font-medium">Configuración</span>
              </Link>
            </Button>
          </div>
        </Card>

        {/* Notificaciones recientes */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="text-muted-foreground h-5 w-5" />
              <h3 className="text-lg font-semibold">Notificaciones recientes</h3>
            </div>
          </div>

          {data.recentNotifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tienes notificaciones recientes</p>
          ) : (
            <div className="space-y-3">
              {data.recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`hover:bg-accent rounded-lg border p-3 transition-colors ${
                    !notification.read ? "border-primary/50 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">{notification.message}</p>
                    {!notification.read && <div className="bg-primary mt-0.5 h-2 w-2 flex-shrink-0 rounded-full" />}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {format(new Date(notification.createdAt), "d 'de' MMMM 'a las' HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Vista normal para empleados
  return (
    <div className="@container/main flex flex-col gap-6 md:gap-8">
      {/* Header con nombre del empleado */}
      <div className="space-y-1">
        <SectionHeader
          title={data?.profile.name ?? "Mi Espacio"}
          description={
            data?.profile.position || data?.profile.department
              ? `${data.profile.position ?? ""}${data.profile.position && data.profile.department ? " • " : ""}${data.profile.department ?? ""}`
              : "Dashboard personal del empleado"
          }
        />
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5 p-5">
          <p className="text-destructive text-sm font-semibold">{error}</p>
          <Button onClick={loadDashboard} className="mt-3" variant="outline" size="sm">
            Reintentar
          </Button>
        </Card>
      )}

      {/* Métricas principales - PROTAGONISTAS */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <MySpaceMetrics data={data} isLoading={isLoading} />
      </div>

      {/* Acciones rápidas - SIMPLIFICADAS (botones outline planos) */}
      <div className="space-y-4">
        <h3 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">Acciones rápidas</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            className="bg-muted/20 hover:bg-muted/40 border-border/40 hover:border-border h-auto justify-start gap-3 rounded-lg py-4 pr-5 pl-4 text-left transition-all"
            asChild
          >
            <Link href="/dashboard/me/clock">
              <Clock className="text-muted-foreground h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Fichar</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="bg-muted/20 hover:bg-muted/40 border-border/40 hover:border-border h-auto justify-start gap-3 rounded-lg py-4 pr-5 pl-4 text-left transition-all"
            asChild
          >
            <Link href="/dashboard/me/pto">
              <CalendarDays className="text-muted-foreground h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Mis Vacaciones</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="bg-muted/20 hover:bg-muted/40 border-border/40 hover:border-border h-auto justify-start gap-3 rounded-lg py-4 pr-5 pl-4 text-left transition-all"
            asChild
          >
            <Link href="/dashboard/me/calendar">
              <FileText className="text-muted-foreground h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Mi Calendario</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="bg-muted/20 hover:bg-muted/40 border-border/40 hover:border-border h-auto justify-start gap-3 rounded-lg py-4 pr-5 pl-4 text-left transition-all"
            asChild
          >
            <Link href="/dashboard/me/profile">
              <UserCircle className="text-muted-foreground h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Mi Perfil</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Bloques inferiores - CON FONDOS GRISES SUTILES */}
      <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
        {/* Próximos eventos */}
        {data && (
          <div className="space-y-4">
            <h3 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">Próximos eventos</h3>

            <div className="border-border/40 bg-muted/30 rounded-xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-foreground text-sm font-semibold">Próximas fechas</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground -mr-2 h-auto p-0 text-xs font-medium"
                  asChild
                >
                  <Link href="/dashboard/me/calendar">
                    Ver calendario <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {data.upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="text-muted-foreground/40 mb-3 h-10 w-10" />
                  <p className="text-muted-foreground text-sm">No hay eventos próximos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.upcomingEvents.map((event) => {
                    const startDate = new Date(event.date);
                    const endDate = event.endDate ? new Date(event.endDate) : null;
                    const isMultiDay = endDate && !isSameDay(startDate, endDate);

                    return (
                      <div
                        key={event.id}
                        className="group border-border/40 bg-background hover:border-border hover:bg-background/80 flex items-start gap-3 rounded-lg border p-3 transition-colors"
                      >
                        {/* Indicador de color del calendario */}
                        <div
                          className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: event.calendar?.color || "hsl(var(--muted-foreground))" }}
                        />

                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm leading-tight font-medium">{event.name}</p>
                            <span className="text-base opacity-50">
                              {event.eventType === "HOLIDAY" && "🏖️"}
                              {event.eventType === "COMPANY_EVENT" && "🏢"}
                              {event.eventType === "TRAINING" && "📚"}
                              {event.eventType === "MEETING" && "📅"}
                              {event.eventType === "OTHER" && "📌"}
                            </span>
                          </div>

                          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <span>
                              {isMultiDay ? (
                                <>
                                  {format(startDate, "d MMM", { locale: es })} -{" "}
                                  {format(endDate, "d MMM", { locale: es })}
                                </>
                              ) : (
                                format(startDate, "d 'de' MMMM", { locale: es })
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notificaciones recientes */}
        {data && (
          <div className="space-y-4">
            <h3 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">Notificaciones</h3>

            <div className="border-border/40 bg-muted/30 rounded-xl border p-5">
              <div className="text-foreground mb-4 text-sm font-semibold">Recientes</div>

              {data.recentNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="text-muted-foreground/40 mb-3 h-10 w-10" />
                  <p className="text-muted-foreground text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group rounded-lg border p-3 transition-colors ${
                        !notification.read
                          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                          : "border-border/40 bg-background hover:border-border hover:bg-background/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm leading-relaxed">{notification.message}</p>
                        {!notification.read && <div className="bg-primary mt-0.5 h-2 w-2 flex-shrink-0 rounded-full" />}
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        {format(new Date(notification.createdAt), "d 'de' MMMM 'a las' HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
