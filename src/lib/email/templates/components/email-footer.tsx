import * as React from "react";

import { Section, Text } from "@react-email/components";

import { EMAIL_STYLES, EMAIL_DEFAULTS } from "../shared/constants";

interface EmailFooterProps {
  productName?: string;
  showIgnoreNote?: boolean;
}

export function EmailFooter({ productName = EMAIL_DEFAULTS.productName, showIgnoreNote = true }: EmailFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <Section style={EMAIL_STYLES.footer}>
      {showIgnoreNote && (
        <Text style={EMAIL_STYLES.footerText}>Si no esperabas este correo, puedes ignorarlo con tranquilidad.</Text>
      )}
      <Text style={EMAIL_STYLES.footerText}>
        © {currentYear} {productName}. Todos los derechos reservados.
      </Text>
    </Section>
  );
}
