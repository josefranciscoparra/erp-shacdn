import { getOrganizationPolicy } from "@/server/actions/expense-policies";
import { getProcedures } from "@/server/actions/expense-procedures";

import NewExpenseClient from "./new-expense-client";

export default async function NewExpensePage() {
  // Obtener política de la organización para configurar el formulario
  const { policy } = await getOrganizationPolicy();

  // Obtener expedientes activos del usuario o disponibles para él
  // Filtramos por estado AUTHORIZED (que son los únicos que admiten gastos)
  const { procedures } = await getProcedures({
    mine: true,
    status: "AUTHORIZED",
  });

  // Mapear para el cliente
  const activeProcedures =
    procedures?.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
    })) || [];

  // Serializar política para cliente
  const serializedPolicy = policy
    ? {
        mileageRate: Number(policy.mileageRateEurPerKm),
      }
    : undefined;

  return <NewExpenseClient activeProcedures={activeProcedures} policy={serializedPolicy} />;
}
