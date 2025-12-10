import type { Session } from "next-auth";

import { auth } from "@/lib/auth";

export interface OrgContext {
  activeOrgId: string;
  accessibleOrgIds: string[];
  isMultiOrg: boolean;
}

function ensureOrgList(orgIds: string[] | undefined, fallbackOrgId?: string): string[] {
  if (orgIds && orgIds.length > 0) {
    return orgIds;
  }

  if (fallbackOrgId) {
    return [fallbackOrgId];
  }

  return [];
}

export async function getOrgContext(providedSession?: Session | null): Promise<OrgContext> {
  const session = providedSession ?? (await auth());

  if (!session?.user) {
    throw new Error("UNAUTHENTICATED");
  }

  const accessibleOrgIds = ensureOrgList(session.user.accessibleOrgIds, session.user.orgId);

  if (accessibleOrgIds.length === 0) {
    throw new Error("ORG_SCOPE_MISSING");
  }

  const activeOrgId = session.user.activeOrgId ?? accessibleOrgIds[0];

  return {
    activeOrgId,
    accessibleOrgIds,
    isMultiOrg: accessibleOrgIds.length > 1,
  };
}

export async function getCurrentOrgId(providedSession?: Session | null): Promise<string> {
  const context = await getOrgContext(providedSession);
  return context.activeOrgId;
}
