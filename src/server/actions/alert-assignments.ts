"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildScopeFilter } from "@/services/permissions/scope-helpers";

async function assertAlertAccess(alertId: string, userId: string, orgId: string) {
  const scopeFilter = await buildScopeFilter(userId, "VIEW_ALERTS");
  const where: Record<string, unknown> = { id: alertId, orgId };

  if (Object.keys(scopeFilter).length > 0) {
    where.employee = scopeFilter;
  }

  const alert = await prisma.alert.findFirst({ where });
  if (!alert) {
    throw new Error("Alerta no encontrada o sin permisos");
  }

  return alert;
}

export async function getAlertAssignments(alertId: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.orgId) {
    throw new Error("Usuario no autenticado");
  }

  await assertAlertAccess(alertId, session.user.id, session.user.orgId);

  const assignments = await prisma.alertAssignment.findMany({
    where: { alertId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return assignments.map((assignment) => ({
    id: assignment.id,
    userId: assignment.userId,
    source: assignment.source,
    user: assignment.user,
  }));
}
