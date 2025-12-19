import * as React from "react";

import { Section } from "@react-email/components";

import { EMAIL_STYLES } from "../shared/constants";

interface EmailCardProps {
  children: React.ReactNode;
}

export function EmailCard({ children }: EmailCardProps) {
  return <Section style={EMAIL_STYLES.card}>{children}</Section>;
}
