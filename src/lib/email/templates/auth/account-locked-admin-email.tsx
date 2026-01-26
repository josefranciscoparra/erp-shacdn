import * as React from "react";

import { Img, Text } from "@react-email/components";

import { EmailCard } from "../components/email-card";
import { EmailFooter } from "../components/email-footer";
import { EmailHelpSection } from "../components/email-help-section";
import { EmailLayout } from "../components/email-layout";
import { EMAIL_COLORS, EMAIL_DEFAULTS, EMAIL_STYLES } from "../shared/constants";
import { LOGO_URL } from "../shared/logo";

export interface AccountLockedAdminEmailProps {
  recipientName?: string;
  lockedUserName?: string;
  lockedUserEmail: string;
  attempts?: number;
  lockedUntil?: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  productName?: string;
  supportEmail?: string;
}

export function AccountLockedAdminEmail({
  recipientName,
  lockedUserName,
  lockedUserEmail,
  attempts,
  lockedUntil,
  ipAddress,
  userAgent,
  productName = EMAIL_DEFAULTS.productName,
  supportEmail = EMAIL_DEFAULTS.supportEmail,
}: AccountLockedAdminEmailProps) {
  const previewText = `Alerta de seguridad: cuenta bloqueada en ${productName}.`;
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
          Se ha bloqueado una cuenta por múltiples intentos fallidos en <strong>{productName}</strong>.
        </Text>

        <Text style={styles.metaText}>
          👤 Usuario: <strong>{lockedUserName ?? lockedUserEmail}</strong>
          <br />
          📧 Email: <strong>{lockedUserEmail}</strong>
        </Text>

        {typeof attempts === "number" && (
          <Text style={styles.metaText}>
            🔐 Intentos fallidos registrados: <strong>{attempts}</strong>
          </Text>
        )}

        {formattedUntil && (
          <Text style={styles.metaText}>
            ⏳ Bloqueo activo hasta: <strong>{formattedUntil}</strong>
          </Text>
        )}

        {(ipAddress ?? userAgent) && (
          <Text style={styles.metaText}>
            🌐 IP: <strong>{ipAddress ?? "No disponible"}</strong>
            <br />
            🖥️ Agente: <strong>{userAgent ?? "No disponible"}</strong>
          </Text>
        )}

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
};

export default AccountLockedAdminEmail;
