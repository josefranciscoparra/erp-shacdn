/**
 * Configuración del sistema de email
 */

const EMAIL_FROM = process.env.EMAIL_FROM;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!EMAIL_FROM) {
  console.warn("[EmailConfig] EMAIL_FROM no está definido");
}

if (!RESEND_API_KEY) {
  console.warn("[EmailConfig] RESEND_API_KEY no está definido");
}

export const emailConfig = {
  from: EMAIL_FROM,
  resendApiKey: RESEND_API_KEY,
};
