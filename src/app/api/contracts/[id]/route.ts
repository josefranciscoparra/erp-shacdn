import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateContractSchema = z.object({
  contractType: z
    .enum(["INDEFINIDO", "TEMPORAL", "PRACTICAS", "FORMACION", "OBRA_SERVICIO", "EVENTUAL", "INTERINIDAD"])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  weeklyHours: z.number().min(1).max(60).optional(),
  workingDaysPerWeek: z.number().min(0.5).max(7).optional().nullable(),
  grossSalary: z.number().min(0).optional().nullable(),
  positionId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  costCenterId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: contractId } = await params;
    const orgId = session.user.orgId;

    const contract = await prisma.employmentContract.findFirst({
      where: { id: contractId, orgId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
            employeeNumber: true,
          },
        },
        position: {
          select: { id: true, title: true, level: true },
        },
        department: {
          select: { id: true, name: true },
        },
        costCenter: {
          select: { id: true, name: true, code: true },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error("Error al obtener contrato:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos
    if (!["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos para editar contratos" }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateContractSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const data = validation.data;
    const { id: contractId } = await params;
    const orgId = session.user.orgId;

    // Verificar que el contrato existe y pertenece a la organización
    const existingContract = await prisma.employmentContract.findFirst({
      where: { id: contractId, orgId },
    });

    if (!existingContract) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    // Preparar datos de actualización
    const updateData: any = {};
    const normalizeId = (value?: string | null) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length === 0 || trimmed === "__none__") {
        return null;
      }
      return trimmed;
    };

    if (data.contractType) updateData.contractType = data.contractType;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.weeklyHours) updateData.weeklyHours = data.weeklyHours;
    if (data.workingDaysPerWeek !== undefined) updateData.workingDaysPerWeek = data.workingDaysPerWeek ?? 5;
    if (data.grossSalary !== undefined) updateData.grossSalary = data.grossSalary;
    if (data.positionId !== undefined) updateData.positionId = normalizeId(data.positionId);
    if (data.departmentId !== undefined) updateData.departmentId = normalizeId(data.departmentId);
    if (data.costCenterId !== undefined) updateData.costCenterId = normalizeId(data.costCenterId);
    if (data.managerId !== undefined) updateData.managerId = normalizeId(data.managerId);
    if (data.active !== undefined) updateData.active = data.active;

    // Validar fechas si se proporcionan
    if (updateData.startDate && updateData.endDate && updateData.endDate <= updateData.startDate) {
      return NextResponse.json(
        {
          error: "La fecha de fin debe ser posterior a la fecha de inicio",
        },
        { status: 400 },
      );
    }

    // Si se está desactivando un contrato, verificar que no sea el único activo
    if (data.active === false && existingContract.active) {
      // Opcional: Aquí podrías implementar lógica adicional
      // Por ejemplo, actualizar el estado del empleado si no tiene más contratos activos
    }

    if (updateData.managerId) {
      const manager = await prisma.employee.findFirst({
        where: {
          id: updateData.managerId,
          orgId,
          active: true,
        },
      });

      if (!manager) {
        return NextResponse.json({ error: "Responsable no válido" }, { status: 400 });
      }
    }

    // Actualizar contrato
    const updatedContract = await prisma.employmentContract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
            employeeNumber: true,
          },
        },
        position: {
          select: { id: true, title: true, level: true },
        },
        department: {
          select: { id: true, name: true },
        },
        costCenter: {
          select: { id: true, name: true, code: true },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
          },
        },
      },
    });

    return NextResponse.json(updatedContract);
  } catch (error) {
    console.error("Error al actualizar contrato:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos (solo SUPER_ADMIN puede eliminar contratos)
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos para eliminar contratos" }, { status: 403 });
    }

    const { id: contractId } = await params;
    const orgId = session.user.orgId;

    // Verificar que el contrato existe y pertenece a la organización
    const existingContract = await prisma.employmentContract.findFirst({
      where: { id: contractId, orgId },
    });

    if (!existingContract) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    // Soft delete: marcar como inactivo en lugar de eliminar
    const deletedContract = await prisma.employmentContract.update({
      where: { id: contractId },
      data: { active: false },
    });

    return NextResponse.json({
      message: "Contrato desactivado exitosamente",
      contract: deletedContract,
    });
  } catch (error) {
    console.error("Error al eliminar contrato:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
