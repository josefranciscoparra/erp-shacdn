import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { requireGroupCalendarAccess } from "../../../_auth";

export const runtime = "nodejs";

const upsertAssignmentSchema = z.object({
  orgId: z.string().min(1),
  enabled: z.boolean().optional(),
  costCenterIds: z.array(z.string()).optional(), // solo para LOCAL_HOLIDAY
});

export async function PUT(request: NextRequest, context: { params: Promise<{ calendarId: string }> }) {
  try {
    const { calendarId } = await context.params;

    const calendar = await prisma.groupCalendar.findUnique({
      where: { id: calendarId },
      select: { id: true, groupId: true, calendarType: true },
    });
    if (!calendar) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

    const access = await requireGroupCalendarAccess({ groupId: calendar.groupId });
    if (access instanceof NextResponse) return access;

    const json = (await request.json()) as unknown;
    const parsed = upsertAssignmentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "BAD_REQUEST", issues: parsed.error.issues }, { status: 400 });
    }

    // Validar que la org pertenece al grupo.
    const orgInGroup = await prisma.organizationGroupOrganization.findFirst({
      where: {
        groupId: calendar.groupId,
        organizationId: parsed.data.orgId,
        status: "ACTIVE",
        group: { isActive: true },
        organization: { active: true },
      },
      select: { id: true },
    });
    if (!orgInGroup) return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });

    // Si es LOCAL_HOLIDAY, validar sedes (cost centers) pertenecen a esa org.
    const costCenterIds = calendar.calendarType === "LOCAL_HOLIDAY" ? (parsed.data.costCenterIds ?? []) : [];

    if (calendar.calendarType === "LOCAL_HOLIDAY") {
      if (costCenterIds.length === 0) {
        // Permitir assignment sin sedes (queda como incompleto). La UI debe remarcarlo.
      } else {
        const count = await prisma.costCenter.count({
          where: { id: { in: costCenterIds }, orgId: parsed.data.orgId, active: true },
        });
        if (count !== costCenterIds.length) {
          return NextResponse.json({ success: false, error: "BAD_REQUEST" }, { status: 400 });
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      const assignment = await tx.groupCalendarAssignment.upsert({
        where: { groupCalendarId_orgId: { groupCalendarId: calendarId, orgId: parsed.data.orgId } },
        create: {
          groupCalendarId: calendarId,
          orgId: parsed.data.orgId,
          enabled: parsed.data.enabled ?? true,
        },
        update: {
          enabled: parsed.data.enabled ?? undefined,
        },
        select: { id: true },
      });

      if (calendar.calendarType === "LOCAL_HOLIDAY") {
        await tx.groupCalendarAssignmentCostCenter.deleteMany({
          where: { assignmentId: assignment.id },
        });
        if (costCenterIds.length > 0) {
          await tx.groupCalendarAssignmentCostCenter.createMany({
            data: costCenterIds.map((id) => ({ assignmentId: assignment.id, costCenterId: id })),
            skipDuplicates: true,
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
