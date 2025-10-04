import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Calendars API - Starting GET request");

    // Verificar autenticación
    const session = await auth();
    console.log("🔍 Calendars API - Session:", session ? "exists" : "null");

    if (!session?.user) {
      console.log("🔍 Calendars API - No session or user, returning 401");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    console.log("🔍 Calendars API - OrgId:", orgId);

    const calendars = await prisma.calendar.findMany({
      where: {
        orgId,
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
      orderBy: [
        { year: "desc" },
        { calendarType: "asc" },
        { name: "asc" },
      ],
    });

    console.log("🔍 Calendars API - Found calendars:", calendars.length);
    return NextResponse.json(calendars);
  } catch (error) {
    console.error("❌ Error al obtener calendarios:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const body = await request.json();

    // Validar datos requeridos
    if (!body.name || !body.year) {
      return NextResponse.json(
        { error: "Faltan datos requeridos: name, year" },
        { status: 400 }
      );
    }

    // Validar que el año sea válido
    if (typeof body.year !== "number" || body.year < 2000 || body.year > 2100) {
      return NextResponse.json(
        { error: "El año debe estar entre 2000 y 2100" },
        { status: 400 }
      );
    }

    // Crear calendario
    const calendar = await prisma.calendar.create({
      data: {
        orgId,
        name: body.name,
        description: body.description || null,
        year: body.year,
        calendarType: body.calendarType || "NATIONAL_HOLIDAY",
        color: body.color || "#3b82f6",
        costCenterId: body.costCenterId || null,
        active: body.active !== undefined ? body.active : true,
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

    return NextResponse.json(calendar, { status: 201 });
  } catch (error: any) {
    // Errores de unicidad Prisma
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un calendario con ese nombre" },
        { status: 409 }
      );
    }
    console.error("Error al crear calendario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
