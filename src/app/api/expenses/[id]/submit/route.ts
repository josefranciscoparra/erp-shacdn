import { NextRequest, NextResponse } from "next/server";

import { submitExpense } from "@/server/actions/expenses";

/**
 * POST /api/expenses/[id]/submit
 * Envía un gasto a aprobación
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log("🚀 POST /api/expenses/[id]/submit - ID:", id);

    const result = await submitExpense(id);
    console.log("📊 submitExpense result:", result);

    if (!result.success) {
      console.error("❌ submitExpense falló:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log("✅ Gasto enviado exitosamente");
    return NextResponse.json(result.expense);
  } catch (error) {
    console.error("💥 Error en POST /api/expenses/[id]/submit:", error);
    return NextResponse.json({ error: "Error al enviar gasto a aprobación" }, { status: 500 });
  }
}
