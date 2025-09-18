import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Solo HR_ADMIN, ORG_ADMIN y SUPER_ADMIN pueden desactivar empleados
    if (!["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "No tienes permisos para desactivar empleados" }, { status: 403 });
    }

    const { id } = await params;

    // Validar que el ID es válido
    if (!id || typeof id !== "string") {
      return NextResponse.json({ message: "ID de empleado inválido" }, { status: 400 });
    }

    // Buscar el empleado en la misma organización
    const employee = await prisma.employee.findUnique({
      where: {
        id,
        orgId: session.user.orgId,
      },
      include: {
        user: {
          select: { id: true, active: true },
        },
        employmentContracts: {
          where: { active: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ message: "Empleado no encontrado" }, { status: 404 });
    }

    if (!employee.active) {
      return NextResponse.json({ message: "El empleado ya está inactivo" }, { status: 400 });
    }

    // Transacción para desactivar empleado, usuario y contratos
    await prisma.$transaction(async (tx) => {
      // Desactivar empleado
      await tx.employee.update({
        where: { id },
        data: {
          active: false,
          updatedAt: new Date(),
        },
      });

      // Desactivar contratos activos
      await tx.employmentContract.updateMany({
        where: {
          employeeId: id,
          active: true,
        },
        data: {
          active: false,
          endDate: new Date(),
          updatedAt: new Date(),
        },
      });

      // Si tiene usuario asociado, desactivarlo también
      if (employee.user) {
        await tx.user.update({
          where: { id: employee.user.id },
          data: {
            active: false,
            updatedAt: new Date(),
          },
        });
      }
    });

    console.log(`✅ Empleado ${employee.firstName} ${employee.lastName} desactivado por ${session.user.email}`);

    return NextResponse.json({
      message: "Empleado desactivado exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al desactivar empleado:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
