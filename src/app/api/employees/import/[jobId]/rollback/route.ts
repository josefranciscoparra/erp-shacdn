import { NextRequest, NextResponse } from "next/server";

import type { RowMessage } from "@/lib/employee-import/types";
import { prisma } from "@/lib/prisma";
import { requireEmployeeImportPermission } from "@/server/actions/employee-import/permissions";
import { recalculateJobCounters } from "@/server/actions/employee-import/service";

function isMissingTableError(error: unknown) {
  const message = String(error ?? "");
  if (message.includes("P2021") || message.includes("P2022")) return true;
  if (message.includes("does not exist") || message.includes("no existe")) return true;
  return false;
}

async function safeCount(countPromise: Promise<number>) {
  try {
    return await countPromise;
  } catch (error) {
    if (isMissingTableError(error)) {
      return 0;
    }
    throw error;
  }
}

function removeImportMessages(messages: RowMessage[] | null) {
  if (!Array.isArray(messages)) return [];
  return messages.filter((message) => message.field !== "invite" && message.field !== "simulation");
}

export async function POST(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireEmployeeImportPermission();
    const { jobId } = await context.params;

    const job = await prisma.employeeImportJob.findFirst({
      where: { id: jobId, orgId: user.orgId },
      select: { id: true, status: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    }

    if (job.status === "RUNNING") {
      return NextResponse.json({ error: "La importación aún está en proceso." }, { status: 400 });
    }

    if (!["DONE", "FAILED"].includes(job.status)) {
      return NextResponse.json({ error: "No hay una importación confirmada para revertir." }, { status: 400 });
    }

    const rows = await prisma.employeeImportRow.findMany({
      where: { jobId, createdEmployeeId: { not: null } },
      select: {
        id: true,
        createdEmployeeId: true,
        createdUserId: true,
        messages: true,
      },
    });

    if (!rows.length) {
      return NextResponse.json({ error: "No hay empleados importados para revertir." }, { status: 400 });
    }

    const employeeIds = rows.map((row) => row.createdEmployeeId).filter(Boolean) as string[];
    const userIds = rows.map((row) => row.createdUserId).filter(Boolean) as string[];

    const [
      timeEntries,
      workdaySummaries,
      ptoRequests,
      manualEntries,
      expenses,
      expenseReports,
      expenseProcedures,
      employeeDocuments,
      payslipItems,
      timeBankMovements,
      timeBankRequests,
      overworkAuthorizations,
    ] = await Promise.all([
      safeCount(prisma.timeEntry.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.workdaySummary.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.ptoRequest.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.manualTimeEntryRequest.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.expense.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.expenseReport.count({ where: { ownerId: { in: employeeIds } } })),
      safeCount(prisma.expenseProcedure.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.employeeDocument.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.payslipUploadItem.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.timeBankMovement.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.timeBankRequest.count({ where: { employeeId: { in: employeeIds } } })),
      safeCount(prisma.overworkAuthorization.count({ where: { employeeId: { in: employeeIds } } })),
    ]);

    const totalActivity =
      timeEntries +
      workdaySummaries +
      ptoRequests +
      manualEntries +
      expenses +
      expenseReports +
      expenseProcedures +
      employeeDocuments +
      payslipItems +
      timeBankMovements +
      timeBankRequests +
      overworkAuthorizations;

    if (totalActivity > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede revertir: existen fichajes, ausencias, gastos, documentos o actividad asociada a estos empleados.",
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (userIds.length) {
        await tx.userOrganization.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.emailLog.deleteMany({
          where: { userId: { in: userIds } },
        });
      }

      await tx.employee.deleteMany({
        where: { id: { in: employeeIds } },
      });

      if (userIds.length) {
        await tx.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }

      for (const row of rows) {
        await tx.employeeImportRow.update({
          where: { id: row.id },
          data: {
            status: "READY",
            createdEmployeeId: null,
            createdUserId: null,
            errorReason: null,
            messages: removeImportMessages(row.messages as RowMessage[] | null),
          },
        });
      }

      await tx.employeeImportJob.update({
        where: { id: jobId },
        data: { status: "VALIDATED", completedAt: null },
      });

      await tx.auditLog.create({
        data: {
          action: "BULK_IMPORT_ROLLBACK",
          category: "EMPLOYEE",
          entityId: job.id,
          entityType: "EmployeeImportJob",
          description: `Rollback de importación: ${employeeIds.length} empleados eliminados.`,
          performedById: user.id,
          performedByEmail: user.email,
          performedByName: user.name ?? user.email,
          performedByRole: user.role,
          orgId: user.orgId,
          userAgent: request.headers.get("user-agent"),
        },
      });
    });

    await recalculateJobCounters(jobId);

    return NextResponse.json({ success: true, reverted: employeeIds.length });
  } catch (error) {
    console.error("Error revirtiendo importación de empleados:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible revertir la importación.",
      },
      { status: 500 },
    );
  }
}
