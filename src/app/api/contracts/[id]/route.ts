import { NextRequest, NextResponse } from "next/server";

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

const updateContractSchema = z
  .object({
    contractType: z
      .enum(["INDEFINIDO", "TEMPORAL", "PRACTICAS", "FORMACION", "OBRA_SERVICIO", "EVENTUAL", "INTERINIDAD"])
      .optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    weeklyHours: z.number().min(1).max(60).optional(),
    workingDaysPerWeek: z.number().min(0.5).max(7).optional().nullable(),
    grossSalary: z.number().min(0).optional().nullable(),

    // Schedule type
    scheduleType: z.enum(["FLEXIBLE", "FIXED", "SHIFTS"]).optional(),

    // FIXED schedule - working days
    workMonday: z.boolean().optional(),
    workTuesday: z.boolean().optional(),
    workWednesday: z.boolean().optional(),
    workThursday: z.boolean().optional(),
    workFriday: z.boolean().optional(),
    workSaturday: z.boolean().optional(),
    workSunday: z.boolean().optional(),
    hasFixedTimeSlots: z.boolean().optional(),

    // FIXED schedule - time slots
    mondayStartTime: z.string().optional().nullable(),
    mondayEndTime: z.string().optional().nullable(),
    tuesdayStartTime: z.string().optional().nullable(),
    tuesdayEndTime: z.string().optional().nullable(),
    wednesdayStartTime: z.string().optional().nullable(),
    wednesdayEndTime: z.string().optional().nullable(),
    thursdayStartTime: z.string().optional().nullable(),
    thursdayEndTime: z.string().optional().nullable(),
    fridayStartTime: z.string().optional().nullable(),
    fridayEndTime: z.string().optional().nullable(),
    saturdayStartTime: z.string().optional().nullable(),
    saturdayEndTime: z.string().optional().nullable(),
    sundayStartTime: z.string().optional().nullable(),
    sundayEndTime: z.string().optional().nullable(),

    // FIXED schedule - breaks
    mondayBreakStartTime: z.string().optional().nullable(),
    mondayBreakEndTime: z.string().optional().nullable(),
    tuesdayBreakStartTime: z.string().optional().nullable(),
    tuesdayBreakEndTime: z.string().optional().nullable(),
    wednesdayBreakStartTime: z.string().optional().nullable(),
    wednesdayBreakEndTime: z.string().optional().nullable(),
    thursdayBreakStartTime: z.string().optional().nullable(),
    thursdayBreakEndTime: z.string().optional().nullable(),
    fridayBreakStartTime: z.string().optional().nullable(),
    fridayBreakEndTime: z.string().optional().nullable(),
    saturdayBreakStartTime: z.string().optional().nullable(),
    saturdayBreakEndTime: z.string().optional().nullable(),
    sundayBreakStartTime: z.string().optional().nullable(),
    sundayBreakEndTime: z.string().optional().nullable(),

    // Intensive schedule
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

    // FIXED schedule - intensive time slots
    intensiveMondayStartTime: z.string().optional().nullable(),
    intensiveMondayEndTime: z.string().optional().nullable(),
    intensiveTuesdayStartTime: z.string().optional().nullable(),
    intensiveTuesdayEndTime: z.string().optional().nullable(),
    intensiveWednesdayStartTime: z.string().optional().nullable(),
    intensiveWednesdayEndTime: z.string().optional().nullable(),
    intensiveThursdayStartTime: z.string().optional().nullable(),
    intensiveThursdayEndTime: z.string().optional().nullable(),
    intensiveFridayStartTime: z.string().optional().nullable(),
    intensiveFridayEndTime: z.string().optional().nullable(),
    intensiveSaturdayStartTime: z.string().optional().nullable(),
    intensiveSaturdayEndTime: z.string().optional().nullable(),
    intensiveSundayStartTime: z.string().optional().nullable(),
    intensiveSundayEndTime: z.string().optional().nullable(),

    // FIXED schedule - intensive breaks
    intensiveMondayBreakStartTime: z.string().optional().nullable(),
    intensiveMondayBreakEndTime: z.string().optional().nullable(),
    intensiveTuesdayBreakStartTime: z.string().optional().nullable(),
    intensiveTuesdayBreakEndTime: z.string().optional().nullable(),
    intensiveWednesdayBreakStartTime: z.string().optional().nullable(),
    intensiveWednesdayBreakEndTime: z.string().optional().nullable(),
    intensiveThursdayBreakStartTime: z.string().optional().nullable(),
    intensiveThursdayBreakEndTime: z.string().optional().nullable(),
    intensiveFridayBreakStartTime: z.string().optional().nullable(),
    intensiveFridayBreakEndTime: z.string().optional().nullable(),
    intensiveSaturdayBreakStartTime: z.string().optional().nullable(),
    intensiveSaturdayBreakEndTime: z.string().optional().nullable(),
    intensiveSundayBreakStartTime: z.string().optional().nullable(),
    intensiveSundayBreakEndTime: z.string().optional().nullable(),

    // FLEXIBLE schedule (legacy)
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
    active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Si tiene jornada intensiva Y los campos están presentes, validar que estén completos
      // Permitir hasIntensiveSchedule: false sin validar los demás campos
      if (data.hasIntensiveSchedule === true) {
        // Solo validar si realmente está activado
        if (data.intensiveStartDate || data.intensiveEndDate || data.intensiveWeeklyHours) {
          // Si alguno está presente, todos deben estar completos
          return (
            data.intensiveStartDate &&
            data.intensiveStartDate.trim().length > 0 &&
            data.intensiveEndDate &&
            data.intensiveEndDate.trim().length > 0 &&
            data.intensiveWeeklyHours !== null &&
            data.intensiveWeeklyHours !== undefined &&
            data.intensiveWeeklyHours > 0
          );
        }
      }
      return true;
    },
    {
      message:
        "Si activas la jornada intensiva, debes proporcionar fecha de inicio (MM-DD), fecha de fin (MM-DD) y horas semanales",
    },
  );

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
    console.log("🔵 PUT /api/contracts/[id] - Body recibido:", JSON.stringify(body, null, 2));

    const validation = updateContractSchema.safeParse(body);

    if (!validation.success) {
      console.error("❌ Validación fallida:", validation.error.issues);
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const data = validation.data;
    console.log("🟢 Datos validados correctamente. Campos FIXED:", {
      scheduleType: data.scheduleType,
      workMonday: data.workMonday,
      workSaturday: data.workSaturday,
      saturdayStartTime: data.saturdayStartTime,
      saturdayEndTime: data.saturdayEndTime,
    });
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
    if (data.hasIntensiveSchedule !== undefined) updateData.hasIntensiveSchedule = data.hasIntensiveSchedule ?? false;
    if (data.intensiveStartDate !== undefined) updateData.intensiveStartDate = data.intensiveStartDate ?? null;
    if (data.intensiveEndDate !== undefined) updateData.intensiveEndDate = data.intensiveEndDate ?? null;
    if (data.intensiveWeeklyHours !== undefined) updateData.intensiveWeeklyHours = data.intensiveWeeklyHours;
    if (data.hasCustomWeeklyPattern !== undefined)
      updateData.hasCustomWeeklyPattern = data.hasCustomWeeklyPattern ?? false;
    if (data.mondayHours !== undefined) updateData.mondayHours = data.mondayHours;
    if (data.tuesdayHours !== undefined) updateData.tuesdayHours = data.tuesdayHours;
    if (data.wednesdayHours !== undefined) updateData.wednesdayHours = data.wednesdayHours;
    if (data.thursdayHours !== undefined) updateData.thursdayHours = data.thursdayHours;
    if (data.fridayHours !== undefined) updateData.fridayHours = data.fridayHours;
    if (data.saturdayHours !== undefined) updateData.saturdayHours = data.saturdayHours;
    if (data.sundayHours !== undefined) updateData.sundayHours = data.sundayHours;
    if (data.intensiveMondayHours !== undefined) updateData.intensiveMondayHours = data.intensiveMondayHours;
    if (data.intensiveTuesdayHours !== undefined) updateData.intensiveTuesdayHours = data.intensiveTuesdayHours;
    if (data.intensiveWednesdayHours !== undefined) updateData.intensiveWednesdayHours = data.intensiveWednesdayHours;
    if (data.intensiveThursdayHours !== undefined) updateData.intensiveThursdayHours = data.intensiveThursdayHours;
    if (data.intensiveFridayHours !== undefined) updateData.intensiveFridayHours = data.intensiveFridayHours;
    if (data.intensiveSaturdayHours !== undefined) updateData.intensiveSaturdayHours = data.intensiveSaturdayHours;
    if (data.intensiveSundayHours !== undefined) updateData.intensiveSundayHours = data.intensiveSundayHours;

    // Campos FIXED - scheduleType
    if (data.scheduleType !== undefined) updateData.scheduleType = data.scheduleType;

    // Campos FIXED - días laborables
    if (data.workMonday !== undefined) updateData.workMonday = data.workMonday;
    if (data.workTuesday !== undefined) updateData.workTuesday = data.workTuesday;
    if (data.workWednesday !== undefined) updateData.workWednesday = data.workWednesday;
    if (data.workThursday !== undefined) updateData.workThursday = data.workThursday;
    if (data.workFriday !== undefined) updateData.workFriday = data.workFriday;
    if (data.workSaturday !== undefined) updateData.workSaturday = data.workSaturday;
    if (data.workSunday !== undefined) updateData.workSunday = data.workSunday;
    if (data.hasFixedTimeSlots !== undefined) updateData.hasFixedTimeSlots = data.hasFixedTimeSlots;

    // Campos FIXED - franjas horarias normales
    if (data.mondayStartTime !== undefined) updateData.mondayStartTime = data.mondayStartTime;
    if (data.mondayEndTime !== undefined) updateData.mondayEndTime = data.mondayEndTime;
    if (data.tuesdayStartTime !== undefined) updateData.tuesdayStartTime = data.tuesdayStartTime;
    if (data.tuesdayEndTime !== undefined) updateData.tuesdayEndTime = data.tuesdayEndTime;
    if (data.wednesdayStartTime !== undefined) updateData.wednesdayStartTime = data.wednesdayStartTime;
    if (data.wednesdayEndTime !== undefined) updateData.wednesdayEndTime = data.wednesdayEndTime;
    if (data.thursdayStartTime !== undefined) updateData.thursdayStartTime = data.thursdayStartTime;
    if (data.thursdayEndTime !== undefined) updateData.thursdayEndTime = data.thursdayEndTime;
    if (data.fridayStartTime !== undefined) updateData.fridayStartTime = data.fridayStartTime;
    if (data.fridayEndTime !== undefined) updateData.fridayEndTime = data.fridayEndTime;
    if (data.saturdayStartTime !== undefined) updateData.saturdayStartTime = data.saturdayStartTime;
    if (data.saturdayEndTime !== undefined) updateData.saturdayEndTime = data.saturdayEndTime;
    if (data.sundayStartTime !== undefined) updateData.sundayStartTime = data.sundayStartTime;
    if (data.sundayEndTime !== undefined) updateData.sundayEndTime = data.sundayEndTime;

    // Campos FIXED - pausas normales
    if (data.mondayBreakStartTime !== undefined) updateData.mondayBreakStartTime = data.mondayBreakStartTime;
    if (data.mondayBreakEndTime !== undefined) updateData.mondayBreakEndTime = data.mondayBreakEndTime;
    if (data.tuesdayBreakStartTime !== undefined) updateData.tuesdayBreakStartTime = data.tuesdayBreakStartTime;
    if (data.tuesdayBreakEndTime !== undefined) updateData.tuesdayBreakEndTime = data.tuesdayBreakEndTime;
    if (data.wednesdayBreakStartTime !== undefined) updateData.wednesdayBreakStartTime = data.wednesdayBreakStartTime;
    if (data.wednesdayBreakEndTime !== undefined) updateData.wednesdayBreakEndTime = data.wednesdayBreakEndTime;
    if (data.thursdayBreakStartTime !== undefined) updateData.thursdayBreakStartTime = data.thursdayBreakStartTime;
    if (data.thursdayBreakEndTime !== undefined) updateData.thursdayBreakEndTime = data.thursdayBreakEndTime;
    if (data.fridayBreakStartTime !== undefined) updateData.fridayBreakStartTime = data.fridayBreakStartTime;
    if (data.fridayBreakEndTime !== undefined) updateData.fridayBreakEndTime = data.fridayBreakEndTime;
    if (data.saturdayBreakStartTime !== undefined) updateData.saturdayBreakStartTime = data.saturdayBreakStartTime;
    if (data.saturdayBreakEndTime !== undefined) updateData.saturdayBreakEndTime = data.saturdayBreakEndTime;
    if (data.sundayBreakStartTime !== undefined) updateData.sundayBreakStartTime = data.sundayBreakStartTime;
    if (data.sundayBreakEndTime !== undefined) updateData.sundayBreakEndTime = data.sundayBreakEndTime;

    // Campos FIXED - franjas horarias intensivas
    if (data.intensiveMondayStartTime !== undefined)
      updateData.intensiveMondayStartTime = data.intensiveMondayStartTime;
    if (data.intensiveMondayEndTime !== undefined) updateData.intensiveMondayEndTime = data.intensiveMondayEndTime;
    if (data.intensiveTuesdayStartTime !== undefined)
      updateData.intensiveTuesdayStartTime = data.intensiveTuesdayStartTime;
    if (data.intensiveTuesdayEndTime !== undefined) updateData.intensiveTuesdayEndTime = data.intensiveTuesdayEndTime;
    if (data.intensiveWednesdayStartTime !== undefined)
      updateData.intensiveWednesdayStartTime = data.intensiveWednesdayStartTime;
    if (data.intensiveWednesdayEndTime !== undefined)
      updateData.intensiveWednesdayEndTime = data.intensiveWednesdayEndTime;
    if (data.intensiveThursdayStartTime !== undefined)
      updateData.intensiveThursdayStartTime = data.intensiveThursdayStartTime;
    if (data.intensiveThursdayEndTime !== undefined)
      updateData.intensiveThursdayEndTime = data.intensiveThursdayEndTime;
    if (data.intensiveFridayStartTime !== undefined)
      updateData.intensiveFridayStartTime = data.intensiveFridayStartTime;
    if (data.intensiveFridayEndTime !== undefined) updateData.intensiveFridayEndTime = data.intensiveFridayEndTime;
    if (data.intensiveSaturdayStartTime !== undefined)
      updateData.intensiveSaturdayStartTime = data.intensiveSaturdayStartTime;
    if (data.intensiveSaturdayEndTime !== undefined)
      updateData.intensiveSaturdayEndTime = data.intensiveSaturdayEndTime;
    if (data.intensiveSundayStartTime !== undefined)
      updateData.intensiveSundayStartTime = data.intensiveSundayStartTime;
    if (data.intensiveSundayEndTime !== undefined) updateData.intensiveSundayEndTime = data.intensiveSundayEndTime;

    // Campos FIXED - pausas intensivas
    if (data.intensiveMondayBreakStartTime !== undefined)
      updateData.intensiveMondayBreakStartTime = data.intensiveMondayBreakStartTime;
    if (data.intensiveMondayBreakEndTime !== undefined)
      updateData.intensiveMondayBreakEndTime = data.intensiveMondayBreakEndTime;
    if (data.intensiveTuesdayBreakStartTime !== undefined)
      updateData.intensiveTuesdayBreakStartTime = data.intensiveTuesdayBreakStartTime;
    if (data.intensiveTuesdayBreakEndTime !== undefined)
      updateData.intensiveTuesdayBreakEndTime = data.intensiveTuesdayBreakEndTime;
    if (data.intensiveWednesdayBreakStartTime !== undefined)
      updateData.intensiveWednesdayBreakStartTime = data.intensiveWednesdayBreakStartTime;
    if (data.intensiveWednesdayBreakEndTime !== undefined)
      updateData.intensiveWednesdayBreakEndTime = data.intensiveWednesdayBreakEndTime;
    if (data.intensiveThursdayBreakStartTime !== undefined)
      updateData.intensiveThursdayBreakStartTime = data.intensiveThursdayBreakStartTime;
    if (data.intensiveThursdayBreakEndTime !== undefined)
      updateData.intensiveThursdayBreakEndTime = data.intensiveThursdayBreakEndTime;
    if (data.intensiveFridayBreakStartTime !== undefined)
      updateData.intensiveFridayBreakStartTime = data.intensiveFridayBreakStartTime;
    if (data.intensiveFridayBreakEndTime !== undefined)
      updateData.intensiveFridayBreakEndTime = data.intensiveFridayBreakEndTime;
    if (data.intensiveSaturdayBreakStartTime !== undefined)
      updateData.intensiveSaturdayBreakStartTime = data.intensiveSaturdayBreakStartTime;
    if (data.intensiveSaturdayBreakEndTime !== undefined)
      updateData.intensiveSaturdayBreakEndTime = data.intensiveSaturdayBreakEndTime;
    if (data.intensiveSundayBreakStartTime !== undefined)
      updateData.intensiveSundayBreakStartTime = data.intensiveSundayBreakStartTime;
    if (data.intensiveSundayBreakEndTime !== undefined)
      updateData.intensiveSundayBreakEndTime = data.intensiveSundayBreakEndTime;

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
