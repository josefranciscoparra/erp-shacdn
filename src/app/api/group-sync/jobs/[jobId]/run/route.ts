import { NextRequest, NextResponse } from "next/server";

import { type Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { executeGroupSyncForTarget, type ConflictStrategy, type GroupSyncSelection } from "@/lib/group-sync/engine";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

async function assertCanRunJob(jobId: string, session: NonNullable<Awaited<ReturnType<typeof auth>>>) {
  const job = await prisma.groupSyncJob.findUnique({
    where: { id: jobId },
    select: { id: true, groupId: true, status: true },
  });

  if (!job) throw new Error("NOT_FOUND");

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

  if (!membership) throw new Error("FORBIDDEN");

  return job;
}

async function runJob(jobId: string) {
  const job = await prisma.groupSyncJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      groupId: true,
      sourceOrgId: true,
      conflictStrategy: true,
      selection: true,
      targets: {
        select: { id: true, targetOrgId: true, status: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!job) return;
  if (job.status === "RUNNING") return;

  const selection = (job.selection ?? {}) as GroupSyncSelection;
  const conflictStrategy = (job.conflictStrategy ?? "SKIP") as ConflictStrategy;

  await prisma.groupSyncJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      progressPercent: 0,
      startedAt: new Date(),
      finishedAt: null,
    },
  });

  let completed = 0;
  let errorCount = 0;

  for (const target of job.targets) {
    await prisma.groupSyncJobTarget.update({
      where: { id: target.id },
      data: { status: "RUNNING", startedAt: new Date(), finishedAt: null, error: null, summary: {} },
    });

    try {
      const summaries = await executeGroupSyncForTarget({
        sourceOrgId: job.sourceOrgId,
        targetOrgId: target.targetOrgId,
        selection,
        conflictStrategy,
      });

      await prisma.groupSyncJobTarget.update({
        where: { id: target.id },
        data: {
          status: "SUCCESS",
          summary: summaries as any,
          finishedAt: new Date(),
        },
      });
    } catch (err) {
      errorCount += 1;
      const message = err instanceof Error ? err.message : "Error desconocido";

      await prisma.groupSyncJobTarget.update({
        where: { id: target.id },
        data: {
          status: "FAILED",
          error: message,
          finishedAt: new Date(),
        },
      });
    }

    completed += 1;
    const progressPercent = Math.round((completed / Math.max(1, job.targets.length)) * 100);
    await prisma.groupSyncJob.update({
      where: { id: jobId },
      data: { progressPercent },
    });
  }

  await prisma.groupSyncJob.update({
    where: { id: jobId },
    data: {
      status: errorCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
      progressPercent: 100,
      finishedAt: new Date(),
    },
  });
}

export async function POST(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
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
    const job = await assertCanRunJob(jobId, session);

    if (job.status === "RUNNING") {
      return NextResponse.json({ success: true, status: "RUNNING" });
    }

    // Fire-and-forget (en node runtime) para permitir polling desde UI.
    void runJob(jobId).catch((err) => {
      console.error("Error ejecutando GroupSyncJob:", err);
    });

    return NextResponse.json({ success: true, status: "STARTED" }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const status = message === "NOT_FOUND" ? 404 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
