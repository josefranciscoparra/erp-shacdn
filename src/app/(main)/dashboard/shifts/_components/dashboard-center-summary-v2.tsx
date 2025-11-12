/**
 * Resumen por Centro de Trabajo (Rediseño v2)
 *
 * Accordion con estadísticas de cada centro
 * Diseño limpio con barras de progreso y chips de estado
 */

"use client";

import { Building2, ChevronRight } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-xl font-semibold">📊 Resumen por Centro</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (centers.length === 0) {
    return (
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-xl font-semibold">📊 Resumen por Centro</CardTitle>
          <CardDescription>No hay centros de trabajo configurados</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-xl font-semibold">📊 Resumen por Centro</CardTitle>
        <CardDescription className="text-muted-foreground mt-1 text-sm">
          Estadísticas de cada lugar de trabajo
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        <Accordion type="multiple" className="space-y-2">
          {centers.map((center) => (
            <AccordionItem key={center.id} value={center.id} className="rounded-lg border">
              <AccordionTrigger className="hover:bg-muted/50 rounded-lg px-4 py-3 transition-colors hover:no-underline">
                <div className="flex w-full items-center justify-between pr-4">
                  {/* Info del centro */}
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 shrink-0 rounded-full p-2">
                      <Building2 className="text-primary size-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{center.name}</p>
                      <p className="text-muted-foreground text-xs">{center.totalShifts} turnos asignados</p>
                    </div>
                  </div>

                  {/* Estadísticas y badges */}
                  <div className="flex items-center gap-3">
                    {/* Barra de cobertura */}
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            center.coverage >= 80
                              ? "bg-emerald-500"
                              : center.coverage >= 60
                                ? "bg-amber-500"
                                : "bg-red-500",
                          )}
                          style={{ width: `${center.coverage}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-medium">{center.coverage}%</span>
                    </div>

                    {/* Badge de alertas */}
                    {center.alerts > 0 && (
                      <Badge variant="destructive" className="shrink-0 text-xs">
                        {center.alerts} {center.alerts === 1 ? "aviso" : "avisos"}
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-3">
                <div className="mt-2 space-y-2">
                  {/* Zonas del centro */}
                  {center.zones.map((zone, idx) => (
                    <div
                      key={idx}
                      className="bg-muted flex items-center justify-between rounded-md border border-transparent p-3 transition-colors hover:border-slate-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{zone.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {zone.assignedEmployees} de {zone.requiredEmployees} empleados asignados
                        </p>
                      </div>

                      {/* Barra de progreso de la zona */}
                      <div className="ml-4 flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              zone.coverage === 100
                                ? "bg-emerald-500"
                                : zone.coverage >= 70
                                  ? "bg-amber-500"
                                  : "bg-red-500",
                            )}
                            style={{ width: `${zone.coverage}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "w-10 text-right text-xs font-medium",
                            zone.coverage === 100
                              ? "text-emerald-600"
                              : zone.coverage >= 70
                                ? "text-amber-600"
                                : "text-red-600",
                          )}
                        >
                          {zone.coverage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Footer con "Ver más" si hay muchos centros */}
        {centers.length > 3 && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
              Ver detalles completos →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
