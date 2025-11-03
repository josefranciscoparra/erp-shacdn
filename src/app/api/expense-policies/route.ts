import { NextRequest, NextResponse } from "next/server";

import { getOrganizationPolicy, updatePolicy } from "@/server/actions/expense-policies";

/**
 * GET /api/expense-policies
 * Obtiene la política de gastos de la organización
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getOrganizationPolicy();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.policy);
  } catch (error) {
    console.error("Error en GET /api/expense-policies:", error);
    return NextResponse.json(
      { error: "Error al obtener política de gastos" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/expense-policies
 * Actualiza la política de gastos (solo admins)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await updatePolicy(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.policy);
  } catch (error) {
    console.error("Error en PUT /api/expense-policies:", error);
    return NextResponse.json(
      { error: "Error al actualizar política de gastos" },
      { status: 500 }
    );
  }
}
