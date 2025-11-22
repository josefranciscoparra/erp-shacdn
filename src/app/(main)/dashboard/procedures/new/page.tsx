import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/server/actions/shared/get-authenticated-employee";

import { ProcedureForm } from "../_components/procedure-form";

export default async function NewProcedurePage() {
  const { role } = await getAuthenticatedUser();

  const canAssignEmployee = ["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(role);

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
          <ProcedureForm canAssignEmployee={canAssignEmployee} />
        </CardContent>
      </Card>
    </div>
  );
}
