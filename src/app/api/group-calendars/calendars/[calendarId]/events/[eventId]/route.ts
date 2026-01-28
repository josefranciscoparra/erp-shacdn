import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireGroupCalendarAccess } from "../../../../_auth";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ calendarId: string; eventId: string }> },
) {
  try {
    const { calendarId, eventId } = await context.params;

    const calendar = await prisma.groupCalendar.findUnique({
      where: { id: calendarId },
      select: { id: true, groupId: true },
    });
    if (!calendar) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

    const access = await requireGroupCalendarAccess({ groupId: calendar.groupId });
    if (access instanceof NextResponse) return access;

    await prisma.groupCalendarEvent.deleteMany({
      where: { id: eventId, calendarId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
