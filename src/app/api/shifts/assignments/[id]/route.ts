import { NextRequest, NextResponse } from "next/server";

import { unassignEmployeeFromShift } from "@/server/actions/shifts";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const assignmentId = params.id;

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId es requerido" }, { status: 400 });
    }

    await unassignEmployeeFromShift(assignmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/shifts/assignments/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al desasignar empleado" },
      { status: 500 },
    );
  }
}
