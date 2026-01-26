"use server";

import { prisma } from "@/lib/prisma";
import { enqueueEmailSendJob } from "@/server/jobs/email-send-queue";

import { getEmailProvider } from "./provider";
import { renderEmailTemplate } from "./templates/shared/render-email";
import type { BaseEmailPayload, EmailRecipient, EmailSendResult } from "./types";

type SendEmailOptions = BaseEmailPayload & {
  userId?: string;
  orgId?: string;
};

export type EmailSendMode = "queue" | "immediate";

const DEFAULT_EMAIL_DELAY_MS = 600;
let lastEmailSentAt = 0;
let emailSendChain: Promise<void> = Promise.resolve();

const rawEmailSendEnabled = process.env.EMAIL_SEND_ENABLED;
const EMAIL_SEND_ENABLED =
  rawEmailSendEnabled === undefined ? true : rawEmailSendEnabled.trim().toLowerCase() !== "false";

function resolveEmailDelayMs() {
  const rawDelay = process.env.EMPLOYEE_INVITE_MIN_DELAY_MS;
  if (!rawDelay) {
    return DEFAULT_EMAIL_DELAY_MS;
  }

  const parsed = Number.parseInt(rawDelay, 10);
  if (!Number.isFinite(parsed) || parsed < DEFAULT_EMAIL_DELAY_MS) {
    return DEFAULT_EMAIL_DELAY_MS;
  }

  return parsed;
}

const MIN_EMAIL_DELAY_MS = resolveEmailDelayMs();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withEmailRateLimit<T>(task: () => Promise<T>): Promise<T> {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const previous = emailSendChain;
  emailSendChain = previous.then(() => gate);

  await previous;

  const waitMs = Math.max(0, MIN_EMAIL_DELAY_MS - (Date.now() - lastEmailSentAt));
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  try {
    return await task();
  } finally {
    lastEmailSentAt = Date.now();
    release();
  }
}

/**
 * Envía un email y lo registra en la base de datos
 */
export async function sendEmailRawImmediate(options: SendEmailOptions): Promise<EmailSendResult> {
  if (!EMAIL_SEND_ENABLED) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[Email] Envío desactivado (EMAIL_SEND_ENABLED=false).");
    }
    return { success: true, queued: false };
  }

  return withEmailRateLimit(async () => {
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
    } catch (error) {
      console.error("[EmailLog] Error guardando log de email:", error);
    }

    return result;
  });
}

export async function sendEmailRaw(
  options: SendEmailOptions,
  sendMode: EmailSendMode = "queue",
): Promise<EmailSendResult> {
  if (!EMAIL_SEND_ENABLED) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[Email] Envío desactivado (EMAIL_SEND_ENABLED=false).");
    }
    return { success: true, queued: false };
  }

  if (sendMode === "immediate") {
    return sendEmailRawImmediate(options);
  }

  try {
    await enqueueEmailSendJob({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      metadata: options.metadata,
      templateId: options.templateId,
      userId: options.userId,
      orgId: options.orgId,
    });

    return { success: true, queued: true };
  } catch (error) {
    console.error("[EmailQueue] Error encolando email:", error);
    return {
      success: false,
      error: "No fue posible encolar el email.",
    };
  }
}

/**
 * Envía email de invitación (alta de usuario)
 * Usa el nuevo template React Email "Factorial-like"
 */
export async function sendAuthInviteEmail(opts: {
  to: EmailRecipient;
  orgId?: string;
  inviteLink: string;
  userId?: string;
  sendMode?: EmailSendMode;
  // Props adicionales para el nuevo template
  companyName?: string;
  inviterName?: string;
  expiresAt?: Date | string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = await renderEmailTemplate("AUTH_INVITE", {
    recipientName: opts.to.name,
    inviteUrl: opts.inviteLink,
    companyName: opts.companyName,
    inviterName: opts.inviterName,
    expiresAt: opts.expiresAt,
  });

  return sendEmailRaw(
    {
      to: opts.to,
      subject,
      html,
      text,
      templateId: "AUTH_INVITE",
      userId: opts.userId,
      orgId: opts.orgId,
    },
    opts.sendMode ?? "queue",
  );
}

/**
 * Envía email de reset de contraseña
 * Usa el nuevo template React Email "Factorial-like"
 */
export async function sendResetPasswordEmail(opts: {
  to: EmailRecipient;
  resetLink: string;
  orgId?: string;
  userId?: string;
  sendMode?: EmailSendMode;
  // Props adicionales para el nuevo template
  expiresAt?: Date | string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = await renderEmailTemplate("AUTH_RESET_PASSWORD", {
    recipientName: opts.to.name,
    resetUrl: opts.resetLink,
    expiresAt: opts.expiresAt,
  });

  return sendEmailRaw(
    {
      to: opts.to,
      subject,
      html,
      text,
      templateId: "AUTH_RESET_PASSWORD",
      userId: opts.userId,
      orgId: opts.orgId,
    },
    opts.sendMode ?? "queue",
  );
}

/**
 * Envía notificación de cambio de contraseña
 * Usa el nuevo template React Email "Factorial-like"
 */
export async function sendSecurityNotificationEmail(opts: {
  to: EmailRecipient;
  orgId?: string;
  userId?: string;
  sendMode?: EmailSendMode;
  // Props adicionales para el nuevo template
  changedAt?: Date | string;
}): Promise<EmailSendResult> {
  const { subject, html, text } = await renderEmailTemplate("AUTH_CHANGE_NOTIFICATION", {
    recipientName: opts.to.name,
    changedAt: opts.changedAt ?? new Date(),
  });

  return sendEmailRaw(
    {
      to: opts.to,
      subject,
      html,
      text,
      templateId: "AUTH_CHANGE_NOTIFICATION",
      userId: opts.userId,
      orgId: opts.orgId,
    },
    opts.sendMode ?? "queue",
  );
}

/**
 * Envía notificación de cuenta bloqueada por intentos fallidos
 */
export async function sendAccountLockedEmail(opts: {
  to: EmailRecipient;
  orgId?: string;
  userId?: string;
  sendMode?: EmailSendMode;
  lockedUntil?: Date | string;
  attempts?: number;
}): Promise<EmailSendResult> {
  const { subject, html, text } = await renderEmailTemplate("AUTH_ACCOUNT_LOCKED", {
    recipientName: opts.to.name,
    lockedUntil: opts.lockedUntil,
    attempts: opts.attempts,
  });

  return sendEmailRaw(
    {
      to: opts.to,
      subject,
      html,
      text,
      templateId: "AUTH_ACCOUNT_LOCKED",
      userId: opts.userId,
      orgId: opts.orgId,
    },
    opts.sendMode ?? "queue",
  );
}

/**
 * Envía alerta a administradores cuando se bloquea una cuenta
 */
export async function sendAccountLockedAdminEmail(opts: {
  to: EmailRecipient;
  orgId?: string;
  userId?: string;
  sendMode?: EmailSendMode;
  lockedUserName?: string;
  lockedUserEmail: string;
  attempts?: number;
  lockedUntil?: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<EmailSendResult> {
  const { subject, html, text } = await renderEmailTemplate("AUTH_ACCOUNT_LOCKED_ADMIN", {
    recipientName: opts.to.name,
    lockedUserName: opts.lockedUserName,
    lockedUserEmail: opts.lockedUserEmail,
    attempts: opts.attempts,
    lockedUntil: opts.lockedUntil,
    ipAddress: opts.ipAddress ?? undefined,
    userAgent: opts.userAgent ?? undefined,
  });

  return sendEmailRaw(
    {
      to: opts.to,
      subject,
      html,
      text,
      templateId: "AUTH_ACCOUNT_LOCKED_ADMIN",
      userId: opts.userId,
      orgId: opts.orgId,
    },
    opts.sendMode ?? "queue",
  );
}

/**
 * Envía resumen diario de seguridad
 */
export async function sendSecurityDailySummaryEmail(opts: {
  to: EmailRecipient;
  rangeStart: Date | string;
  rangeEnd: Date | string;
  totalEvents: number;
  totalLoginFailed: number;
  totalAccountLocked: number;
  totalAccountUnlocked: number;
  orgSummaries: Array<{
    orgName: string;
    loginFailed: number;
    accountLocked: number;
    accountUnlocked: number;
    total: number;
  }>;
  orgId?: string;
  userId?: string;
  sendMode?: EmailSendMode;
  metadata?: Record<string, unknown>;
}): Promise<EmailSendResult> {
  const { subject, html, text } = await renderEmailTemplate("SECURITY_DAILY_SUMMARY", {
    recipientName: opts.to.name,
    rangeStart: opts.rangeStart,
    rangeEnd: opts.rangeEnd,
    totalEvents: opts.totalEvents,
    totalLoginFailed: opts.totalLoginFailed,
    totalAccountLocked: opts.totalAccountLocked,
    totalAccountUnlocked: opts.totalAccountUnlocked,
    orgSummaries: opts.orgSummaries,
  });

  return sendEmailRaw(
    {
      to: opts.to,
      subject,
      html,
      text,
      templateId: "SECURITY_DAILY_SUMMARY",
      userId: opts.userId,
      orgId: opts.orgId,
      metadata: opts.metadata,
    },
    opts.sendMode ?? "immediate",
  );
}

/**
 * Envía email de prueba usando la plantilla TEST_HELLO
 */
export async function sendTestEmail(opts: {
  to: EmailRecipient;
  orgId?: string;
  userId?: string;
  sendMode?: EmailSendMode;
}): Promise<EmailSendResult> {
  const { subject, html, text } = await renderEmailTemplate("TEST_HELLO", {
    name: opts.to.name,
  });

  return sendEmailRaw(
    {
      to: opts.to,
      subject,
      html,
      text,
      templateId: "TEST_HELLO",
      userId: opts.userId,
      orgId: opts.orgId,
    },
    opts.sendMode ?? "queue",
  );
}
