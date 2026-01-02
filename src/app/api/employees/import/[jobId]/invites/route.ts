import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { RowMessage } from "@/lib/employee-import/types";
import { getInviteMessage, resolveInviteStatus } from "@/lib/employee-import/invite-utils";
import { requireEmployeeImportPermission } from "@/server/actions/employee-import/permissions";
import { enqueueEmployeeImportInviteJob } from "@/server/jobs/employee-import-invite-queue";
import type { EmployeeImportInviteMode } from "@/server/jobs/employee-import-invite-processor";

function normalizeMode(mode?: string | null): EmployeeImportInviteMode {
  if (mode === "ALL" || mode === "FAILED" || mode === "PENDING") {
    return mode;
  }
  return "PENDING";
}

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireEmployeeImportPermission();
    const { jobId } = await context.params;

    const job = await prisma.employeeImportJob.findFirst({
      where: { id: jobId, orgId: user.orgId },
      select: { id: true, status: true, options: true, fileName: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    }

    const autoInviteEnabled = Boolean((job.options as { sendInvites?: boolean } | null)?.sendInvites);

    const rows = await prisma.employeeImportRow.findMany({
      where: { jobId },
      orderBy: { rowIndex: "asc" },
      select: {
        id: true,
        rowIndex: true,
        status: true,
        messages: true,
        rawData: true,
        errorReason: true,
        createdUserId: true,
      },
    });

    const mappedRows = rows.map((row) => {
      const rawData = (row.rawData ?? {}) as Record<string, unknown>;
      const firstName = typeof rawData.firstName === "string" ? rawData.firstName : "";
      const lastName = typeof rawData.lastName === "string" ? rawData.lastName : "";
      const email = typeof rawData.email === "string" ? rawData.email : null;
      const messages = Array.isArray(row.messages) ? (row.messages as RowMessage[]) : [];
      const inviteMessage = getInviteMessage(messages);
      const inviteStatus = resolveInviteStatus({
        rowStatus: row.status,
        createdUserId: row.createdUserId,
        messages,
        autoInviteEnabled,
      });
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        id: row.id,
        rowIndex: row.rowIndex,
        status: row.status,
        fullName: fullName.length ? fullName : "—",
        email,
        inviteStatus,
        inviteMessage: inviteMessage?.message || null,
        errorReason: row.errorReason ?? null,
      };
    });

    let pending = 0;
    let sent = 0;
    let failed = 0;
    let notApplicable = 0;

    mappedRows.forEach((row) => {
      if (row.inviteStatus === "PENDING") pending += 1;
      else if (row.inviteStatus === "SENT") sent += 1;
      else if (row.inviteStatus === "FAILED") failed += 1;
      else notApplicable += 1;
    });

    return NextResponse.json({
      job,
      summary: {
        totalEligible: pending + sent + failed,
        pending,
        sent,
        failed,
        notApplicable,
      },
      rows: mappedRows,
    });
  } catch (error) {
    console.error("Error obteniendo estado de invitaciones:", error);
    return NextResponse.json({ error: "No fue posible obtener el estado de invitaciones." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireEmployeeImportPermission();
    const { jobId } = await context.params;

    const job = await prisma.employeeImportJob.findFirst({
      where: { id: jobId, orgId: user.orgId },
      select: { id: true, status: true, orgId: true, options: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    }

    if (job.status === "RUNNING") {
      return NextResponse.json({ error: "La importación aún está en proceso." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const mode = normalizeMode(typeof body?.mode === "string" ? body.mode : null);

    const autoInviteEnabled = Boolean((job.options as { sendInvites?: boolean } | null)?.sendInvites);

    const rows = await prisma.employeeImportRow.findMany({
      where: { jobId, status: "IMPORTED" },
      select: { id: true, status: true, messages: true, createdUserId: true },
    });

    const eligibleRows = rows.filter((row) => {
      const messages = Array.isArray(row.messages) ? (row.messages as RowMessage[]) : [];
      const inviteStatus = resolveInviteStatus({
        rowStatus: row.status,
        createdUserId: row.createdUserId,
        messages,
        autoInviteEnabled,
      });

      if (mode === "ALL") return inviteStatus !== "SENT";
      if (mode === "FAILED") return inviteStatus === "FAILED";
      return inviteStatus === "PENDING";
    });

    if (!eligibleRows.length) {
      return NextResponse.json({ error: "No hay invitaciones pendientes para procesar." }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: {
        action: "BULK_IMPORT_INVITES_STARTED",
        category: "EMPLOYEE",
        entityId: job.id,
        entityType: "EmployeeImportJob",
        description: `Inicio envío de invitaciones (${eligibleRows.length} registros).`,
        performedById: user.id,
        performedByEmail: user.email,
        performedByName: user.name ?? user.email,
        performedByRole: user.role,
        orgId: user.orgId,
        userAgent: request.headers.get("user-agent"),
      },
    });

    await enqueueEmployeeImportInviteJob({
      jobId,
      orgId: user.orgId,
      mode,
      performedBy: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ jobId, queued: eligibleRows.length, status: "RUNNING" }, { status: 202 });
  } catch (error) {
    console.error("Error enviando invitaciones:", error);
    return NextResponse.json({ error: "No fue posible procesar las invitaciones." }, { status: 500 });
  }
}
