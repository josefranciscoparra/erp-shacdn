import * as React from "react";

import { Text, Link, Img } from "@react-email/components";

import { EmailCard } from "../components/email-card";
import { EmailFooter } from "../components/email-footer";
import { EmailHelpSection } from "../components/email-help-section";
import { EmailLayout } from "../components/email-layout";
import { EMAIL_STYLES, EMAIL_DEFAULTS, EMAIL_COLORS } from "../shared/constants";
import { LOGO_URL } from "../shared/logo";

export interface ChangeNotificationEmailProps {
  recipientName?: string;
  changedAt?: Date | string;
  productName?: string;
  supportEmail?: string;
}

export function ChangeNotificationEmail({
  recipientName,
  changedAt,
  productName = EMAIL_DEFAULTS.productName,
  supportEmail = EMAIL_DEFAULTS.supportEmail,
}: ChangeNotificationEmailProps) {
  const previewText = `Tu contraseña de ${productName} ha sido cambiada.`;

  // Formatear fecha de cambio si existe
  const formattedDate = changedAt
    ? new Date(changedAt).toLocaleString("es-ES", {
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
          Te informamos de que tu contraseña en <strong>{productName}</strong> ha sido actualizada correctamente.
        </Text>

        {formattedDate && (
          <Text style={styles.dateText}>
            🕐 Fecha del cambio: <strong>{formattedDate}</strong>
          </Text>
        )}

        <Text style={styles.warningSection}>
          <strong>⚠️ ¿No has sido tú?</strong>
        </Text>

        <Text style={EMAIL_STYLES.text}>Si no has realizado este cambio, es importante que actúes de inmediato:</Text>

        <Text style={styles.stepsList}>
          1. Contacta con tu responsable de Recursos Humanos
          <br />
          2. Escríbenos a{" "}
          <Link href={`mailto:${supportEmail}`} style={styles.link}>
            {supportEmail}
          </Link>
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
  dateText: {
    margin: "0 0 16px",
    fontSize: "14px",
    lineHeight: "22px",
    color: EMAIL_COLORS.textSecondary,
    backgroundColor: "#F3F4F6",
    padding: "12px 16px",
    borderRadius: "8px",
  },
  warningSection: {
    margin: "20px 0 8px",
    fontSize: "14px",
    lineHeight: "22px",
    color: EMAIL_COLORS.textPrimary,
  },
  stepsList: {
    margin: "0 0 12px",
    fontSize: "14px",
    lineHeight: "24px",
    color: EMAIL_COLORS.textSecondary,
    paddingLeft: "8px",
  },
  link: {
    color: EMAIL_COLORS.link,
    textDecoration: "underline",
  },
};

// Default export para react-email preview
export default ChangeNotificationEmail;
