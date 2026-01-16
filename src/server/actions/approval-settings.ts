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

export type ApprovalSettingsConfig = {
  settings: ApprovalSettings;
  groupHrApprovalsEnabled: boolean;
};

const ApprovalSettingsInputSchema = z.object({
  settings: ApprovalSettingsSchema,
  groupHrApprovalsEnabled: z.boolean().optional(),
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

export async function getApprovalSettings(): Promise<ApprovalSettingsConfig> {
  const session = await getAdminSession();

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { approvalSettings: true, groupHrApprovalsEnabled: true },
  });

  const settings = normalizeApprovalSettings(org?.approvalSettings ?? DEFAULT_APPROVAL_SETTINGS);
  const groupHrApprovalsEnabled = org ? org.groupHrApprovalsEnabled : true;

  return { settings, groupHrApprovalsEnabled };
}

export async function updateApprovalSettings(input: ApprovalSettingsConfig) {
  const session = await getAdminSession();
  const parsed = ApprovalSettingsInputSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Configuración de aprobaciones inválida" };
  }

  try {
    validateSettings(parsed.data.settings);

    const updateData: { approvalSettings: ApprovalSettings; groupHrApprovalsEnabled?: boolean } = {
      approvalSettings: parsed.data.settings,
    };

    if (typeof parsed.data.groupHrApprovalsEnabled === "boolean") {
      updateData.groupHrApprovalsEnabled = parsed.data.groupHrApprovalsEnabled;
    }

    await prisma.organization.update({
      where: { id: session.user.orgId },
      data: updateData,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo guardar la configuración",
    };
  }
}
