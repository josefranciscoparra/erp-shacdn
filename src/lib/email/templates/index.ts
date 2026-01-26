/**
 * Sistema de plantillas de email
 *
 * Este archivo mantiene compatibilidad con el sistema anterior
 * mientras usa internamente los nuevos templates de React Email.
 */

import type { EmailTemplateId } from "../types";

// Re-exports
export { renderEmailTemplate, type RenderEmailResult } from "./shared/render-email";
export type {
  EmailTemplateId as TemplateId,
  TemplatePropsMap,
  InviteEmailProps,
  ResetPasswordEmailProps,
  ChangeNotificationEmailProps,
  AccountLockedEmailProps,
  AccountLockedAdminEmailProps,
  SecurityDailySummaryEmailProps,
} from "./shared/email-props";

// Export templates directamente
export { AccountLockedAdminEmail } from "./auth/account-locked-admin-email";
export { AccountLockedEmail } from "./auth/account-locked-email";
export { InviteEmail } from "./auth/invite-email";
export { ResetPasswordEmail } from "./auth/reset-password-email";
export { ChangeNotificationEmail } from "./auth/change-notification-email";
export { SecurityDailySummaryEmail } from "./security/security-daily-summary-email";

// Tipo para compatibilidad
type TemplateResult = {
  subject: string;
  html: string;
  text?: string;
};

/**
 * Función de compatibilidad con el sistema anterior.
 *
 * @deprecated Usar `renderEmailTemplate` en su lugar para los nuevos templates.
 *
 * Esta función se mantiene para compatibilidad con el código existente.
 * Internamente usa el nuevo sistema de React Email cuando es posible.
 */
export function renderTemplate(templateId: EmailTemplateId, vars: Record<string, unknown>): TemplateResult {
  // Para mantener compatibilidad síncrona, usamos los templates básicos
  // El nuevo sistema async se usa en email-service.ts
  switch (templateId) {
    case "AUTH_INVITE":
      return renderAuthInviteLegacy(vars as { name?: string; inviteLink: string });
    case "AUTH_RESET_PASSWORD":
      return renderAuthResetLegacy(vars as { name?: string; resetLink: string });
    case "AUTH_CHANGE_NOTIFICATION":
      return renderAuthChangeNotificationLegacy(vars as { name?: string });
    case "AUTH_ACCOUNT_LOCKED":
      return renderAuthAccountLockedLegacy(vars as { name?: string });
    case "AUTH_ACCOUNT_LOCKED_ADMIN":
      return renderAuthAccountLockedAdminLegacy(vars as { name?: string });
    case "SECURITY_DAILY_SUMMARY":
      return renderSecurityDailySummaryLegacy(
        vars as {
          name?: string;
          rangeStart?: string;
          rangeEnd?: string;
          totalEvents?: number;
        },
      );
    case "TEST_HELLO":
    default:
      return renderTestHelloLegacy(vars as { name?: string });
  }
}

// --- Legacy renderers (mantener para compatibilidad síncrona) ---

function renderAuthInviteLegacy(vars: { name?: string; inviteLink: string }): TemplateResult {
  const name = vars.name ?? "Hola";
  return {
    subject: "Has sido dado de alta en TimeNow",
    html: `
      <p>${name},</p>
      <p>Te han creado una cuenta en <strong>TimeNow</strong>.</p>
      <p>Puedes acceder desde el siguiente enlace:</p>
      <p><a href="${vars.inviteLink}">Acceder a TimeNow</a></p>
      <p>Si no esperabas este correo, puedes ignorarlo.</p>
    `,
    text: `${name}, te han creado una cuenta en TimeNow. Accede desde: ${vars.inviteLink}`,
  };
}

function renderAuthResetLegacy(vars: { name?: string; resetLink: string }): TemplateResult {
  const name = vars.name ?? "Hola";
  return {
    subject: "Restablecer contraseña de TimeNow",
    html: `
      <p>${name},</p>
      <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
      <p>Puedes cambiarla desde aquí:</p>
      <p><a href="${vars.resetLink}">Restablecer contraseña</a></p>
      <p>Si no has solicitado esto, ignora este correo.</p>
    `,
    text: `${name}, puedes restablecer tu contraseña desde: ${vars.resetLink}`,
  };
}

function renderAuthChangeNotificationLegacy(vars: { name?: string }): TemplateResult {
  const name = vars.name ?? "Hola";
  return {
    subject: "Tu contraseña de TimeNow ha sido cambiada",
    html: `
      <p>${name},</p>
      <p>Te informamos de que tu contraseña en TimeNow ha sido actualizada.</p>
      <p>Si no has sido tú, contacta con tu responsable de Recursos Humanos.</p>
    `,
    text: `${name}, tu contraseña de TimeNow ha sido cambiada. Si no has sido tú, contacta con RRHH.`,
  };
}

function renderAuthAccountLockedLegacy(vars: { name?: string }): TemplateResult {
  const name = vars.name ?? "Hola";
  return {
    subject: "Tu cuenta de TimeNow se ha bloqueado temporalmente",
    html: `
      <p>${name},</p>
      <p>Hemos detectado varios intentos fallidos y hemos bloqueado tu cuenta temporalmente por seguridad.</p>
      <p>Si no has sido tú, contacta con tu responsable de Recursos Humanos.</p>
    `,
    text: `${name}, hemos bloqueado temporalmente tu cuenta por varios intentos fallidos. Si no has sido tú, contacta con RRHH.`,
  };
}

function renderAuthAccountLockedAdminLegacy(vars: { name?: string }): TemplateResult {
  const name = vars.name ?? "Hola";
  return {
    subject: "Alerta de seguridad: cuenta bloqueada",
    html: `
      <p>${name},</p>
      <p>Se ha bloqueado una cuenta por intentos fallidos.</p>
      <p>Revisa el panel de seguridad para más detalles.</p>
    `,
    text: `${name}, se ha bloqueado una cuenta por intentos fallidos. Revisa el panel de seguridad para más detalles.`,
  };
}

function renderSecurityDailySummaryLegacy(vars: {
  name?: string;
  rangeStart?: string;
  rangeEnd?: string;
  totalEvents?: number;
}): TemplateResult {
  const name = vars.name ?? "Hola";
  const startLabel = vars.rangeStart ?? "-";
  const endLabel = vars.rangeEnd ?? "-";
  const totalEvents = typeof vars.totalEvents === "number" ? vars.totalEvents : 0;
  return {
    subject: "Resumen diario de seguridad",
    html: `
      <p>${name},</p>
      <p>Resumen diario de seguridad.</p>
      <p>Periodo: ${startLabel} → ${endLabel}</p>
      <p>Total eventos: ${totalEvents}</p>
    `,
    text: `${name}, resumen diario de seguridad. Periodo: ${startLabel} → ${endLabel}. Total eventos: ${totalEvents}.`,
  };
}

function renderTestHelloLegacy(vars: { name?: string }): TemplateResult {
  const name = vars.name ?? "TimeNow user";
  return {
    subject: "Test de correo TimeNow",
    html: `
      <p>Hola ${name},</p>
      <p>Este es un correo de prueba enviado desde el entorno de TimeNow.</p>
    `,
    text: `Hola ${name}, este es un correo de prueba de TimeNow.`,
  };
}
