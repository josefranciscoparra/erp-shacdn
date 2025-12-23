import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireEmployeeImportPermission } from "@/server/actions/employee-import/permissions";

function toCsvValue(value: unknown) {
  const str = value === undefined || value === null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await requireEmployeeImportPermission();
    const { jobId } = await context.params;

    const job = await prisma.employeeImportJob.findFirst({
      where: { id: jobId, orgId: user.orgId },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
    }

    const rows = await prisma.employeeImportRow.findMany({
      where: { jobId },
      orderBy: { rowIndex: "asc" },
      select: { rowIndex: true, status: true, errorReason: true, messages: true, rawData: true },
    });

    const header = ["rowIndex", "status", "errorReason", "warnings", "email", "nifNie", "firstName", "lastName"].join(
      ",",
    );
    const csvRows = rows.map((row) => {
      const data = row.rawData as Record<string, unknown> | null;
      const warnings = (row.messages as { type: string; message: string }[])
        .filter((message) => message.type === "WARNING")
        .map((message) => message.message)
        .join(" | ");
      return [
        toCsvValue(row.rowIndex),
        toCsvValue(row.status),
        toCsvValue(row.errorReason ?? ""),
        toCsvValue(warnings),
        toCsvValue(data?.email ?? ""),
        toCsvValue(data?.nifNie ?? ""),
        toCsvValue(data?.firstName ?? ""),
        toCsvValue(data?.lastName ?? ""),
      ].join(",");
    });

    const content = [header, ...csvRows].join("\n");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="employee_import_report.csv"',
      },
    });
  } catch (error) {
    console.error("Error generando reporte de importación:", error);
    return NextResponse.json({ error: "No fue posible generar el reporte." }, { status: 500 });
  }
}
