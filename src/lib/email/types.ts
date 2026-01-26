/**
 * Tipos del sistema de email
 */

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailTemplateId =
  | "AUTH_INVITE"
  | "AUTH_RESET_PASSWORD"
  | "AUTH_CHANGE_NOTIFICATION"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_ACCOUNT_LOCKED_ADMIN"
  | "SECURITY_DAILY_SUMMARY"
  | "TEST_HELLO";

export interface BaseEmailPayload {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  metadata?: Record<string, unknown>;
  templateId?: EmailTemplateId;
}

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
  provider?: "resend";
  queued?: boolean;
}
