import { NextRequest, NextResponse } from "next/server";

import { type Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

async function assertCanViewJob(jobId: string, session: NonNullable<Awaited<ReturnType<typeof auth>>>) {
  const job = await prisma.groupSyncJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      groupId: true,
      status: true,
      conflictStrategy: true,
      selection: true,
      notes: true,
      progressPercent: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      sourceOrg: { select: { id: true, name: true } },
      targets: {
        select: {
          id: true,
          status: true,
          summary: true,
          error: true,
          startedAt: true,
          finishedAt: true,
          targetOrg: { select: { id: true, name: true } },
        },
        orderBy: { targetOrg: { name: "asc" } },
      },
    },
  });

  if (!job) {
    throw new Error("NOT_FOUND");
  }

  const role = session.user.role as Role;
  if (role === "SUPER_ADMIN") return job;

  const membership = await prisma.organizationGroupUser.findFirst({
    where: {
      groupId: job.groupId,
      userId: session.user.id,
      isActive: true,
      role: { in: GROUP_MANAGE_ROLES },
      group: { isActive: true },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  return job;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const effective = await computeEffectivePermissions({ role, orgId: session.user.orgId, userId: session.user.id });
    if (!effective.has("manage_group_configuration")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { jobId } = await context.params;
    const job = await assertCanViewJob(jobId, session);

    return NextResponse.json({ success: true, job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const status = message === "NOT_FOUND" ? 404 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
