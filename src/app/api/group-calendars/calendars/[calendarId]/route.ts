import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { requireGroupCalendarAccess } from "../../_auth";

export const runtime = "nodejs";

const updateCalendarSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
  active: z.boolean().optional(),
  applyToAllOrganizations: z.boolean().optional(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ calendarId: string }> }) {
  try {
    const { calendarId } = await context.params;

    const calendar = await prisma.groupCalendar.findUnique({
      where: { id: calendarId },
      select: { id: true, groupId: true },
    });
    if (!calendar) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

    const access = await requireGroupCalendarAccess({ groupId: calendar.groupId });
    if (access instanceof NextResponse) return access;

    const full = await prisma.groupCalendar.findUnique({
      where: { id: calendarId },
      include: {
        events: { orderBy: { date: "asc" } },
        additions: { orderBy: { date: "asc" } },
        assignments: {
          include: {
            costCenters: { include: { costCenter: { select: { id: true, name: true, code: true } } } },
            organization: { select: { id: true, name: true } },
          },
          orderBy: { organization: { name: "asc" } },
        },
        group: {
          select: {
            id: true,
            name: true,
            organizations: {
              where: { status: "ACTIVE" },
              include: { organization: { select: { id: true, name: true } } },
              orderBy: { organization: { name: "asc" } },
            },
          },
        },
      },
    });

    if (!full) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      success: true,
      calendar: {
        id: full.id,
        groupId: full.groupId,
        groupName: full.group.name,
        name: full.name,
        description: full.description,
        year: full.year,
        calendarType: full.calendarType,
        color: full.color,
        active: full.active,
        applyToAllOrganizations: full.applyToAllOrganizations,
        events: full.events,
        additions: full.additions,
        organizations: full.group.organizations.map((o) => o.organization),
        assignments: full.assignments.map((a) => ({
          orgId: a.orgId,
          orgName: a.organization.name,
          enabled: a.enabled,
          costCenters: a.costCenters.map((cc) => cc.costCenter),
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ calendarId: string }> }) {
  try {
    const { calendarId } = await context.params;

    const existing = await prisma.groupCalendar.findUnique({
      where: { id: calendarId },
      select: { id: true, groupId: true, calendarType: true },
    });
    if (!existing) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

    const access = await requireGroupCalendarAccess({ groupId: existing.groupId });
    if (access instanceof NextResponse) return access;

    const json = (await request.json()) as unknown;
    const parsed = updateCalendarSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "BAD_REQUEST", issues: parsed.error.issues }, { status: 400 });
    }

    const applyToAllOrganizations =
      existing.calendarType === "LOCAL_HOLIDAY" ? undefined : (parsed.data.applyToAllOrganizations ?? undefined);

    await prisma.groupCalendar.update({
      where: { id: calendarId },
      data: {
        name: parsed.data.name ? parsed.data.name.trim() : undefined,
        description:
          parsed.data.description === undefined
            ? undefined
            : parsed.data.description?.trim()
              ? parsed.data.description.trim()
              : null,
        color: parsed.data.color ?? undefined,
        active: parsed.data.active ?? undefined,
        applyToAllOrganizations,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ calendarId: string }> }) {
  try {
    const { calendarId } = await context.params;

    const existing = await prisma.groupCalendar.findUnique({
      where: { id: calendarId },
      select: { id: true, groupId: true },
    });
    if (!existing) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

    const access = await requireGroupCalendarAccess({ groupId: existing.groupId });
    if (access instanceof NextResponse) return access;

    await prisma.groupCalendar.delete({ where: { id: calendarId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
