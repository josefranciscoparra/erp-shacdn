import { getOrganizationPolicy } from "@/server/actions/expense-policies";
import { getProcedures } from "@/server/actions/expense-procedures";

import { serializeExpensePolicy } from "../_lib/expense-policy";

import NewExpenseClient from "./new-expense-client";

export default async function NewExpensePage() {
  // Obtener política de la organización para configurar el formulario
  const { policy, expenseMode } = await getOrganizationPolicy();
  const serializedPolicy = serializeExpensePolicy(policy, expenseMode);

  let activeProcedures: { id: string; name: string; code: string | null }[] = [];
  if (serializedPolicy?.expenseMode !== "PRIVATE") {
    // Obtener expedientes activos del usuario o disponibles para él
    // Filtramos por estado AUTHORIZED (que son los únicos que admiten gastos)
    const { procedures } = await getProcedures({
      mine: true,
      status: "AUTHORIZED",
    });

    activeProcedures = (procedures ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
    }));
  }

  return <NewExpenseClient activeProcedures={activeProcedures} policy={serializedPolicy} />;
}
