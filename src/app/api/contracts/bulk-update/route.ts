import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Schema de validación para bulk update
const bulkUpdateSchema = z.object({
  contractIds: z
    .array(z.string())
    .min(1, "Debe proporcionar al menos un ID de contrato")
    .max(100, "No se pueden actualizar más de 100 contratos a la vez"),
  data: z
    .object({
      weeklyHours: z.number().min(1).max(60).optional(),
      workingDaysPerWeek: z.number().min(0.5).max(7).optional(),
      hasIntensiveSchedule: z.boolean().optional(),
      intensiveStartDate: z.string().optional().nullable(),
      intensiveEndDate: z.string().optional().nullable(),
      intensiveWeeklyHours: z.number().min(1).max(60).optional().nullable(),
    })
    .refine(
      (data) => {
        // Si hasIntensiveSchedule está activo, validar que los campos estén completos
        if (data.hasIntensiveSchedule === true) {
          return (
            data.intensiveStartDate &&
            data.intensiveEndDate &&
            data.intensiveWeeklyHours !== null &&
            data.intensiveWeeklyHours !== undefined
          );
        }
        return true;
      },
      {
        message: "Si activas la jornada intensiva, debes proporcionar fecha de inicio, fecha de fin y horas semanales",
      },
    ),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos (solo HR_ADMIN o superior)
    if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos para editar contratos masivamente" }, { status: 403 });
    }

    // Parsear body
    const body = await request.json();

    // Validar datos
    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 });
    }

    const { contractIds, data } = validation.data;

    // Verificar que todos los contratos pertenecen a la organización del usuario
    const orgId = session.user.orgId;
    const contracts = await prisma.employmentContract.findMany({
      where: {
        id: { in: contractIds },
        orgId,
      },
      select: {
        id: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (contracts.length !== contractIds.length) {
      return NextResponse.json(
        { error: "Algunos contratos no existen o no pertenecen a tu organización" },
        { status: 404 },
      );
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (data.weeklyHours !== undefined) {
      updateData.weeklyHours = data.weeklyHours;
    }

    if (data.workingDaysPerWeek !== undefined) {
      updateData.workingDaysPerWeek = data.workingDaysPerWeek;
    }

    if (data.hasIntensiveSchedule !== undefined) {
      updateData.hasIntensiveSchedule = data.hasIntensiveSchedule;

      if (data.hasIntensiveSchedule) {
        updateData.intensiveStartDate = data.intensiveStartDate;
        updateData.intensiveEndDate = data.intensiveEndDate;
        updateData.intensiveWeeklyHours = data.intensiveWeeklyHours;
      } else {
        // Si se desactiva la jornada intensiva, limpiar los campos
        updateData.intensiveStartDate = null;
        updateData.intensiveEndDate = null;
        updateData.intensiveWeeklyHours = null;
      }
    }

    // Verificar que hay al menos un campo para actualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    // Actualizar contratos en una transacción
    const updatedContracts = await prisma.$transaction(
      contractIds.map((id) =>
        prisma.employmentContract.update({
          where: { id },
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
              select: {
                id: true,
                title: true,
                level: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            costCenter: {
              select: {
                id: true,
                name: true,
                code: true,
              },
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
        }),
      ),
    );

    return NextResponse.json({
      message: `${updatedContracts.length} contrato(s) actualizados correctamente`,
      updatedCount: updatedContracts.length,
      contracts: updatedContracts,
    });
  } catch (error: any) {
    console.error("Error en bulk update de contratos:", error);
    return NextResponse.json({ error: "Error al actualizar contratos", details: error.message }, { status: 500 });
  }
}
