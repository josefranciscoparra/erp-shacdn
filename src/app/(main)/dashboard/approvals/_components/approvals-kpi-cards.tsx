"use client";

import { CheckCircle2, Clock, FileText, AlertCircle, FileCheck } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PendingApprovalItem } from "@/server/actions/approvals";

interface ApprovalsKpiCardsProps {
  items: PendingApprovalItem[];
  loading: boolean;
}

export function ApprovalsKpiCards({ items, loading }: ApprovalsKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="gap-2">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const pendingCount = items.length;
  const ptoCount = items.filter((i) => i.type === "PTO").length;
  const expenseCount = items.filter((i) => i.type === "EXPENSE").length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Card 1: Total Pendientes */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Estado de aprobaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <FileCheck className="size-5" />
            </div>
            <p className="text-muted-foreground text-sm">
              {pendingCount > 0 ? (
                <>
                  Tienes{" "}
                  <span className="text-foreground font-medium">
                    {pendingCount} {pendingCount === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                  </span>{" "}
                  de revisión.
                </>
              ) : (
                <>Estás al día. No hay solicitudes pendientes.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Desglose Ausencias */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Ausencias y Permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <Clock className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {ptoCount > 0 ? `${ptoCount} Solicitudes de ausencia` : "Sin solicitudes de ausencia"}
              </p>
              <p className="text-muted-foreground text-sm">Vacaciones, bajas y permisos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Gastos y Otros */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Gastos y Fichajes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <FileText className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {expenseCount > 0 ? `${expenseCount} Solicitudes varias` : "Sin otros pendientes"}
              </p>
              <p className="text-muted-foreground text-sm">Correcciones de fichaje y gastos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
