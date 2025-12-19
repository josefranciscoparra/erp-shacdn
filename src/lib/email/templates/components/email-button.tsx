import * as React from "react";

import { Button, Text, Link, Section } from "@react-email/components";

import { EMAIL_STYLES } from "../shared/constants";

interface EmailButtonProps {
  href: string;
  label: string;
}

export function EmailButton({ href, label }: EmailButtonProps) {
  return (
    <>
      <Section style={styles.buttonContainer}>
        <Button href={href} style={EMAIL_STYLES.button}>
          {label}
        </Button>
      </Section>

      <Text style={EMAIL_STYLES.textSmall}>
        Si el botón no funciona, copia y pega este enlace en tu navegador:
        <br />
        <Link href={href} style={EMAIL_STYLES.link}>
          {href}
        </Link>
      </Text>
    </>
  );
}

const styles = {
  buttonContainer: {
    textAlign: "center" as const,
    marginTop: "24px",
  },
};
