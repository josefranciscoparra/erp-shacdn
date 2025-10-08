import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

interface ImportHolidaysRequest {
  year: number;
  countryCode: string;
  calendarId?: string; // Si se proporciona, añadir al calendario existente
  calendarName?: string; // Nombre custom para el nuevo calendario
  costCenterId?: string; // Opcional: para festivos locales
  calendarType?: "NATIONAL_HOLIDAY" | "LOCAL_HOLIDAY" | "CORPORATE_EVENT" | "CUSTOM";
  color?: string; // Color hex para el calendario
  isRecurring?: boolean; // Marcar eventos como recurrentes
}

const COUNTRY_NAMES: Record<string, string> = {
  ES: "España",
  FR: "Francia",
  PT: "Portugal",
  GB: "Reino Unido",
  US: "Estados Unidos",
  DE: "Alemania",
  IT: "Italia",
  NL: "Países Bajos",
  BE: "Bélgica",
  CH: "Suiza",
  AT: "Austria",
  MX: "México",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Perú",
};

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const body: ImportHolidaysRequest = await request.json();

    // Validar datos requeridos
    if (!body.year || !body.countryCode) {
      return NextResponse.json(
        { error: "Faltan datos requeridos: year, countryCode" },
        { status: 400 }
      );
    }

    // Validar año
    if (body.year < 2000 || body.year > 2100) {
      return NextResponse.json(
        { error: "El año debe estar entre 2000 y 2100" },
        { status: 400 }
      );
    }

    console.log(`📅 Importing holidays: ${body.countryCode} ${body.year}`);

    // Fetch festivos desde nager.date API
    const nagerUrl = `https://date.nager.at/api/v3/PublicHolidays/${body.year}/${body.countryCode}`;
    const nagerResponse = await fetch(nagerUrl);

    if (!nagerResponse.ok) {
      console.error("❌ Error fetching from nager.date:", nagerResponse.statusText);
      return NextResponse.json(
        { error: "Error al obtener festivos desde la API externa" },
        { status: 502 }
      );
    }

    const holidays: NagerHoliday[] = await nagerResponse.json();

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron festivos para este país y año" },
        { status: 404 }
      );
    }

    console.log(`✅ Fetched ${holidays.length} holidays from nager.date`);

    // Determinar calendario destino
    let calendar;
    if (body.calendarId) {
      // Usar calendario existente
      calendar = await prisma.calendar.findFirst({
        where: {
          id: body.calendarId,
          orgId,
        },
      });

      if (!calendar) {
        return NextResponse.json({ error: "Calendario no encontrado" }, { status: 404 });
      }
    } else {
      // Crear nuevo calendario
      const countryName = COUNTRY_NAMES[body.countryCode] || body.countryCode;
      const defaultCalendarName = body.calendarName || `Festivos ${countryName} ${body.year}`;
      const defaultCalendarType = body.calendarType || "NATIONAL_HOLIDAY";
      const defaultColor = body.color || "#3b82f6";

      calendar = await prisma.calendar.create({
        data: {
          orgId,
          name: defaultCalendarName,
          description: `Festivos oficiales de ${countryName} para el año ${body.year}. Importados automáticamente.`,
          year: body.year,
          calendarType: defaultCalendarType,
          color: defaultColor,
          costCenterId: body.costCenterId || null,
          active: true,
        },
      });

      console.log(`📆 Created new calendar: ${calendar.name}`);
    }

    // Obtener eventos existentes en el calendario para evitar duplicados
    const existingEvents = await prisma.calendarEvent.findMany({
      where: {
        calendarId: calendar.id,
      },
      select: {
        date: true,
        name: true,
      },
    });

    const existingEventKeys = new Set(
      existingEvents.map((e) => `${e.date.toISOString().split("T")[0]}-${e.name}`)
    );

    // Crear eventos desde los festivos importados
    const eventsToCreate = holidays
      .filter((holiday) => {
        const eventKey = `${holiday.date}-${holiday.localName}`;
        return !existingEventKeys.has(eventKey); // Evitar duplicados
      })
      .map((holiday) => ({
        calendarId: calendar!.id,
        name: holiday.localName,
        description: `${holiday.name}${holiday.global ? " (Nacional)" : " (Regional)"}`,
        date: new Date(holiday.date),
        endDate: null,
        eventType: "HOLIDAY" as const,
        isRecurring: body.isRecurring || false,
      }));

    if (eventsToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: holidays.length,
        message: "Todos los eventos ya existen en el calendario",
        calendar: {
          id: calendar.id,
          name: calendar.name,
        },
      });
    }

    // Insertar eventos en batch
    await prisma.calendarEvent.createMany({
      data: eventsToCreate,
      skipDuplicates: true,
    });

    console.log(`✅ Imported ${eventsToCreate.length} events`);

    // Obtener eventos creados para retornar
    const createdEvents = await prisma.calendarEvent.findMany({
      where: {
        calendarId: calendar.id,
        date: {
          in: eventsToCreate.map((e) => e.date),
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        imported: eventsToCreate.length,
        skipped: holidays.length - eventsToCreate.length,
        calendar: {
          id: calendar.id,
          name: calendar.name,
        },
        events: createdEvents,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Error importing holidays:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/calendars/import-holidays?year=2025&countryCode=ES
// Preview de festivos sin importar (útil para el dialog)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");
    const countryCode = searchParams.get("countryCode");

    if (!year || !countryCode) {
      return NextResponse.json(
        { error: "Faltan parámetros: year, countryCode" },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    if (yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json(
        { error: "El año debe estar entre 2000 y 2100" },
        { status: 400 }
      );
    }

    // Fetch festivos desde nager.date API
    const nagerUrl = `https://date.nager.at/api/v3/PublicHolidays/${yearNum}/${countryCode}`;
    const nagerResponse = await fetch(nagerUrl);

    if (!nagerResponse.ok) {
      return NextResponse.json(
        { error: "Error al obtener festivos desde la API externa" },
        { status: 502 }
      );
    }

    const holidays: NagerHoliday[] = await nagerResponse.json();

    return NextResponse.json({
      success: true,
      count: holidays.length,
      holidays: holidays.map((h) => ({
        date: h.date,
        name: h.localName,
        nameEn: h.name,
        global: h.global,
        type: h.types[0] || "Public",
      })),
    });
  } catch (error: any) {
    console.error("❌ Error fetching holidays preview:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
