"use client";

/**
 * Estadísticas del Sistema de Turnos
 * Sprint 7
 */

import { useState, useEffect } from "react";

import { CalendarClock, Users, Building2, UserCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getShiftSystemStats } from "@/server/actions/shift-settings";

export function ShiftSystemStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await getShiftSystemStats();
      setStats(data);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-muted-foreground text-sm font-semibold">Estadísticas del Sistema</h3>

      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Total Turnos</CardTitle>
          <CalendarClock className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalShifts}</div>
          <p className="text-muted-foreground mt-1 text-xs">Turnos creados en el sistema</p>
        </CardContent>
      </Card>

      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Asignaciones</CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAssignments}</div>
          <p className="text-muted-foreground mt-1 text-xs">Empleados asignados a turnos</p>
        </CardContent>
      </Card>

      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Planificadores</CardTitle>
          <UserCheck className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activePlanners}</div>
          <p className="text-muted-foreground mt-1 text-xs">Usuarios con permisos de planificación</p>
        </CardContent>
      </Card>

      <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Centros Activos</CardTitle>
          <Building2 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.costCentersWithShifts}</div>
          <p className="text-muted-foreground mt-1 text-xs">Centros con turnos configurados</p>
        </CardContent>
      </Card>
    </div>
  );
}
