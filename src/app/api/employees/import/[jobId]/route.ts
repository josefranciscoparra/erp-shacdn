import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireEmployeeImportPermission } from "@/server/actions/employee-import/permissions";

const DEFAULT_PAGE_SIZE = 25;

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireEmployeeImportPermission();
    const { jobId } = await context.params;

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);
    const skip = Math.max(0, (page - 1) * pageSize);

    const job = await prisma.employeeImportJob.findFirst({
      where: { id: jobId, orgId: user.orgId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        validatedAt: true,
        completedAt: true,
        totalRows: true,
        readyRows: true,
        skippedRows: true,
        warningRows: true,
        errorRows: true,
        importedRows: true,
        failedRows: true,
        options: true,
        fileName: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    }

    const rows = await prisma.employeeImportRow.findMany({
      where: { jobId },
      orderBy: { rowIndex: "asc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        rowIndex: true,
        status: true,
        messages: true,
        rawData: true,
        errorReason: true,
        createdEmployeeId: true,
      },
    });

    return NextResponse.json({
      job,
      rows,
      pagination: {
        page,
        pageSize,
        total: job.totalRows,
      },
    });
  } catch (error) {
    console.error("Error obteniendo importación de empleados:", error);
    return NextResponse.json({ error: "No fue posible obtener la importación solicitada." }, { status: 500 });
  }
}
