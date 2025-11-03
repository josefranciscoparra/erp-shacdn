import { NextRequest, NextResponse } from "next/server";

import { exportExpensesCSV } from "@/server/actions/expense-analytics";

/**
 * GET /api/expenses/export
 * Exporta gastos a CSV (solo admins)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parsear filtros
    const filters: any = {};

    const status = searchParams.get("status");
    if (status) {
      filters.status = status;
    }

    const category = searchParams.get("category");
    if (category) {
      filters.category = category;
    }

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }

    const dateTo = searchParams.get("dateTo");
    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }

    const employeeId = searchParams.get("employeeId");
    if (employeeId) {
      filters.employeeId = employeeId;
    }

    const result = await exportExpensesCSV(filters);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Generar nombre del archivo
    const now = new Date();
    const fileName = `gastos_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.csv`;

    // Retornar CSV con headers correctos
    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error en GET /api/expenses/export:", error);
    return NextResponse.json({ error: "Error al exportar gastos" }, { status: 500 });
  }
}
