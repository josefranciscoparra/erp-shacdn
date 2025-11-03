import { NextRequest, NextResponse } from "next/server";

import { submitExpense } from "@/server/actions/expenses";

/**
 * POST /api/expenses/[id]/submit
 * Envía un gasto a aprobación
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await submitExpense(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.expense);
  } catch (error) {
    console.error("Error en POST /api/expenses/[id]/submit:", error);
    return NextResponse.json({ error: "Error al enviar gasto a aprobación" }, { status: 500 });
  }
}
