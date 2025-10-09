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

    // Verificar que el calendario existe y pertenece a la organización
    const calendar = await prisma.calendar.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!calendar) {
      return NextResponse.json({ error: "Calendario no encontrado" }, { status: 404 });
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        calendarId: id,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error al obtener eventos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const calendar = await prisma.calendar.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!calendar) {
      return NextResponse.json({ error: "Calendario no encontrado" }, { status: 404 });
    }

    // Validar datos requeridos
    if (!body.name || !body.date) {
      return NextResponse.json({ error: "Faltan datos requeridos: name, date" }, { status: 400 });
    }

    // Crear evento
    const event = await prisma.calendarEvent.create({
      data: {
        calendarId: id,
        name: body.name,
        description: body.description ?? null,
        date: new Date(body.date),
        endDate: body.endDate ? new Date(body.endDate) : null,
        eventType: body.eventType ?? "HOLIDAY",
        isRecurring: body.isRecurring ?? false,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear evento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
