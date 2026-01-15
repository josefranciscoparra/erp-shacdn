"use server";

import { sendAuthInviteEmail } from "@/lib/email/email-service";
import { createInviteToken, getAppUrl } from "@/server/actions/auth-tokens";

interface SendInviteParams {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
  organizationName?: string | null;
  performedBy: {
    name: string | null;
    email: string;
  };
}

export async function sendEmployeeImportInvite(
  params: SendInviteParams,
): Promise<{ success: boolean; error?: string }> {
  const { userId, email, firstName, lastName, orgId, organizationName, performedBy } = params;

  try {
    const inviteToken = await createInviteToken(userId);
    if (!inviteToken.success || !inviteToken.data) {
      return { success: false, error: inviteToken.error ?? "No fue posible generar el token de invitación." };
    }

    const inviteLink = `${await getAppUrl()}/auth/accept-invite?token=${inviteToken.data.token}`;
    const emailResult = await sendAuthInviteEmail({
      to: { email, name: `${firstName} ${lastName}` },
      inviteLink,
      orgId,
      userId,
      sendMode: "immediate",
      companyName: organizationName ?? undefined,
      inviterName: performedBy.name ?? performedBy.email ?? undefined,
      expiresAt: inviteToken.data.expiresAt,
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error ?? "No fue posible enviar la invitación." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error enviando invitación de importación:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al enviar invitación.",
    };
  }
}
