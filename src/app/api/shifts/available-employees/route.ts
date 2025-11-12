import { NextRequest, NextResponse } from "next/server";

import { getAvailableEmployeesForShift } from "@/server/actions/shifts";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const costCenterId = searchParams.get("costCenterId");

    if (!costCenterId) {
      return NextResponse.json({ error: "costCenterId es requerido" }, { status: 400 });
    }

    const employees = await getAvailableEmployeesForShift(costCenterId);
    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error en /api/shifts/available-employees:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener empleados" },
      { status: 500 },
    );
  }
}
