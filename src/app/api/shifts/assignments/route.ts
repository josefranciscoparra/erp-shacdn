import { NextRequest, NextResponse } from "next/server";

import { getShiftAssignments, assignEmployeeToShift } from "@/server/actions/shifts";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shiftId = searchParams.get("shiftId");

    if (!shiftId) {
      return NextResponse.json({ error: "shiftId es requerido" }, { status: 400 });
    }

    const assignments = await getShiftAssignments({ shiftId });
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error en GET /api/shifts/assignments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener asignaciones" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shiftId, employeeId, notes } = body;

    if (!shiftId || !employeeId) {
      return NextResponse.json({ error: "shiftId y employeeId son requeridos" }, { status: 400 });
    }

    const assignment = await assignEmployeeToShift(shiftId, employeeId, notes);
    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error en POST /api/shifts/assignments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al asignar empleado" },
      { status: 500 },
    );
  }
}
