"use server";

import { prisma } from "@/lib/prisma";

import { getEmailProvider } from "./provider";
import { renderTemplate } from "./templates";
import type { BaseEmailPayload, EmailRecipient, EmailSendResult } from "./types";

type SendEmailOptions = BaseEmailPayload & {
  userId?: string;
  orgId?: string;
};

/**
 * Envía un email y lo registra en la base de datos
 */
export async function sendEmailRaw(options: SendEmailOptions): Promise<EmailSendResult> {
  const provider = getEmailProvider();

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const firstRecipient = recipients[0];

  const result = await provider.sendRawEmail(options);

  // Registrar en base de datos para auditoría
  try {
    await prisma.emailLog.create({
      data: {
        toEmail: firstRecipient.email,
        toName: firstRecipient.name ?? null,
        userId: options.userId ?? null,
        orgId: options.orgId ?? null,
        templateId: options.templateId ?? null,
        subject: options.subject,
        status: result.success ? "SUCCESS" : "ERROR",
        provider: result.provider ?? "resend",
        providerId: result.id ?? null,
        errorMessage: result.error ?? null,
        metadata: options.metadata ?? undefined,
      },
    });
  } catch (e) {
    console.error("[EmailLog] Error guardando log de email:", e);
  }

  return result;
}

/**
 * Envía email de invitación (alta de usuario)
 */
export async function sendAuthInviteEmail(opts: {
  to: EmailRecipient;
  orgId?: string;
  inviteLink: string;
  userId?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = renderTemplate("AUTH_INVITE", {
    name: opts.to.name,
    inviteLink: opts.inviteLink,
  });

  return sendEmailRaw({
    to: opts.to,
    subject,
    html,
    text,
    templateId: "AUTH_INVITE",
    userId: opts.userId,
    orgId: opts.orgId,
  });
}

/**
 * Envía email de reset de contraseña
 */
export async function sendResetPasswordEmail(opts: {
  to: EmailRecipient;
  resetLink: string;
  orgId?: string;
  userId?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = renderTemplate("AUTH_RESET_PASSWORD", {
    name: opts.to.name,
    resetLink: opts.resetLink,
  });

  return sendEmailRaw({
    to: opts.to,
    subject,
    html,
    text,
    templateId: "AUTH_RESET_PASSWORD",
    userId: opts.userId,
    orgId: opts.orgId,
  });
}

/**
 * Envía notificación de cambio de contraseña
 */
export async function sendSecurityNotificationEmail(opts: {
  to: EmailRecipient;
  orgId?: string;
  userId?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = renderTemplate("AUTH_CHANGE_NOTIFICATION", {
    name: opts.to.name,
  });

  return sendEmailRaw({
    to: opts.to,
    subject,
    html,
    text,
    templateId: "AUTH_CHANGE_NOTIFICATION",
    userId: opts.userId,
    orgId: opts.orgId,
  });
}

/**
 * Envía email de prueba usando la plantilla TEST_HELLO
 */
export async function sendTestEmail(opts: {
  to: EmailRecipient;
  orgId?: string;
  userId?: string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = renderTemplate("TEST_HELLO", {
    name: opts.to.name,
  });

  return sendEmailRaw({
    to: opts.to,
    subject,
    html,
    text,
    templateId: "TEST_HELLO",
    userId: opts.userId,
    orgId: opts.orgId,
  });
}
