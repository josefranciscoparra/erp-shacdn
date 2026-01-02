import { resolveInviteStatus, upsertInviteMessage, type InviteStatus } from "@/lib/employee-import/invite-utils";
import type { EmployeeImportRowData, RowMessage } from "@/lib/employee-import/types";
import { prisma } from "@/lib/prisma";
import { sendEmployeeImportInvite } from "@/server/actions/employee-import/invite-service";

export type EmployeeImportInviteMode = "PENDING" | "FAILED" | "ALL";

interface InvitePerformedBy {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

function shouldSendInvite(inviteStatus: InviteStatus, mode: EmployeeImportInviteMode) {
  if (inviteStatus === "NOT_APPLICABLE") return false;
  if (mode === "ALL") return inviteStatus !== "SENT";
  if (mode === "FAILED") return inviteStatus === "FAILED";
  return inviteStatus === "PENDING";
}

export async function processEmployeeImportInvites(params: {
  jobId: string;
  orgId: string;
  mode: EmployeeImportInviteMode;
  performedBy: InvitePerformedBy;
  userAgent?: string | null;
}) {
  const { jobId, orgId, mode, performedBy, userAgent } = params;

  const job = await prisma.employeeImportJob.findFirst({
    where: { id: jobId, orgId },
    select: { id: true, status: true, options: true },
  });

  if (!job) {
    throw new Error("Importación no encontrada.");
  }

  const autoInviteEnabled = Boolean((job.options as { sendInvites?: boolean } | null)?.sendInvites);

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  const rows = await prisma.employeeImportRow.findMany({
    where: { jobId, status: "IMPORTED" },
    orderBy: { rowIndex: "asc" },
  });

  if (!rows.length) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const messages = Array.isArray(row.messages) ? (row.messages as RowMessage[]) : [];
    const inviteStatus = resolveInviteStatus({
      rowStatus: row.status,
      createdUserId: row.createdUserId,
      messages,
      autoInviteEnabled,
    });

    if (!shouldSendInvite(inviteStatus, mode)) {
      skipped += 1;
      continue;
    }

    const data = row.rawData as EmployeeImportRowData | null;
    const email = data?.email;
    const firstName = data?.firstName;
    const lastName = data?.lastName;

    if (!email || !firstName || !lastName || !row.createdUserId) {
      const inviteMessages = upsertInviteMessage({
        messages,
        type: "WARNING",
        message: "Invitación no enviada: faltan datos del empleado.",
      });

      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: { messages: inviteMessages },
      });
      failed += 1;
      continue;
    }

    const inviteResult = await sendEmployeeImportInvite({
      userId: row.createdUserId,
      email,
      firstName,
      lastName,
      orgId,
      organizationName: organization?.name ?? undefined,
      performedBy: { name: performedBy.name, email: performedBy.email },
    });

    const inviteMessages = upsertInviteMessage({
      messages,
      type: inviteResult.success ? "SUCCESS" : "WARNING",
      message: inviteResult.success
        ? "Invitación enviada correctamente."
        : `Invitación no enviada: ${inviteResult.error ?? "Error desconocido."}`,
    });

    await prisma.employeeImportRow.update({
      where: { id: row.id },
      data: { messages: inviteMessages },
    });

    if (inviteResult.success) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "BULK_IMPORT_INVITES_COMPLETED",
      category: "EMPLOYEE",
      entityId: job.id,
      entityType: "EmployeeImportJob",
      description: `Invitaciones completadas. Enviadas: ${sent}, fallidas: ${failed}, omitidas: ${skipped}.`,
      performedById: performedBy.id,
      performedByEmail: performedBy.email,
      performedByName: performedBy.name ?? performedBy.email,
      performedByRole: performedBy.role,
      orgId,
      userAgent: userAgent ?? undefined,
    },
  });

  return { sent, failed, skipped };
}
