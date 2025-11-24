import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/server/actions/shared/get-authenticated-employee";

import { ProcedureForm } from "../_components/procedure-form";

export default async function NewProcedurePage({ searchParams }: { searchParams: Promise<{ context?: string }> }) {
  const { role, employee } = await getAuthenticatedUser();
  const { context } = await searchParams;

  const canAssignEmployee = ["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(role);
  const isMyContext = context === "mine";

  // Si vienes de "Mis Expedientes" (context=mine), forzamos canAssignEmployee a false
  // para cumplir la regla: "Desde mi área solo creo para mí".
  // Aunque seas manager, si entras desde "Mis expedientes", creas para ti.
  const effectiveCanAssign = isMyContext ? false : canAssignEmployee;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Expediente</h1>
        <p className="text-muted-foreground">Inicia un nuevo procedimiento de gasto o comisión de servicio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del Expediente</CardTitle>
        </CardHeader>
        <CardContent>
          <ProcedureForm
            canAssignEmployee={effectiveCanAssign}
            returnToMyProcedures={isMyContext}
            currentEmployeeId={employee?.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
