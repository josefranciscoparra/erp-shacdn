import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireEmployeeImportPermission } from "@/server/actions/employee-import/permissions";
import { enqueueEmployeeImportJob } from "@/server/jobs/employee-import-queue";

export async function POST(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireEmployeeImportPermission();
    const { jobId } = await context.params;
    const job = await prisma.employeeImportJob.findFirst({
      where: { id: jobId, orgId: user.orgId },
      select: { id: true, status: true, orgId: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    }

    if (job.status !== "VALIDATED") {
      return NextResponse.json({ error: "La importación ya fue procesada." }, { status: 400 });
    }

    const readyCount = await prisma.employeeImportRow.count({
      where: { jobId, status: "READY" },
    });

    if (readyCount === 0) {
      return NextResponse.json({ error: "No hay filas listas para importar." }, { status: 400 });
    }

    await prisma.employeeImportJob.update({
      where: { id: jobId },
      data: { status: "RUNNING" },
    });

    await prisma.auditLog.create({
      data: {
        action: "BULK_IMPORT_STARTED",
        category: "EMPLOYEE",
        entityId: job.id,
        entityType: "EmployeeImportJob",
        description: `Inicio importación masiva de empleados (${readyCount} filas listas).`,
        performedById: user.id,
        performedByEmail: user.email,
        performedByName: user.name ?? user.email,
        performedByRole: user.role,
        orgId: user.orgId,
        userAgent: request.headers.get("user-agent"),
      },
    });

    await enqueueEmployeeImportJob({
      jobId,
      orgId: user.orgId,
      performedBy: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json(
      {
        jobId,
        queued: readyCount,
        status: "RUNNING",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Error confirmando importación de empleados:", error);
    return NextResponse.json({ error: "No fue posible procesar la importación." }, { status: 500 });
  }
}
