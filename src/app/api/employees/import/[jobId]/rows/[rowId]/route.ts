import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireEmployeeImportPermission } from "@/server/actions/employee-import/permissions";
import { recalculateJobCounters } from "@/server/actions/employee-import/service";

export async function PATCH(request: NextRequest, context: { params: Promise<{ jobId: string; rowId: string }> }) {
  try {
    const user = await requireEmployeeImportPermission();
    const { jobId, rowId } = await context.params;
    const body = await request.json();
    const status = body?.status as "SKIPPED" | "READY";

    if (!["SKIPPED", "READY"].includes(status)) {
      return NextResponse.json({ error: "Estado no permitido." }, { status: 400 });
    }

    const row = await prisma.employeeImportRow.findFirst({
      where: { id: rowId, jobId },
      select: { id: true, job: { select: { orgId: true, status: true } } },
    });

    if (!row || row.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Fila no encontrada." }, { status: 404 });
    }

    if (!["VALIDATED", "DRAFT"].includes(row.job.status)) {
      return NextResponse.json(
        { error: "No puedes modificar filas después de confirmar la importación." },
        { status: 400 },
      );
    }

    await prisma.employeeImportRow.update({
      where: { id: rowId },
      data: { status },
    });

    await recalculateJobCounters(jobId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error actualizando fila de importación:", error);
    return NextResponse.json({ error: "No fue posible actualizar la fila." }, { status: 500 });
  }
}
