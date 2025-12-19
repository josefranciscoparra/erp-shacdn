import * as React from "react";

import { Text, Img } from "@react-email/components";

import { EmailButton } from "../components/email-button";
import { EmailCard } from "../components/email-card";
import { EmailFooter } from "../components/email-footer";
import { EmailHelpSection } from "../components/email-help-section";
import { EmailLayout } from "../components/email-layout";
import { EMAIL_STYLES, EMAIL_DEFAULTS } from "../shared/constants";
import { LOGO_URL } from "../shared/logo";

export interface ResetPasswordEmailProps {
  recipientName?: string;
  resetUrl: string;
  expiresAt?: Date | string;
  productName?: string;
  supportEmail?: string;
}

export function ResetPasswordEmail({
  recipientName,
  resetUrl,
  expiresAt,
  productName = EMAIL_DEFAULTS.productName,
  supportEmail = EMAIL_DEFAULTS.supportEmail,
}: ResetPasswordEmailProps) {
  const previewText = `Restablece tu contraseña en ${productName}.`;

  // Formatear fecha de expiración si existe
  const formattedExpiration = expiresAt
    ? new Date(expiresAt).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <EmailLayout previewText={previewText}>
      <EmailCard>
        {/* Logo dentro de la card */}
        <Img src={LOGO_URL} alt={productName} width="140" height="auto" style={styles.logo} />

        <Text style={EMAIL_STYLES.heading}>{recipientName ? `Hola ${recipientName},` : "Hola,"}</Text>

        <Text style={EMAIL_STYLES.text}>
          Hemos recibido una solicitud para restablecer tu contraseña en <strong>{productName}</strong>.
        </Text>

        <Text style={EMAIL_STYLES.text}>Haz clic en el botón de abajo para crear una nueva contraseña:</Text>

        <EmailButton href={resetUrl} label="Restablecer contraseña" />

        <Text style={styles.expirationText}>
          {formattedExpiration
            ? `Este enlace expira el ${formattedExpiration}.`
            : "Este enlace es válido durante 2 horas."}
        </Text>

        <Text style={styles.securityNote}>
          Si no has solicitado restablecer tu contraseña, puedes ignorar este correo. Tu contraseña actual seguirá
          siendo válida.
        </Text>

        <EmailHelpSection supportEmail={supportEmail} />
      </EmailCard>

      <EmailFooter productName={productName} showIgnoreNote={false} />
    </EmailLayout>
  );
}

const styles = {
  logo: {
    margin: "0 auto 24px",
    display: "block",
  },
  expirationText: {
    margin: "16px 0 0",
    fontSize: "12px",
    lineHeight: "18px",
    color: "#6B7280",
    textAlign: "center" as const,
  },
  securityNote: {
    margin: "16px 0 0",
    fontSize: "12px",
    lineHeight: "18px",
    color: "#6B7280",
    fontStyle: "italic" as const,
  },
};

// Default export para react-email preview
export default ResetPasswordEmail;
