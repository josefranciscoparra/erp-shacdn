import * as React from "react";

import { Img, Text } from "@react-email/components";

import { EmailCard } from "../components/email-card";
import { EmailFooter } from "../components/email-footer";
import { EmailLayout } from "../components/email-layout";
import { EMAIL_COLORS, EMAIL_DEFAULTS, EMAIL_STYLES } from "../shared/constants";
import { LOGO_URL } from "../shared/logo";

export type SecurityDailySummaryOrg = {
  orgName: string;
  loginFailed: number;
  accountLocked: number;
  accountUnlocked: number;
  total: number;
};

export interface SecurityDailySummaryEmailProps {
  recipientName?: string;
  rangeStart: Date | string;
  rangeEnd: Date | string;
  totalEvents: number;
  totalLoginFailed: number;
  totalAccountLocked: number;
  totalAccountUnlocked: number;
  orgSummaries: SecurityDailySummaryOrg[];
  productName?: string;
}

export function SecurityDailySummaryEmail({
  recipientName,
  rangeStart,
  rangeEnd,
  totalEvents,
  totalLoginFailed,
  totalAccountLocked,
  totalAccountUnlocked,
  orgSummaries,
  productName = EMAIL_DEFAULTS.productName,
}: SecurityDailySummaryEmailProps) {
  const previewText = `Resumen diario de seguridad (${productName}).`;
  const startLabel = new Date(rangeStart).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = new Date(rangeEnd).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <EmailLayout previewText={previewText}>
      <EmailCard>
        <Img src={LOGO_URL} alt={productName} width="140" height="auto" style={styles.logo} />

        <Text style={EMAIL_STYLES.heading}>{recipientName ? `Hola ${recipientName},` : "Hola,"}</Text>

        <Text style={EMAIL_STYLES.text}>
          Este es el resumen diario de seguridad para <strong>{productName}</strong>.
        </Text>

        <Text style={styles.metaText}>
          📅 Periodo: <strong>{startLabel}</strong> → <strong>{endLabel}</strong>
        </Text>

        <Text style={styles.sectionTitle}>Resumen global</Text>
        <Text style={styles.metaText}>
          Total eventos: <strong>{totalEvents}</strong>
          <br />
          Login fallidos: <strong>{totalLoginFailed}</strong>
          <br />
          Cuentas bloqueadas: <strong>{totalAccountLocked}</strong>
          <br />
          Cuentas desbloqueadas: <strong>{totalAccountUnlocked}</strong>
        </Text>

        <Text style={styles.sectionTitle}>Por organización</Text>
        {orgSummaries.length === 0 ? (
          <Text style={EMAIL_STYLES.text}>No hubo eventos en este periodo.</Text>
        ) : (
          orgSummaries.map((org) => (
            <Text key={org.orgName} style={styles.orgCard}>
              <strong>{org.orgName}</strong>
              <br />
              Total: {org.total}
              <br />
              Login fallidos: {org.loginFailed}
              <br />
              Cuentas bloqueadas: {org.accountLocked}
              <br />
              Cuentas desbloqueadas: {org.accountUnlocked}
            </Text>
          ))
        )}
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
  sectionTitle: {
    margin: "16px 0 8px",
    fontSize: "14px",
    lineHeight: "22px",
    color: EMAIL_COLORS.textPrimary,
    fontWeight: 600,
  },
  orgCard: {
    margin: "0 0 12px",
    fontSize: "14px",
    lineHeight: "22px",
    color: EMAIL_COLORS.textSecondary,
    backgroundColor: "#F9FAFB",
    padding: "12px 16px",
    borderRadius: "8px",
  },
};

export default SecurityDailySummaryEmail;
