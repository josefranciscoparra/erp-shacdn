/**
 * Resumen por Centro de Trabajo (Rediseño v3 - Factorial Style)
 *
 * Tabla simple con estadísticas esenciales de cada centro
 * Diseño minimalista sin accordion ni elementos innecesarios
 */

"use client";

import { AlertCircle, Building2, CheckCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { MockCenter } from "../_lib/dashboard-mock-data";

interface DashboardCenterSummaryProps {
  centers: MockCenter[];
  isLoading?: boolean;
}

export function DashboardCenterSummaryV2({ centers, isLoading }: DashboardCenterSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium">Resumen por Centro</CardTitle>
            <CardDescription className="text-xs">Cargando...</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (centers.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium">Resumen por Centro</CardTitle>
            <CardDescription className="text-xs">No hay centros configurados</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">Resumen por Centro</CardTitle>
          <CardDescription className="text-xs">
            {centers.length} {centers.length === 1 ? "centro de trabajo" : "centros de trabajo"}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {/* Tabla simple estilo DataTable */}
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Centro</th>
                <th className="px-4 py-2 text-center font-medium">Cobertura</th>
                <th className="px-4 py-2 text-center font-medium">Turnos</th>
                <th className="px-4 py-2 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {centers.map((center) => (
                <tr key={center.id} className="hover:bg-muted/30 transition-colors">
                  {/* Nombre del centro */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 shrink-0 rounded-full p-1.5">
                        <Building2 className="text-primary size-3.5" />
                      </div>
                      <span className="font-medium">{center.name}</span>
                    </div>
                  </td>

                  {/* Cobertura con barra de progreso */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            center.coverage >= 80
                              ? "bg-emerald-500"
                              : center.coverage >= 60
                                ? "bg-amber-500"
                                : "bg-red-500",
                          )}
                          style={{
                            width: `${center.coverage}%`,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "w-10 text-right text-xs font-medium tabular-nums",
                          center.coverage >= 80
                            ? "text-emerald-600"
                            : center.coverage >= 60
                              ? "text-amber-600"
                              : "text-red-600",
                        )}
                      >
                        {center.coverage}%
                      </span>
                    </div>
                  </td>

                  {/* Turnos asignados */}
                  <td className="px-4 py-3 text-center tabular-nums">{center.totalShifts}</td>

                  {/* Estado con badge */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      {center.alerts > 0 ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertCircle className="size-3" />
                          {center.alerts} {center.alerts === 1 ? "aviso" : "avisos"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-200 bg-emerald-50 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20"
                        >
                          <CheckCircle className="size-3" />
                          OK
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
