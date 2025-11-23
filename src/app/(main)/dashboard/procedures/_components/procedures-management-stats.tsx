import { Euro, Clock, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";

interface Procedure {
  status: string;
  expenses: { totalAmount: number }[];
  estimatedAmount: number | null;
  approvedAmount: number | null;
}

interface ProceduresManagementStatsProps {
  procedures: Procedure[];
  isMine?: boolean;
}

export function ProceduresManagementStats({ procedures, isMine }: ProceduresManagementStatsProps) {
  // Cálculos
  const totalProcedures = procedures.length;

  // Pendientes de autorización (Prioridad para managers)
  const pendingAuth = procedures.filter((p) => p.status === "PENDING_AUTHORIZATION").length;

  // Pendientes de justificación (Siguiente paso importante)
  const pendingJustification = procedures.filter((p) => p.status === "JUSTIFICATION_PENDING").length;

  // Total gastado (suma de gastos reales)
  const totalSpent = procedures.reduce((acc, proc) => {
    // Si tenemos gastos calculados en el objeto expenses, los usamos
    // Nota: en el array original de la DB 'expenses' puede venir o no con totalAmount.
    // Asumimos que la query incluye expenses.
    const procTotal = proc.expenses?.reduce((sum, exp) => sum + Number(exp.totalAmount || 0), 0) ?? 0;
    return acc + procTotal;
  }, 0);

  const totalSpentFormatted = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(totalSpent);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Card 1: Pendientes de Autorización (La más importante para gestión) */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Pendientes de Aprobar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <Clock className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-sm">
                {pendingAuth > 0 ? (
                  <>
                    Hay <span className="font-bold text-orange-600">{pendingAuth}</span> expedientes esperando
                    aprobación
                  </>
                ) : (
                  <>
                    <span className="font-medium text-green-600">Todo al día.</span> No hay solicitudes pendientes.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Pendientes de Justificar o Estado General */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="font-display text-xl">Seguimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
              <AlertCircle className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{pendingJustification} pendientes de justificar</p>
              <p className="text-muted-foreground text-sm">Expedientes autorizados sin cerrar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Volumen Total (Dinero) */}
      <Card>
        <CardHeader>
          <CardDescription>Volumen Gestionado</CardDescription>
          <div className="flex flex-col gap-2">
            <h4 className="font-display text-2xl lg:text-3xl">{totalSpentFormatted}</h4>
            <div className="text-muted-foreground text-sm">En {totalProcedures} expedientes listados</div>
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
