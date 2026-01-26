import * as React from "react";

import { Img, Link, Text } from "@react-email/components";

import { EmailCard } from "../components/email-card";
import { EmailFooter } from "../components/email-footer";
import { EmailHelpSection } from "../components/email-help-section";
import { EmailLayout } from "../components/email-layout";
import { EMAIL_COLORS, EMAIL_DEFAULTS, EMAIL_STYLES } from "../shared/constants";
import { LOGO_URL } from "../shared/logo";

export interface AccountLockedEmailProps {
  recipientName?: string;
  lockedUntil?: Date | string;
  attempts?: number;
  productName?: string;
  supportEmail?: string;
}

export function AccountLockedEmail({
  recipientName,
  lockedUntil,
  attempts,
  productName = EMAIL_DEFAULTS.productName,
  supportEmail = EMAIL_DEFAULTS.supportEmail,
}: AccountLockedEmailProps) {
  const previewText = `Hemos bloqueado temporalmente tu cuenta en ${productName}.`;
  const formattedUntil = lockedUntil
    ? new Date(lockedUntil).toLocaleString("es-ES", {
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
        <Img src={LOGO_URL} alt={productName} width="140" height="auto" style={styles.logo} />

        <Text style={EMAIL_STYLES.heading}>{recipientName ? `Hola ${recipientName},` : "Hola,"}</Text>

        <Text style={EMAIL_STYLES.text}>
          Hemos detectado varios intentos fallidos de inicio de sesión y, por seguridad, hemos bloqueado tu cuenta de{" "}
          <strong>{productName}</strong> temporalmente.
        </Text>

        {typeof attempts === "number" && (
          <Text style={styles.metaText}>
            🔐 Intentos fallidos registrados: <strong>{attempts}</strong>
          </Text>
        )}

        {formattedUntil && (
          <Text style={styles.dateText}>
            ⏳ Bloqueo activo hasta: <strong>{formattedUntil}</strong>
          </Text>
        )}

        <Text style={styles.warningSection}>
          <strong>⚠️ ¿No has sido tú?</strong>
        </Text>

        <Text style={EMAIL_STYLES.text}>
          Si no reconoces estos intentos, te recomendamos contactar con tu responsable de RRHH o escribirnos a{" "}
          <Link href={`mailto:${supportEmail}`} style={styles.link}>
            {supportEmail}
          </Link>
          .
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
  metaText: {
    margin: "0 0 16px",
    fontSize: "14px",
    lineHeight: "22px",
    color: EMAIL_COLORS.textSecondary,
    backgroundColor: "#F3F4F6",
    padding: "12px 16px",
    borderRadius: "8px",
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
  link: {
    color: EMAIL_COLORS.link,
    textDecoration: "underline",
  },
};

export default AccountLockedEmail;
