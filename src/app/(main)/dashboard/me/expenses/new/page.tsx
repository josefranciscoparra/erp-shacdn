import { getProcedures } from "@/server/actions/expense-procedures";

import NewExpenseClient from "./new-expense-client";

export default async function NewExpensePage() {
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

  return <NewExpenseClient activeProcedures={activeProcedures} />;
}
