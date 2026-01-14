import { NextRequest, NextResponse } from "next/server";

import { format } from "date-fns";
import ExcelJS from "exceljs";

import { auth } from "@/lib/auth";
import { getContractTypeLabel } from "@/lib/contracts/contract-types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const formatDate = (value?: Date | null) => (value ? format(value, "yyyy-MM-dd") : "");
const formatDateTime = (value?: Date | null) => (value ? format(value, "yyyy-MM-dd HH:mm") : "");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: contractId } = await params;

  const contract = await prisma.employmentContract.findFirst({
    where: {
      id: contractId,
      orgId: session.user.orgId,
    },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          secondLastName: true,
          employeeNumber: true,
        },
      },
      pauseHistory: {
        orderBy: { performedAt: "desc" },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  const performedByIds = Array.from(new Set(contract.pauseHistory.map((entry) => entry.performedBy)));
  const users =
    performedByIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: performedByIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = new Map(users.map((user) => [user.id, user]));

  const employeeName = `${contract.employee.firstName} ${contract.employee.lastName}${
    contract.employee.secondLastName ? ` ${contract.employee.secondLastName}` : ""
  }`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Historial");

  sheet.columns = [
    { header: "Empleado", key: "employee", width: 30 },
    { header: "Nº Empleado", key: "employeeNumber", width: 16 },
    { header: "Contrato", key: "contractType", width: 18 },
    { header: "Acción", key: "action", width: 14 },
    { header: "Fecha acción", key: "actionDate", width: 18 },
    { header: "Inicio pausa", key: "pauseStart", width: 18 },
    { header: "Fin pausa", key: "pauseEnd", width: 18 },
    { header: "Motivo", key: "reason", width: 32 },
    { header: "Registrado por", key: "performedBy", width: 28 },
  ];

  sheet.getRow(1).font = { bold: true };

  contract.pauseHistory.forEach((entry) => {
    const performer = userMap.get(entry.performedBy);
    const performerLabel = performer?.name ?? performer?.email ?? entry.performedBy;
    const isPause = entry.action === "PAUSE";

    sheet.addRow({
      employee: employeeName,
      employeeNumber: contract.employee.employeeNumber ?? "",
      contractType: getContractTypeLabel(contract.contractType),
      action: entry.action === "PAUSE" ? "Pausa" : "Reanudación",
      actionDate: formatDateTime(entry.performedAt ?? entry.startDate),
      pauseStart: isPause ? formatDate(entry.startDate) : "",
      pauseEnd: isPause ? (entry.endDate ? formatDate(entry.endDate) : "En curso") : "",
      reason: entry.reason ?? "",
      performedBy: performerLabel,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const suffix = contract.employee.employeeNumber ?? contract.id;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="historial_pausas_${suffix}.xlsx"`,
    },
  });
}
