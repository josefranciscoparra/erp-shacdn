import { NextRequest, NextResponse } from "next/server";

import { getAllOrganizationExpenses } from "@/server/actions/expenses";

/**
 * GET /api/admin/expenses
 * Obtiene TODOS los gastos de la organización (solo para administradores)
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

    const costCenterId = searchParams.get("costCenterId");
    if (costCenterId) {
      filters.costCenterId = costCenterId;
    }

    const employeeId = searchParams.get("employeeId");
    if (employeeId) {
      filters.employeeId = employeeId;
    }

    const result = await getAllOrganizationExpenses(filters);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.expenses);
  } catch (error) {
    console.error("Error en GET /api/admin/expenses:", error);
    return NextResponse.json({ error: "Error al obtener gastos" }, { status: 500 });
  }
}
