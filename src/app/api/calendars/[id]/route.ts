import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const orgId = session.user.orgId;

    const calendar = await prisma.calendar.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        costCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        events: {
          orderBy: {
            date: "asc",
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (!calendar) {
      return NextResponse.json({ error: "Calendario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("Error al obtener calendario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const orgId = session.user.orgId;
    const body = await request.json();

    // Verificar que el calendario existe y pertenece a la organización
    const existingCalendar = await prisma.calendar.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existingCalendar) {
      return NextResponse.json({ error: "Calendario no encontrado" }, { status: 404 });
    }

    const hasCostCenterField = Object.prototype.hasOwnProperty.call(body, "costCenterId");
    let resolvedCostCenterId: string | null | undefined = undefined;

    if (hasCostCenterField) {
      if (body.costCenterId === null) {
        resolvedCostCenterId = null;
      } else if (typeof body.costCenterId === "string") {
        const trimmed = body.costCenterId.trim();
        resolvedCostCenterId = trimmed && trimmed !== "__none__" ? trimmed : null;
      }
    }

    const nextCalendarType = body.calendarType ?? existingCalendar.calendarType;
    const effectiveCostCenterId =
      resolvedCostCenterId !== undefined ? resolvedCostCenterId : existingCalendar.costCenterId;

    if (nextCalendarType === "LOCAL_HOLIDAY" && !effectiveCostCenterId) {
      return NextResponse.json({ error: "Selecciona un centro de coste para calendarios locales" }, { status: 400 });
    }

    if (resolvedCostCenterId) {
      const costCenter = await prisma.costCenter.findFirst({
        where: {
          id: resolvedCostCenterId,
          orgId,
          active: true,
        },
      });

      if (!costCenter) {
        return NextResponse.json({ error: "Centro de coste inválido" }, { status: 400 });
      }
    }

    // Actualizar calendario
    const calendar = await prisma.calendar.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existingCalendar.name,
        description: body.description !== undefined ? body.description : existingCalendar.description,
        year: body.year !== undefined ? body.year : existingCalendar.year,
        calendarType: nextCalendarType,
        color: body.color !== undefined ? body.color : existingCalendar.color,
        costCenterId: resolvedCostCenterId !== undefined ? resolvedCostCenterId : existingCalendar.costCenterId,
        active: body.active !== undefined ? body.active : existingCalendar.active,
      },
      include: {
        costCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    return NextResponse.json(calendar);
  } catch (error: any) {
    console.error("Error al actualizar calendario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const orgId = session.user.orgId;

    // Verificar que el calendario existe y pertenece a la organización
    const existingCalendar = await prisma.calendar.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existingCalendar) {
      return NextResponse.json({ error: "Calendario no encontrado" }, { status: 404 });
    }

    // Eliminar calendario (cascade eliminará los eventos)
    await prisma.calendar.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar calendario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
