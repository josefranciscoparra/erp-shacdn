import { NextRequest, NextResponse } from "next/server";

import { deleteExpense, getExpenseById, updateExpense } from "@/server/actions/expenses";

/**
 * GET /api/expenses/[id]
 * Obtiene un gasto por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await getExpenseById(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.expense);
  } catch (error) {
    console.error("Error en GET /api/expenses/[id]:", error);
    return NextResponse.json({ error: "Error al obtener gasto" }, { status: 500 });
  }
}

/**
 * PUT /api/expenses/[id]
 * Actualiza un gasto
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Convertir fecha string a Date si existe
    if (body.date) {
      body.date = new Date(body.date);
    }

    const result = await updateExpense(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.expense);
  } catch (error) {
    console.error("Error en PUT /api/expenses/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar gasto" }, { status: 500 });
  }
}

/**
 * DELETE /api/expenses/[id]
 * Elimina un gasto
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await deleteExpense(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error en DELETE /api/expenses/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar gasto" }, { status: 500 });
  }
}
