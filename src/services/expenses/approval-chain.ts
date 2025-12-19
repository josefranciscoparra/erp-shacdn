import { resolveApproverUsers } from "@/lib/approvals/approval-engine";

type ExpenseContext = {
  id: string;
  orgId: string;
  employeeId: string;
  costCenterId?: string | null;
  createdBy: string;
};

/**
 * Construye la cadena de aprobadores para un gasto en función de:
 * - Configuracion de aprobaciones por organizacion (primer criterio que aplique)
 * - Fallback a RRHH/Administracion si no hay candidatos
 */
export async function buildApprovalChain(expense: ExpenseContext): Promise<string[]> {
  const approvers = await resolveApproverUsers(expense.employeeId, expense.orgId, "EXPENSE");
  const uniqueApprovers = approvers.map((approver) => approver.userId);

  const chain = uniqueApprovers.filter((userId) => userId !== expense.createdBy);
  if (chain.length === 0) {
    throw new Error("No se encontró ningún aprobador disponible para este gasto");
  }

  return chain;
}
