/**
 * Tipos de templates de email y sus props
 */

import type { ChangeNotificationEmailProps } from "../auth/change-notification-email";
import type { InviteEmailProps } from "../auth/invite-email";
import type { ResetPasswordEmailProps } from "../auth/reset-password-email";

// Template IDs (mantener compatibilidad con el sistema actual)
export type EmailTemplateId = "AUTH_INVITE" | "AUTH_RESET_PASSWORD" | "AUTH_CHANGE_NOTIFICATION" | "TEST_HELLO";

// Mapping de template ID a sus props
export interface TemplatePropsMap {
  AUTH_INVITE: InviteEmailProps;
  AUTH_RESET_PASSWORD: ResetPasswordEmailProps;
  AUTH_CHANGE_NOTIFICATION: ChangeNotificationEmailProps;
  TEST_HELLO: { name?: string };
}

// Re-exports para uso externo
export type { InviteEmailProps, ResetPasswordEmailProps, ChangeNotificationEmailProps };
