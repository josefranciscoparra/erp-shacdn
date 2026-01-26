/**
 * Tipos de templates de email y sus props
 */

import type { AccountLockedAdminEmailProps } from "../auth/account-locked-admin-email";
import type { AccountLockedEmailProps } from "../auth/account-locked-email";
import type { ChangeNotificationEmailProps } from "../auth/change-notification-email";
import type { InviteEmailProps } from "../auth/invite-email";
import type { ResetPasswordEmailProps } from "../auth/reset-password-email";
import type { SecurityDailySummaryEmailProps } from "../security/security-daily-summary-email";

// Template IDs (mantener compatibilidad con el sistema actual)
export type EmailTemplateId =
  | "AUTH_INVITE"
  | "AUTH_RESET_PASSWORD"
  | "AUTH_CHANGE_NOTIFICATION"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_ACCOUNT_LOCKED_ADMIN"
  | "SECURITY_DAILY_SUMMARY"
  | "TEST_HELLO";

// Mapping de template ID a sus props
export interface TemplatePropsMap {
  AUTH_INVITE: InviteEmailProps;
  AUTH_RESET_PASSWORD: ResetPasswordEmailProps;
  AUTH_CHANGE_NOTIFICATION: ChangeNotificationEmailProps;
  AUTH_ACCOUNT_LOCKED: AccountLockedEmailProps;
  AUTH_ACCOUNT_LOCKED_ADMIN: AccountLockedAdminEmailProps;
  SECURITY_DAILY_SUMMARY: SecurityDailySummaryEmailProps;
  TEST_HELLO: { name?: string };
}

// Re-exports para uso externo
export type {
  InviteEmailProps,
  ResetPasswordEmailProps,
  ChangeNotificationEmailProps,
  AccountLockedEmailProps,
  AccountLockedAdminEmailProps,
  SecurityDailySummaryEmailProps,
};
