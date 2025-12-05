import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoCreateSettlement } from "@/server/actions/vacation-settlement";

export const runtime = "nodejs";

// Regex para validar formato MM-DD (mes: 01-12, día: 01-31)
const MM_DD_REGEX = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

// Función para validar que el día sea válido para el mes dado
const isValidDayForMonth = (mmdd: string): boolean => {
  const [month, day] = mmdd.split("-").map(Number);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Febrero con 29 días (año bisiesto)
  return day <= daysInMonth[month - 1];
};

// Esquema simplificado solo para validación de entrada
// No se usa para tipar la updateData final que va a Prisma
const updateContractSchema = z
  .object({
    contractType: z
      .enum([
        "INDEFINIDO",
        "TEMPORAL",
        "PRACTICAS",
        "FORMACION",
        "OBRA_SERVICIO",
        "EVENTUAL",
        "INTERINIDAD",
        "FIJO_DISCONTINUO",
      ])
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

    // Campos de horario (se validan pero NO se guardan en EmploymentContract)
    hasIntensiveSchedule: z.boolean().optional().nullable(),
    intensiveStartDate: z.string().optional().nullable(),
    intensiveEndDate: z.string().optional().nullable(),
    intensiveWeeklyHours: z.number().optional().nullable(),
    hasCustomWeeklyPattern: z.boolean().optional().nullable(),
    // ... otros campos de horario que ignoraremos al guardar
  })
  .passthrough(); // Permitir otros campos para no fallar validación, aunque los ignoraremos

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

    // Preparar datos de actualización LIMPIOS
    // Solo incluimos campos que realmente existen en el modelo EmploymentContract actual
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
    // Validar que la fecha sea válida antes de asignar
    if (data.endDate && !isNaN(Date.parse(data.endDate))) {
      updateData.endDate = new Date(data.endDate);
    } else if (data.endDate === null || data.endDate === "") {
      updateData.endDate = null;
    }

    if (data.weeklyHours) updateData.weeklyHours = data.weeklyHours;
    if (data.workingDaysPerWeek !== undefined) updateData.workingDaysPerWeek = data.workingDaysPerWeek ?? 5;
    if (data.grossSalary !== undefined) updateData.grossSalary = data.grossSalary;

    // Relaciones
    if (data.positionId !== undefined) updateData.positionId = normalizeId(data.positionId);
    if (data.departmentId !== undefined) updateData.departmentId = normalizeId(data.departmentId);
    if (data.costCenterId !== undefined) updateData.costCenterId = normalizeId(data.costCenterId);
    if (data.managerId !== undefined) updateData.managerId = normalizeId(data.managerId);
    if (data.active !== undefined) updateData.active = data.active;

    // Validar fechas lógicas
    if (updateData.startDate && updateData.endDate && updateData.endDate <= updateData.startDate) {
      return NextResponse.json({ error: "La fecha de fin debe ser posterior a la fecha de inicio" }, { status: 400 });
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

    // Detectar si se está finalizando el contrato
    const isFinalizingContract = updateData.active === false && updateData.endDate && existingContract.active === true;

    // IMPORTANTE: Crear liquidación ANTES de desactivar el contrato
    // porque el cálculo de vacaciones necesita un contrato activo
    let settlementCreated = false;
    let settlementId: string | null = null;

    if (isFinalizingContract && updateData.endDate) {
      try {
        const settlementResult = await autoCreateSettlement(
          contractId,
          updateData.endDate, // Fecha de finalización del contrato
          session.user.id, // Usuario que ejecuta la acción
        );
        if (settlementResult.success && settlementResult.settlement) {
          console.log(`Liquidación automática creada para contrato ${contractId}`);
          settlementCreated = true;
          settlementId = settlementResult.settlement.id;
        } else {
          console.warn(`No se pudo crear liquidación automática: ${settlementResult.error}`);
        }
      } catch (settlementError) {
        // No fallar la actualización del contrato si la liquidación falla
        console.error("Error al crear liquidación automática:", settlementError);
      }
    }

    // Actualizar contrato (sin campos basura)
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
        position: { select: { id: true, title: true, level: true } },
        department: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true, code: true } },
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

    // Incluir info de liquidación en la respuesta si se creó
    const response: Record<string, unknown> = { ...updatedContract };
    if (settlementCreated) {
      response.settlementCreated = true;
      response.settlementId = settlementId;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error al actualizar contrato:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos para eliminar contratos" }, { status: 403 });
    }

    const { id: contractId } = await params;
    const orgId = session.user.orgId;

    const existingContract = await prisma.employmentContract.findFirst({
      where: { id: contractId, orgId },
    });

    if (!existingContract) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

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
