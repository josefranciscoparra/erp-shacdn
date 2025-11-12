/**
 * Resumen por Centro de Trabajo
 *
 * Accordion que muestra estadísticas y avisos de cada CostCenter
 */

"use client";

import { Building2, TrendingUp } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { CenterSummary } from "../_lib/dashboard-utils";

interface CenterSummaryProps {
  summaries: CenterSummary[];
  isLoading?: boolean;
}

export function CenterSummaryAccordion({ summaries, isLoading }: CenterSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Resumen por Centro</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Resumen por Centro</CardTitle>
          <CardDescription>No hay centros de trabajo configurados</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Resumen por Centro</CardTitle>
        <CardDescription>Estadísticas y avisos de cada lugar de trabajo</CardDescription>
      </CardHeader>

      <CardContent>
        <Accordion type="multiple" className="w-full">
          {summaries.map((summary) => (
            <AccordionItem key={summary.costCenterId} value={summary.costCenterId}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
                      <Building2 className="text-primary size-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{summary.costCenterName}</p>
                      <p className="text-muted-foreground text-xs">{summary.totalShifts} turnos asignados</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Badge de cobertura */}
                    <Badge
                      variant={
                        summary.averageCoverage >= 100
                          ? "default"
                          : summary.averageCoverage >= 70
                            ? "secondary"
                            : "destructive"
                      }
                      className={cn(
                        "text-xs",
                        summary.averageCoverage >= 70 &&
                          summary.averageCoverage < 100 &&
                          "border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-950/30",
                      )}
                    >
                      {Math.round(summary.averageCoverage)}% cobertura
                    </Badge>

                    {/* Badge de alertas */}
                    {summary.alerts.length > 0 && (
                      <Badge
                        variant={summary.alerts.some((a) => a.severity === "error") ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {summary.alerts.length} {summary.alerts.length === 1 ? "aviso" : "avisos"}
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Estadísticas del centro */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Turnos por estado */}
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground mb-2 text-xs font-medium">Estado de Turnos</p>
                      <div className="flex flex-wrap gap-2">
                        {summary.draftShifts > 0 && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                          >
                            <span className="text-xs font-semibold">{summary.draftShifts}</span>
                            <span className="text-xs">Borrador</span>
                          </Badge>
                        )}
                        {summary.publishedShifts > 0 && (
                          <Badge variant="default" className="gap-1">
                            <span className="text-xs font-semibold">{summary.publishedShifts}</span>
                            <span className="text-xs">Publicado</span>
                          </Badge>
                        )}
                        {summary.conflictShifts > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <span className="text-xs font-semibold">{summary.conflictShifts}</span>
                            <span className="text-xs">Conflictos</span>
                          </Badge>
                        )}
                        {summary.draftShifts === 0 && summary.publishedShifts === 0 && summary.conflictShifts === 0 && (
                          <p className="text-muted-foreground text-xs">Sin turnos</p>
                        )}
                      </div>
                    </div>

                    {/* Cobertura */}
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground mb-2 text-xs font-medium">Cobertura Promedio</p>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full border",
                            summary.averageCoverage >= 100 &&
                              "border-green-300 bg-green-100 dark:border-green-800 dark:bg-green-900/30",
                            summary.averageCoverage >= 70 &&
                              summary.averageCoverage < 100 &&
                              "border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30",
                            summary.averageCoverage < 70 &&
                              "border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-900/30",
                          )}
                        >
                          <TrendingUp
                            className={cn(
                              "size-4",
                              summary.averageCoverage >= 100 && "text-green-600 dark:text-green-400",
                              summary.averageCoverage >= 70 &&
                                summary.averageCoverage < 100 &&
                                "text-amber-600 dark:text-amber-400",
                              summary.averageCoverage < 70 && "text-red-600 dark:text-red-400",
                            )}
                          />
                        </div>
                        <p className="text-2xl font-semibold">{Math.round(summary.averageCoverage)}%</p>
                      </div>
                    </div>

                    {/* Avisos */}
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground mb-2 text-xs font-medium">Avisos</p>
                      <div className="flex items-center gap-2">
                        {summary.alerts.length === 0 ? (
                          <p className="text-muted-foreground text-xs">Sin avisos pendientes</p>
                        ) : (
                          <>
                            <div
                              className={cn(
                                "flex size-8 items-center justify-center rounded-full border text-xs font-bold",
                                summary.alerts.some((a) => a.severity === "error")
                                  ? "border-red-300 bg-red-100 text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "border-amber-300 bg-amber-100 text-amber-600 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                              )}
                            >
                              {summary.alerts.length}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {summary.alerts.length} {summary.alerts.length === 1 ? "aviso" : "avisos"} pendiente
                              {summary.alerts.length === 1 ? "" : "s"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalles de avisos */}
                  {summary.alerts.length > 0 && (
                    <div className="bg-muted/30 rounded-lg border p-3">
                      <p className="text-muted-foreground mb-2 text-xs font-medium">Detalles de Avisos</p>
                      <ul className="space-y-1">
                        {summary.alerts.map((alert) => (
                          <li key={alert.id} className="flex items-center gap-2 text-xs">
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                alert.severity === "error" && "bg-red-600",
                                alert.severity === "warning" && "bg-amber-600",
                                alert.severity === "info" && "bg-blue-600",
                              )}
                            />
                            <span className="text-muted-foreground">{alert.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
