import { Euro, FileText, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";

interface Procedure {
  status: string;
  expenses: { totalAmount: any }[];
}

interface ProceduresStatsProps {
  procedures: Procedure[];
}

export function ProceduresStats({ procedures }: ProceduresStatsProps) {
  // Cálculos
  const totalProcedures = procedures.length;

  const activeProcedures = procedures.filter((p) =>
    ["DRAFT", "PENDING_AUTHORIZATION", "AUTHORIZED", "JUSTIFICATION_PENDING"].includes(p.status),
  ).length;

  const pendingAuth = procedures.filter((p) => p.status === "PENDING_AUTHORIZATION").length;

  const totalSpent = procedures.reduce((acc, proc) => {
    const procTotal = proc.expenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0);
    return acc + procTotal;
  }, 0);

  const totalSpentFormatted = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(totalSpent);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Card 1: Estado de solicitudes (Pendientes) */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Estado de solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <Clock className="size-5" />
            </div>
            <p className="text-muted-foreground text-sm">
              {pendingAuth > 0 ? (
                <>
                  Tienes{" "}
                  <span className="text-orange-600">
                    {pendingAuth} {pendingAuth === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                  </span>
                </>
              ) : (
                <>
                  Todas las solicitudes <span className="text-green-600">procesadas</span>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Expedientes Activos */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            {activeProcedures > 0 ? "Expedientes activos" : "Sin actividad reciente"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeProcedures > 0 ? (
            <div className="flex items-center gap-2">
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
                <FileText className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {activeProcedures} {activeProcedures === 1 ? "expediente" : "expedientes"} en curso
                </p>
                <p className="text-muted-foreground text-sm">Gestión de gastos y viajes</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
                <FileText className="size-5" />
              </div>
              <p className="text-muted-foreground text-sm">No tienes expedientes activos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Gasto Total (Balance Style) */}
      <Card>
        <CardHeader>
          <CardDescription>Gasto Total</CardDescription>
          <div className="flex flex-col gap-2">
            <h4 className="font-display text-2xl lg:text-3xl">{totalSpentFormatted}</h4>
            <div className="text-muted-foreground text-sm">Acumulado en {totalProcedures} expedientes</div>
          </div>
          <CardAction>
            <div className="flex gap-4">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                <Euro className="size-5" />
              </div>
            </div>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
