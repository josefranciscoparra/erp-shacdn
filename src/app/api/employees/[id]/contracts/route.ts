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
    hasIntensiveSchedule: z.boolean().optional().nullable(),
    intensiveStartDate: z
      .string()
      .regex(MM_DD_REGEX, "Formato inválido. Debe ser MM-DD (ej: 06-15)")
      .refine(isValidDayForMonth, "Día inválido para el mes especificado")
      .optional()
      .nullable(),
    intensiveEndDate: z
      .string()
      .regex(MM_DD_REGEX, "Formato inválido. Debe ser MM-DD (ej: 09-15)")
      .refine(isValidDayForMonth, "Día inválido para el mes especificado")
      .optional()
      .nullable(),
    intensiveWeeklyHours: z.number().min(1).max(60).optional().nullable(),
    hasCustomWeeklyPattern: z.boolean().optional().nullable(),
    mondayHours: z.number().min(0).max(24).optional().nullable(),
    tuesdayHours: z.number().min(0).max(24).optional().nullable(),
    wednesdayHours: z.number().min(0).max(24).optional().nullable(),
    thursdayHours: z.number().min(0).max(24).optional().nullable(),
    fridayHours: z.number().min(0).max(24).optional().nullable(),
    saturdayHours: z.number().min(0).max(24).optional().nullable(),
    sundayHours: z.number().min(0).max(24).optional().nullable(),
    intensiveMondayHours: z.number().min(0).max(24).optional().nullable(),
    intensiveTuesdayHours: z.number().min(0).max(24).optional().nullable(),
    intensiveWednesdayHours: z.number().min(0).max(24).optional().nullable(),
    intensiveThursdayHours: z.number().min(0).max(24).optional().nullable(),
    intensiveFridayHours: z.number().min(0).max(24).optional().nullable(),
    intensiveSaturdayHours: z.number().min(0).max(24).optional().nullable(),
    intensiveSundayHours: z.number().min(0).max(24).optional().nullable(),
    positionId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    costCenterId: z.string().optional().nullable(),
    managerId: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // Si tiene jornada intensiva, los campos deben estar completos
      if (data.hasIntensiveSchedule) {
        return (
          data.intensiveStartDate &&
          data.intensiveStartDate.trim().length > 0 &&
          data.intensiveEndDate &&
          data.intensiveEndDate.trim().length > 0 &&
          data.intensiveWeeklyHours !== null &&
          data.intensiveWeeklyHours !== undefined
        );
      }
      return true;
    },
    {
      message:
        "Si activas la jornada intensiva, debes proporcionar fecha de inicio (MM-DD), fecha de fin (MM-DD) y horas semanales",
    },
  )
  .refine(
    (data) => {
      // Si tiene patrón semanal personalizado, todos los campos deben estar completos
      if (data.hasCustomWeeklyPattern) {
        return (
          data.mondayHours !== null &&
          data.mondayHours !== undefined &&
          data.tuesdayHours !== null &&
          data.tuesdayHours !== undefined &&
          data.wednesdayHours !== null &&
          data.wednesdayHours !== undefined &&
          data.thursdayHours !== null &&
          data.thursdayHours !== undefined &&
          data.fridayHours !== null &&
          data.fridayHours !== undefined &&
          data.saturdayHours !== null &&
          data.saturdayHours !== undefined &&
          data.sundayHours !== null &&
          data.sundayHours !== undefined
        );
      }
      return true;
    },
    {
      message: "Si activas el patrón semanal personalizado, debes proporcionar las horas de todos los días",
    },
  )
  .refine(
    (data) => {
      // Si tiene patrón semanal personalizado, la suma debe coincidir con weeklyHours
      if (data.hasCustomWeeklyPattern) {
        const totalHours =
          (data.mondayHours ?? 0) +
          (data.tuesdayHours ?? 0) +
          (data.wednesdayHours ?? 0) +
          (data.thursdayHours ?? 0) +
          (data.fridayHours ?? 0) +
          (data.saturdayHours ?? 0) +
          (data.sundayHours ?? 0);

        const difference = Math.abs(totalHours - data.weeklyHours);
        return difference < 0.51;
      }
      return true;
    },
    {
      message: "La suma de las horas semanales personalizadas debe coincidir con las horas semanales totales",
    },
  );

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

    // Crear contrato
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
        hasIntensiveSchedule: data.hasIntensiveSchedule ?? false,
        intensiveStartDate: data.intensiveStartDate ?? null,
        intensiveEndDate: data.intensiveEndDate ?? null,
        intensiveWeeklyHours: data.intensiveWeeklyHours,
        hasCustomWeeklyPattern: data.hasCustomWeeklyPattern ?? false,
        mondayHours: data.mondayHours,
        tuesdayHours: data.tuesdayHours,
        wednesdayHours: data.wednesdayHours,
        thursdayHours: data.thursdayHours,
        fridayHours: data.fridayHours,
        saturdayHours: data.saturdayHours,
        sundayHours: data.sundayHours,
        intensiveMondayHours: data.intensiveMondayHours,
        intensiveTuesdayHours: data.intensiveTuesdayHours,
        intensiveWednesdayHours: data.intensiveWednesdayHours,
        intensiveThursdayHours: data.intensiveThursdayHours,
        intensiveFridayHours: data.intensiveFridayHours,
        intensiveSaturdayHours: data.intensiveSaturdayHours,
        intensiveSundayHours: data.intensiveSundayHours,
        positionId,
        departmentId,
        costCenterId,
        managerId,
        active: true,
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
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
