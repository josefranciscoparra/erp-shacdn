import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireEmployeeImportPermission } from "@/server/actions/employee-import/permissions";
import { recalculateJobCounters } from "@/server/actions/employee-import/service";

export async function PATCH(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireEmployeeImportPermission();
    const { jobId } = await context.params;
    const body = await request.json();

    const rowIds = Array.isArray(body?.rowIds) ? body.rowIds.filter((id) => typeof id === "string") : [];
    const status = body?.status as "SKIPPED" | "READY";

    if (!rowIds.length) {
      return NextResponse.json({ error: "Debes seleccionar al menos una fila." }, { status: 400 });
    }

    if (!["SKIPPED", "READY"].includes(status)) {
      return NextResponse.json({ error: "Estado no permitido." }, { status: 400 });
    }

    const job = await prisma.employeeImportJob.findFirst({
      where: { id: jobId, orgId: user.orgId },
      select: { id: true, status: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    }

    if (!["VALIDATED", "DRAFT"].includes(job.status)) {
      return NextResponse.json(
        { error: "No puedes modificar filas después de confirmar la importación." },
        { status: 400 },
      );
    }

    const rowsCount = await prisma.employeeImportRow.count({
      where: { jobId, id: { in: rowIds } },
    });

    if (rowsCount !== rowIds.length) {
      return NextResponse.json({ error: "Algunas filas no pertenecen a esta importación." }, { status: 400 });
    }

    const updated = await prisma.employeeImportRow.updateMany({
      where: { jobId, id: { in: rowIds } },
      data: { status },
    });

    await recalculateJobCounters(jobId);

    return NextResponse.json({ success: true, updated: updated.count });
  } catch (error) {
    console.error("Error actualizando filas en lote:", error);
    return NextResponse.json({ error: "No fue posible actualizar las filas." }, { status: 500 });
  }
}
