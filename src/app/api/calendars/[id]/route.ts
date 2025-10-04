import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

    // Actualizar calendario
    const calendar = await prisma.calendar.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existingCalendar.name,
        description: body.description !== undefined ? body.description : existingCalendar.description,
        year: body.year !== undefined ? body.year : existingCalendar.year,
        calendarType:
          body.calendarType !== undefined ? body.calendarType : existingCalendar.calendarType,
        color: body.color !== undefined ? body.color : existingCalendar.color,
        costCenterId:
          body.costCenterId !== undefined ? body.costCenterId : existingCalendar.costCenterId,
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
