import { NextRequest, NextResponse } from "next/server";

import ExcelJS from "exceljs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  EMPLOYEE_IMPORT_COLUMNS,
  EMPLOYEE_IMPORT_SAMPLE_ROW,
  EMPLOYEE_IMPORT_ALLOWED_ROLES,
} from "@/lib/employee-import/constants";

function toCsvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildCsvContent() {
  const header = EMPLOYEE_IMPORT_COLUMNS.map((column) => column.key).join(",");
  const instructions = EMPLOYEE_IMPORT_COLUMNS.map((column) =>
    toCsvValue(column.hint ?? (column.required ? "Obligatorio" : "")),
  ).join(",");
  const sample = EMPLOYEE_IMPORT_COLUMNS.map((column) => {
    const key = column.key as keyof typeof EMPLOYEE_IMPORT_SAMPLE_ROW;
    const value = EMPLOYEE_IMPORT_SAMPLE_ROW[key] ?? "";
    return toCsvValue(value);
  }).join(",");

  return [header, instructions, sample].join("\n");
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format")?.toLowerCase() ?? "xlsx";

  const [schedules, departments, costCenters] = await Promise.all([
    prisma.scheduleTemplate.findMany({
      where: { orgId: session.user.orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { orgId: session.user.orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.costCenter.findMany({
      where: { orgId: session.user.orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (format === "csv") {
    const csv = buildCsvContent();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="empleados_import.csv"',
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  const employeesSheet = workbook.addWorksheet("Employees");
  const catalogsSheet = workbook.addWorksheet("Catalogs");

  const headers = EMPLOYEE_IMPORT_COLUMNS.map((column) => column.key);
  const headerRow = employeesSheet.addRow(headers);
  headerRow.font = { bold: true };

  const hintRow = employeesSheet.addRow(
    EMPLOYEE_IMPORT_COLUMNS.map((column) => column.hint ?? (column.required ? "Obligatorio" : "")),
  );
  hintRow.font = { italic: true, color: { argb: "FF666666" }, size: 10 };

  employeesSheet.addRow(headers.map((key) => EMPLOYEE_IMPORT_SAMPLE_ROW[key as keyof typeof EMPLOYEE_IMPORT_SAMPLE_ROW]));

  employeesSheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  employeesSheet.getRow(2).alignment = { vertical: "top", wrapText: true };
  employeesSheet.columns?.forEach((column) => {
    column.width = 20;
  });

  catalogsSheet.addRow(["Horarios disponibles"]);
  catalogsSheet.addRow(["scheduleTemplateId", "Nombre"]);
  schedules.forEach((schedule) => {
    catalogsSheet.addRow([schedule.id, schedule.name]);
  });

  catalogsSheet.addRow([]);
  catalogsSheet.addRow(["Departamentos"]);
  catalogsSheet.addRow(["departmentId", "Nombre"]);
  departments.forEach((department) => {
    catalogsSheet.addRow([department.id, department.name]);
  });

  catalogsSheet.addRow([]);
  catalogsSheet.addRow(["Centros de coste"]);
  catalogsSheet.addRow(["costCenterId", "Nombre"]);
  costCenters.forEach((center) => {
    catalogsSheet.addRow([center.id, center.name]);
  });

  catalogsSheet.addRow([]);
  catalogsSheet.addRow(["Roles permitidos"]);
  catalogsSheet.addRow(["role"]);
  EMPLOYEE_IMPORT_ALLOWED_ROLES.forEach((role) => catalogsSheet.addRow([role]));

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="empleados_import.xlsx"',
    },
  });
}
