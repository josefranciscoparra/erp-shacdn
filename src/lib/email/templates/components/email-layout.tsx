import * as React from "react";

import { Html, Head, Body, Container, Preview } from "@react-email/components";

import { EMAIL_STYLES } from "../shared/constants";

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={EMAIL_STYLES.body}>
        <Container style={EMAIL_STYLES.container}>{children}</Container>
      </Body>
    </Html>
  );
}
