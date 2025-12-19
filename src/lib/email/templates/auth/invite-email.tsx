import * as React from "react";

import { Text, Img } from "@react-email/components";

import { EmailButton } from "../components/email-button";
import { EmailCard } from "../components/email-card";
import { EmailFooter } from "../components/email-footer";
import { EmailHelpSection } from "../components/email-help-section";
import { EmailIconList } from "../components/email-icon-list";
import { EmailLayout } from "../components/email-layout";
import { EMAIL_STYLES, EMAIL_DEFAULTS } from "../shared/constants";
import { LOGO_URL } from "../shared/logo";

export interface InviteEmailProps {
  recipientName?: string;
  companyName?: string;
  inviterName?: string;
  inviteUrl: string;
  expiresAt?: Date | string;
  productName?: string;
  supportEmail?: string;
}

export function InviteEmail({
  recipientName,
  companyName,
  inviterName,
  inviteUrl,
  expiresAt,
  productName = EMAIL_DEFAULTS.productName,
  supportEmail = EMAIL_DEFAULTS.supportEmail,
}: InviteEmailProps) {
  const previewText = `Te han invitado a ${productName}. Completa tu registro en 1 minuto.`;

  // Formatear fecha de expiración si existe
  const formattedExpiration = expiresAt
    ? new Date(expiresAt).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Determinar el texto de invitación
  const invitationText = companyName
    ? `${companyName} te ha invitado a unirte a ${productName}.`
    : `Has sido invitado/a por ${inviterName ?? "tu empresa"} para unirte a ${productName}.`;

  const featureItems = [
    "⏱️ Registro de jornada en segundos",
    "🌴 Solicitud y control de vacaciones",
    "📄 Documentos y comunicaciones en un solo sitio",
    "🔔 Avisos y notificaciones importantes",
  ];

  return (
    <EmailLayout previewText={previewText}>
      <EmailCard>
        {/* Logo dentro de la card */}
        <Img src={LOGO_URL} alt={productName} width="140" height="auto" style={styles.logo} />

        <Text style={EMAIL_STYLES.heading}>{recipientName ? `Hola ${recipientName},` : "Hola,"}</Text>

        <Text style={EMAIL_STYLES.text}>
          <strong>{invitationText}</strong>
        </Text>

        <Text style={EMAIL_STYLES.text}>
          Completa tu registro y empieza a gestionar tu día a día de forma sencilla:
        </Text>

        <EmailIconList items={featureItems} />

        <EmailButton href={inviteUrl} label="Crear mi cuenta" />

        {formattedExpiration && <Text style={styles.expirationText}>Este enlace expira el {formattedExpiration}.</Text>}

        <EmailHelpSection supportEmail={supportEmail} />
      </EmailCard>

      <EmailFooter productName={productName} showIgnoreNote={true} />
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
};

// Default export para react-email preview
export default InviteEmail;
