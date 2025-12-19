import * as React from "react";

import { Section, Img } from "@react-email/components";

import { EMAIL_COLORS, EMAIL_DEFAULTS } from "../shared/constants";
import { LOGO_URL } from "../shared/logo";

interface EmailHeaderProps {
  productName?: string;
  logoUrl?: string;
}

export function EmailHeader({ productName = EMAIL_DEFAULTS.productName, logoUrl }: EmailHeaderProps) {
  // Usa el logo proporcionado o el logo de producción
  const finalLogoUrl = logoUrl ?? LOGO_URL;

  return (
    <Section style={styles.topBar}>
      <Img src={finalLogoUrl} alt={productName} width="140" height="auto" style={styles.logo} />
    </Section>
  );
}

const styles = {
  topBar: {
    padding: "16px 6px",
  },
  logo: {
    margin: "0 auto",
    display: "block",
  },
  // Fallback por si la imagen no carga
  brand: {
    margin: 0,
    fontSize: "16px",
    letterSpacing: "0.2px",
    color: EMAIL_COLORS.textPrimary,
    fontWeight: 700,
  },
};
