import { NextRequest, NextResponse } from "next/server";

import { rejectExpense } from "@/server/actions/expense-approvals";

/**
 * POST /api/expenses/[id]/reject
 * Rechaza un gasto
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: "El motivo de rechazo es obligatorio" }, { status: 400 });
    }

    const result = await rejectExpense(id, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.expense);
  } catch (error) {
    console.error("Error en POST /api/expenses/[id]/reject:", error);
    return NextResponse.json({ error: "Error al rechazar gasto" }, { status: 500 });
  }
}
