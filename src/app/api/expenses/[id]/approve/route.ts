import { NextRequest, NextResponse } from "next/server";

import { approveExpense } from "@/server/actions/expense-approvals";

/**
 * POST /api/expenses/[id]/approve
 * Aprueba un gasto
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { comment } = body;

    const result = await approveExpense(id, comment);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.expense);
  } catch (error) {
    console.error("Error en POST /api/expenses/[id]/approve:", error);
    return NextResponse.json({ error: "Error al aprobar gasto" }, { status: 500 });
  }
}
