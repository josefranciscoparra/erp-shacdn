"use server";

import { z } from "zod";

import {
  ApprovalSettingsSchema,
  type ApprovalSettings,
  DEFAULT_APPROVAL_SETTINGS,
  normalizeApprovalSettings,
} from "@/lib/approvals/approval-settings";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WorkflowSchema = ApprovalSettingsSchema.shape.workflows.shape.PTO;

const ApprovalSettingsInputSchema = z.object({
  version: z.literal(1),
  workflows: z.object({
    PTO: WorkflowSchema,
    MANUAL_TIME_ENTRY: WorkflowSchema,
    TIME_BANK: WorkflowSchema,
    EXPENSE: WorkflowSchema,
  }),
});

function hasUniqueCriteria(criteria: string[]) {
  return new Set(criteria).size === criteria.length;
}

function validateSettings(settings: ApprovalSettings) {
  const { workflows } = settings;

  Object.values(workflows).forEach((workflow) => {
    if (!hasUniqueCriteria(workflow.criteriaOrder)) {
      throw new Error("El orden de criterios no puede repetir valores.");
    }

    if (workflow.approverList.length > 0 && !hasUniqueCriteria(workflow.approverList)) {
      throw new Error("La lista de aprobadores no puede repetir usuarios.");
    }
  });
}

async function getAdminSession() {
  const session = await auth();

  if (!session?.user?.orgId) {
    throw new Error("Usuario no autenticado");
  }

  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(session.user.role)) {
    throw new Error("No tienes permisos para gestionar aprobaciones");
  }

  return session;
}

export async function getApprovalSettings(): Promise<ApprovalSettings> {
  const session = await getAdminSession();

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { approvalSettings: true },
  });

  return normalizeApprovalSettings(org?.approvalSettings ?? DEFAULT_APPROVAL_SETTINGS);
}

export async function updateApprovalSettings(input: ApprovalSettings) {
  const session = await getAdminSession();
  const parsed = ApprovalSettingsInputSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Configuración de aprobaciones inválida" };
  }

  try {
    validateSettings(parsed.data);

    await prisma.organization.update({
      where: { id: session.user.orgId },
      data: {
        approvalSettings: parsed.data,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo guardar la configuración",
    };
  }
}
