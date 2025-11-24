import { NextRequest, NextResponse } from "next/server";

import { createExpense, getMyExpenses } from "@/server/actions/expenses";

/**
 * GET /api/expenses
 * Obtiene los gastos del usuario autenticado
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

    const result = await getMyExpenses(filters);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.expenses);
  } catch (error) {
    console.error("Error en GET /api/expenses:", error);
    return NextResponse.json({ error: "Error al obtener gastos" }, { status: 500 });
  }
}

/**
 * POST /api/expenses
 * Crea un nuevo gasto
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("📥 POST /api/expenses - Body recibido:", JSON.stringify(body, null, 2));

    // Convertir fecha string a Date
    if (body.date) {
      body.date = new Date(body.date);
    }

    const result = await createExpense(body);

    if (!result.success) {
      console.error("❌ createExpense falló:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (!result.expense) {
      console.error("❌ Error crítico: createExpense devolvió success pero sin objeto expense");
      return NextResponse.json({ error: "Error interno al crear el gasto" }, { status: 500 });
    }

    console.log("✅ Gasto creado exitosamente:", result.expense.id);
    return NextResponse.json(result.expense, { status: 201 });
  } catch (error) {
    console.error("❌ Error en POST /api/expenses:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al crear gasto";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
