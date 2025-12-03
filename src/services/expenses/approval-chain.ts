import { prisma } from "@/lib/prisma";

type ExpenseContext = {
  id: string;
  orgId: string;
  employeeId: string;
  costCenterId?: string | null;
  createdBy: string;
};

type ApprovalFlow = "DEFAULT" | "HR_ONLY";

/**
 * Construye la cadena de aprobadores para un gasto en función de:
 * - Responsable de centro de coste (si aplica)
 * - Aprobador específico del empleado
 * - Manager directo
 * - Aprobadores organizacionales (ej. RRHH/Finanzas)
 */
export async function buildApprovalChain(
  expense: ExpenseContext,
  approvalLevels: number,
  approvalFlow: ApprovalFlow = "DEFAULT",
): Promise<string[]> {
  const [employee, contract, costCenterResponsible, orgApprovers] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: expense.employeeId },
      select: {
        expenseApproverId: true,
      },
    }),
    prisma.employmentContract.findFirst({
      where: {
        employeeId: expense.employeeId,
        orgId: expense.orgId,
        active: true,
      },
      include: {
        manager: {
          include: { user: { select: { id: true, active: true } } },
        },
      },
    }),
    expense.costCenterId
      ? prisma.areaResponsible.findFirst({
          where: {
            costCenterId: expense.costCenterId,
            orgId: expense.orgId,
            isActive: true,
            scope: "COST_CENTER",
          },
          include: { user: { select: { id: true, active: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve(null),
    prisma.expenseApprover.findMany({
      where: { orgId: expense.orgId },
      include: {
        user: {
          select: { id: true, active: true },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
    }),
  ]);

  const chain: string[] = [];
  const add = (userId?: string | null) => {
    if (!userId) return;
    if (userId === expense.createdBy) return; // Evitar auto-aprobación
    if (!chain.includes(userId)) chain.push(userId);
  };

  // Nivel 1: Responsable de centro (si aplica) o manager / aprobador específico (solo si no es HR_ONLY)
  if (approvalFlow !== "HR_ONLY") {
    const primaryCandidate =
      costCenterResponsible?.user?.id ?? employee?.expenseApproverId ?? contract?.manager?.user?.id ?? null;
    add(primaryCandidate);
  }

  // Resto de niveles: Aprobadores organizacionales (ej. RRHH/Finanzas) según orden
  for (const approver of orgApprovers) {
    if (chain.length >= approvalLevels) break;
    if (!approver.user?.active) continue;
    add(approver.userId);
  }

  // Fallback: si no hay nadie aún, buscar HR/ADMIN genérico
  if (chain.length === 0) {
    const fallbackHr = await prisma.user.findFirst({
      where: {
        orgId: expense.orgId,
        role: { in: ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"] },
        active: true,
      },
      select: { id: true },
    });
    add(fallbackHr?.id);
  }

  if (chain.length === 0) {
    throw new Error("No se encontró ningún aprobador disponible para este gasto");
  }

  return chain.slice(0, approvalLevels);
}
