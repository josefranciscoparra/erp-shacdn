import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { requireGroupCalendarAccess } from "../../../_auth";

export const runtime = "nodejs";

const createEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  date: z.string().min(1), // ISO string
  endDate: z.string().optional().nullable(),
  eventType: z.enum(["HOLIDAY", "CLOSURE", "EVENT", "MEETING", "DEADLINE", "OTHER"]).optional(),
  isRecurring: z.boolean().optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ calendarId: string }> }) {
  try {
    const { calendarId } = await context.params;

    const calendar = await prisma.groupCalendar.findUnique({
      where: { id: calendarId },
      select: { id: true, groupId: true },
    });
    if (!calendar) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

    const access = await requireGroupCalendarAccess({ groupId: calendar.groupId });
    if (access instanceof NextResponse) return access;

    const json = (await request.json()) as unknown;
    const parsed = createEventSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "BAD_REQUEST", issues: parsed.error.issues }, { status: 400 });
    }

    const date = new Date(parsed.data.date);
    const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;

    const created = await prisma.groupCalendarEvent.create({
      data: {
        calendarId,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
        date,
        endDate,
        eventType: parsed.data.eventType ?? "HOLIDAY",
        isRecurring: parsed.data.isRecurring ?? false,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, eventId: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
