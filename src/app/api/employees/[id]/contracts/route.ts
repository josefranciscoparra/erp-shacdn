import { NextRequest, NextResponse } from "next/server";

import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Regex para validar formato MM-DD (mes: 01-12, día: 01-31)
const MM_DD_REGEX = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

// Función para validar que el día sea válido para el mes dado
const isValidDayForMonth = (mmdd: string): boolean => {
  const [month, day] = mmdd.split("-").map(Number);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Febrero con 29 días (año bisiesto)
  return day <= daysInMonth[month - 1];
};

// Esquema simplificado de validación para creación
// Validamos todo lo que venga del frontend, pero solo usaremos lo que exista en V2
const contractSchema = z
  .object({
    contractType: z.enum([
      "INDEFINIDO",
      "TEMPORAL",
      "PRACTICAS",
      "FORMACION",
      "OBRA_SERVICIO",
      "EVENTUAL",
      "INTERINIDAD",
    ]),
    startDate: z.string(),
    endDate: z.string().optional().nullable(),
    weeklyHours: z.number().min(1).max(60),
    workingDaysPerWeek: z.number().min(0.5).max(7).optional().nullable(),
    grossSalary: z.number().min(0).optional().nullable(),
    positionId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    costCenterId: z.string().optional().nullable(),
    managerId: z.string().optional().nullable(),

    // Campos V1 (Legacy) - Se validan para no romper el form, pero se ignoran
    hasIntensiveSchedule: z.boolean().optional().nullable(),
    intensiveStartDate: z.string().optional().nullable(),
    intensiveEndDate: z.string().optional().nullable(),
    intensiveWeeklyHours: z.number().optional().nullable(),
    hasCustomWeeklyPattern: z.boolean().optional().nullable(),
    // ... se pueden añadir más si el frontend los envía, .passthrough() lo maneja
  })
  .passthrough();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const status = searchParams.get("status"); // active, inactive, all
    const skip = (page - 1) * limit;

    const { id: employeeId } = await params;
    const orgId = session.user.orgId;

    // Verificar que el empleado pertenece a la organización
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, orgId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Construir filtros
    const where: any = {
      employeeId,
      orgId,
    };

    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    }

    // Obtener contratos con paginación
    const [contracts, total] = await Promise.all([
      prisma.employmentContract.findMany({
        where,
        include: {
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
        orderBy: { startDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.employmentContract.count({ where }),
    ]);

    return NextResponse.json({
      contracts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error al obtener contratos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos (solo HR_ADMIN, ORG_ADMIN, SUPER_ADMIN)
    if (!["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos para crear contratos" }, { status: 403 });
    }

    const body = await request.json();
    const validation = contractSchema.safeParse(body);

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
    const { id: employeeId } = await params;
    const orgId = session.user.orgId;

    // Verificar que el empleado existe y pertenece a la organización
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, orgId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const normalizeId = (value?: string | null) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length === 0 || trimmed === "__none__") {
        return null;
      }
      return trimmed;
    };

    const positionId = normalizeId(data.positionId);
    const departmentId = normalizeId(data.departmentId);
    const costCenterId = normalizeId(data.costCenterId);
    const managerId = normalizeId(data.managerId);

    if (managerId) {
      const manager = await prisma.employee.findFirst({
        where: {
          id: managerId,
          orgId,
          active: true,
        },
      });

      if (!manager) {
        return NextResponse.json({ error: "Responsable no válido" }, { status: 400 });
      }
    }

    // Validar que no haya más de un contrato activo
    const activeContracts = await prisma.employmentContract.count({
      where: {
        employeeId,
        active: true,
        weeklyHours: {
          gt: new Decimal(0),
        },
      },
    });

    if (activeContracts > 0) {
      return NextResponse.json(
        {
          error: "El empleado ya tiene un contrato activo. Finaliza el contrato actual antes de crear uno nuevo.",
        },
        { status: 409 },
      );
    }

    // Validar fechas
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    if (endDate && endDate <= startDate) {
      return NextResponse.json(
        {
          error: "La fecha de fin debe ser posterior a la fecha de inicio",
        },
        { status: 400 },
      );
    }

    // Crear contrato - LIMPIEZA V1: Solo campos existentes en V2
    const contract = await prisma.employmentContract.create({
      data: {
        orgId,
        employeeId,
        contractType: data.contractType,
        startDate,
        endDate,
        weeklyHours: data.weeklyHours,
        workingDaysPerWeek: data.workingDaysPerWeek ?? 5,
        grossSalary: data.grossSalary,

        // Relaciones
        positionId,
        departmentId,
        costCenterId,
        managerId,
        active: true,

        // NOTA: Los campos de horario V1 (hasIntensiveSchedule, mondayHours, etc.)
        // SE HAN ELIMINADO AQUÍ para evitar error de Prisma.
        // La gestión de horarios se debe hacer posteriormente asignando un ScheduleTemplate.
      },
      include: {
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

    await prisma.employmentContract.updateMany({
      where: {
        employeeId,
        active: true,
        id: { not: contract.id },
        weeklyHours: {
          lte: new Decimal(0),
        },
      },
      data: {
        active: false,
      },
    });

    // Actualizar estado del empleado a ACTIVE si es su primer contrato
    await prisma.employee.update({
      where: { id: employeeId },
      data: { employmentStatus: "ACTIVE" },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("Error al crear contrato:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
