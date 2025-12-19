import * as React from "react";

import { Section, Text, Link } from "@react-email/components";

import { EMAIL_COLORS, EMAIL_DEFAULTS } from "../shared/constants";

import { EmailDivider } from "./email-divider";

interface EmailHelpSectionProps {
  supportEmail?: string;
}

export function EmailHelpSection({ supportEmail = EMAIL_DEFAULTS.supportEmail }: EmailHelpSectionProps) {
  return (
    <>
      <EmailDivider />
      <Section style={styles.helpSection}>
        <Text style={styles.helpTitle}>¿Necesitas ayuda?</Text>
        <Text style={styles.helpText}>
          Escríbenos a{" "}
          <Link href={`mailto:${supportEmail}`} style={styles.link}>
            {supportEmail}
          </Link>{" "}
          y te echamos una mano encantados.
        </Text>
      </Section>
    </>
  );
}

const styles = {
  helpSection: {
    padding: "0",
  },
  helpTitle: {
    margin: "0 0 8px",
    fontSize: "13px",
    lineHeight: "18px",
    color: EMAIL_COLORS.textPrimary,
    fontWeight: 700,
  },
  helpText: {
    margin: 0,
    fontSize: "12px",
    lineHeight: "18px",
    color: EMAIL_COLORS.muted,
  },
  link: {
    color: EMAIL_COLORS.link,
    textDecoration: "underline",
  },
};
