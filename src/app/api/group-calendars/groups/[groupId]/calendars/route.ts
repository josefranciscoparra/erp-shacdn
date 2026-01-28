import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { requireGroupCalendarAccess } from "../../../_auth";

export const runtime = "nodejs";

const createCalendarSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  year: z.number().int().min(2000).max(2100),
  calendarType: z.enum(["NATIONAL_HOLIDAY", "LOCAL_HOLIDAY", "CORPORATE_EVENT", "CUSTOM"]),
  color: z.string().optional(),
  applyToAllOrganizations: z.boolean().optional(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await context.params;
    const access = await requireGroupCalendarAccess({ groupId });
    if (access instanceof NextResponse) return access;

    const group = await prisma.organizationGroup.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, isActive: true },
    });

    if (!group) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const calendars = await prisma.groupCalendar.findMany({
      where: { groupId },
      include: {
        _count: { select: { events: true, assignments: true } },
      },
      orderBy: [{ year: "desc" }, { calendarType: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      group,
      calendars: calendars.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        year: c.year,
        calendarType: c.calendarType,
        color: c.color,
        active: c.active,
        applyToAllOrganizations: c.applyToAllOrganizations,
        counts: {
          events: c._count.events,
          assignments: c._count.assignments,
        },
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await context.params;
    const access = await requireGroupCalendarAccess({ groupId });
    if (access instanceof NextResponse) return access;

    const json = (await request.json()) as unknown;
    const parsed = createCalendarSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "BAD_REQUEST", issues: parsed.error.issues }, { status: 400 });
    }

    const group = await prisma.organizationGroup.findUnique({
      where: { id: groupId, isActive: true },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const applyToAllOrganizations =
      parsed.data.calendarType === "LOCAL_HOLIDAY" ? false : (parsed.data.applyToAllOrganizations ?? false);

    const created = await prisma.groupCalendar.create({
      data: {
        groupId,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
        year: parsed.data.year,
        calendarType: parsed.data.calendarType,
        color: parsed.data.color ?? "#3b82f6",
        active: true,
        applyToAllOrganizations,
        createdById: access.session.user.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, calendarId: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
