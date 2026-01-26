/**
 * Sistema central de renderizado de emails
 * Genera HTML y texto plano desde React Email components
 */

import * as React from "react";

import { render } from "@react-email/render";

import { AccountLockedAdminEmail } from "../auth/account-locked-admin-email";
import { AccountLockedEmail } from "../auth/account-locked-email";
import { ChangeNotificationEmail } from "../auth/change-notification-email";
import { InviteEmail } from "../auth/invite-email";
import { ResetPasswordEmail } from "../auth/reset-password-email";
import { SecurityDailySummaryEmail } from "../security/security-daily-summary-email";

import { EMAIL_DEFAULTS } from "./constants";
import type { EmailTemplateId, TemplatePropsMap } from "./email-props";

// Resultado del render
export interface RenderEmailResult {
  subject: string;
  html: string;
  text: string;
}

// Subjects centralizados por template ID
const EMAIL_SUBJECTS: Record<EmailTemplateId, (props: unknown) => string> = {
  AUTH_INVITE: () => "Te han invitado a TimeNow 👋",
  AUTH_RESET_PASSWORD: () => "Restablece tu contraseña de TimeNow",
  AUTH_CHANGE_NOTIFICATION: () => "Tu contraseña de TimeNow se ha cambiado",
  AUTH_ACCOUNT_LOCKED: () => "Tu cuenta de TimeNow se ha bloqueado temporalmente",
  AUTH_ACCOUNT_LOCKED_ADMIN: () => "Alerta de seguridad: cuenta bloqueada",
  SECURITY_DAILY_SUMMARY: () => "Resumen diario de seguridad",
  TEST_HELLO: () => "Test de correo TimeNow",
};

// Fallback para TEST_HELLO (mantener compatibilidad)
function renderTestHelloHtml(props: { name?: string }): string {
  const name = props.name ?? "TimeNow user";
  return `
    <p>Hola ${name},</p>
    <p>Este es un correo de prueba enviado desde el entorno de TimeNow.</p>
  `;
}

function renderTestHelloText(props: { name?: string }): string {
  const name = props.name ?? "TimeNow user";
  return `Hola ${name}, este es un correo de prueba de TimeNow.`;
}

/**
 * Renderiza un template de email a HTML y texto plano
 */
export async function renderEmailTemplate<T extends EmailTemplateId>(
  templateId: T,
  props: TemplatePropsMap[T],
): Promise<RenderEmailResult> {
  const subject = EMAIL_SUBJECTS[templateId](props);

  let html: string;
  let text: string;

  switch (templateId) {
    case "AUTH_INVITE": {
      const typedProps = props as TemplatePropsMap["AUTH_INVITE"];
      const element = React.createElement(InviteEmail, typedProps);
      html = await render(element);
      text = generateInviteText(typedProps);
      break;
    }

    case "AUTH_RESET_PASSWORD": {
      const typedProps = props as TemplatePropsMap["AUTH_RESET_PASSWORD"];
      const element = React.createElement(ResetPasswordEmail, typedProps);
      html = await render(element);
      text = generateResetPasswordText(typedProps);
      break;
    }

    case "AUTH_CHANGE_NOTIFICATION": {
      const typedProps = props as TemplatePropsMap["AUTH_CHANGE_NOTIFICATION"];
      const element = React.createElement(ChangeNotificationEmail, typedProps);
      html = await render(element);
      text = generateChangeNotificationText(typedProps);
      break;
    }

    case "AUTH_ACCOUNT_LOCKED": {
      const typedProps = props as TemplatePropsMap["AUTH_ACCOUNT_LOCKED"];
      const element = React.createElement(AccountLockedEmail, typedProps);
      html = await render(element);
      text = generateAccountLockedText(typedProps);
      break;
    }

    case "AUTH_ACCOUNT_LOCKED_ADMIN": {
      const typedProps = props as TemplatePropsMap["AUTH_ACCOUNT_LOCKED_ADMIN"];
      const element = React.createElement(AccountLockedAdminEmail, typedProps);
      html = await render(element);
      text = generateAccountLockedAdminText(typedProps);
      break;
    }

    case "SECURITY_DAILY_SUMMARY": {
      const typedProps = props as TemplatePropsMap["SECURITY_DAILY_SUMMARY"];
      const element = React.createElement(SecurityDailySummaryEmail, typedProps);
      html = await render(element);
      text = generateSecurityDailySummaryText(typedProps);
      break;
    }

    case "TEST_HELLO": {
      const typedProps = props as TemplatePropsMap["TEST_HELLO"];
      html = renderTestHelloHtml(typedProps);
      text = renderTestHelloText(typedProps);
      break;
    }

    default: {
      throw new Error(`Unknown template ID: ${templateId}`);
    }
  }

  return { subject, html, text };
}

// Generadores de texto plano (fallback para clientes sin HTML)
function generateInviteText(props: TemplatePropsMap["AUTH_INVITE"]): string {
  const name = props.recipientName ?? "Hola";
  const productName = props.productName ?? EMAIL_DEFAULTS.productName;
  const company = props.companyName ?? props.inviterName ?? "tu empresa";

  let text = `${name}, ${company} te ha invitado a unirte a ${productName}.\n\n`;
  text += `Completa tu registro y empieza a gestionar tu día a día:\n`;
  text += `- Registro de jornada en segundos\n`;
  text += `- Solicitud y control de vacaciones\n`;
  text += `- Documentos y comunicaciones en un solo sitio\n`;
  text += `- Avisos y notificaciones importantes\n\n`;
  text += `Accede desde: ${props.inviteUrl}\n\n`;

  if (props.expiresAt) {
    const date = new Date(props.expiresAt).toLocaleDateString("es-ES");
    text += `Este enlace expira el ${date}.\n\n`;
  }

  text += `Si no esperabas este correo, puedes ignorarlo.`;
  return text;
}

function generateResetPasswordText(props: TemplatePropsMap["AUTH_RESET_PASSWORD"]): string {
  const name = props.recipientName ?? "Hola";
  const productName = props.productName ?? EMAIL_DEFAULTS.productName;

  let text = `${name}, hemos recibido una solicitud para restablecer tu contraseña en ${productName}.\n\n`;
  text += `Puedes cambiarla desde: ${props.resetUrl}\n\n`;

  if (props.expiresAt) {
    const date = new Date(props.expiresAt).toLocaleString("es-ES");
    text += `Este enlace expira el ${date}.\n\n`;
  } else {
    text += `Este enlace es válido durante 2 horas.\n\n`;
  }

  text += `Si no has solicitado esto, ignora este correo.`;
  return text;
}

function generateChangeNotificationText(props: TemplatePropsMap["AUTH_CHANGE_NOTIFICATION"]): string {
  const name = props.recipientName ?? "Hola";
  const productName = props.productName ?? EMAIL_DEFAULTS.productName;
  const supportEmail = props.supportEmail ?? EMAIL_DEFAULTS.supportEmail;

  let text = `${name}, te informamos de que tu contraseña en ${productName} ha sido actualizada.\n\n`;

  if (props.changedAt) {
    const date = new Date(props.changedAt).toLocaleString("es-ES");
    text += `Fecha del cambio: ${date}\n\n`;
  }

  text += `Si no has sido tú, contacta con tu responsable de Recursos Humanos o escríbenos a ${supportEmail}.`;
  return text;
}

function generateAccountLockedText(props: TemplatePropsMap["AUTH_ACCOUNT_LOCKED"]): string {
  const name = props.recipientName ?? "Hola";
  const productName = props.productName ?? EMAIL_DEFAULTS.productName;
  const supportEmail = props.supportEmail ?? EMAIL_DEFAULTS.supportEmail;

  let text = `${name}, hemos bloqueado temporalmente tu cuenta en ${productName} por varios intentos fallidos.\n\n`;

  if (typeof props.attempts === "number") {
    text += `Intentos fallidos registrados: ${props.attempts}\n`;
  }

  if (props.lockedUntil) {
    const date = new Date(props.lockedUntil).toLocaleString("es-ES");
    text += `Bloqueo activo hasta: ${date}\n\n`;
  } else {
    text += `El bloqueo es temporal y se levantará automáticamente.\n\n`;
  }

  text += `Si no has sido tú, contacta con tu responsable de Recursos Humanos o escríbenos a ${supportEmail}.`;
  return text;
}

function generateAccountLockedAdminText(props: TemplatePropsMap["AUTH_ACCOUNT_LOCKED_ADMIN"]): string {
  const name = props.recipientName ?? "Hola";
  const productName = props.productName ?? EMAIL_DEFAULTS.productName;
  const supportEmail = props.supportEmail ?? EMAIL_DEFAULTS.supportEmail;
  const lockedUserLabel = props.lockedUserName ?? props.lockedUserEmail;

  let text = `${name}, se ha bloqueado una cuenta por intentos fallidos en ${productName}.\n\n`;
  text += `Usuario: ${lockedUserLabel}\n`;
  text += `Email: ${props.lockedUserEmail}\n`;

  if (typeof props.attempts === "number") {
    text += `Intentos fallidos: ${props.attempts}\n`;
  }

  if (props.lockedUntil) {
    const date = new Date(props.lockedUntil).toLocaleString("es-ES");
    text += `Bloqueo activo hasta: ${date}\n`;
  }

  if (props.ipAddress) {
    text += `IP: ${props.ipAddress}\n`;
  }

  if (props.userAgent) {
    text += `Agente: ${props.userAgent}\n`;
  }

  text += `\nSi necesitas ayuda, contacta con ${supportEmail}.`;
  return text;
}

function generateSecurityDailySummaryText(props: TemplatePropsMap["SECURITY_DAILY_SUMMARY"]): string {
  const name = props.recipientName ?? "Hola";
  const productName = props.productName ?? EMAIL_DEFAULTS.productName;
  const startLabel = new Date(props.rangeStart).toLocaleString("es-ES");
  const endLabel = new Date(props.rangeEnd).toLocaleString("es-ES");

  let text = `${name}, aquí tienes el resumen diario de seguridad de ${productName}.\n\n`;
  text += `Periodo: ${startLabel} → ${endLabel}\n\n`;
  text += `Resumen global:\n`;
  text += `- Total eventos: ${props.totalEvents}\n`;
  text += `- Login fallidos: ${props.totalLoginFailed}\n`;
  text += `- Cuentas bloqueadas: ${props.totalAccountLocked}\n`;
  text += `- Cuentas desbloqueadas: ${props.totalAccountUnlocked}\n\n`;

  if (props.orgSummaries.length === 0) {
    text += `No hubo eventos en este periodo.\n`;
    return text;
  }

  text += `Por organización:\n`;
  for (const summary of props.orgSummaries) {
    text += `- ${summary.orgName}: total ${summary.total}, login fallidos ${summary.loginFailed}, bloqueadas ${summary.accountLocked}, desbloqueadas ${summary.accountUnlocked}\n`;
  }

  return text;
}
