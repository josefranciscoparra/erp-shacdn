import * as React from "react";

import { Section, Text } from "@react-email/components";

import { EMAIL_COLORS } from "../shared/constants";

interface EmailIconListProps {
  items: string[];
}

export function EmailIconList({ items }: EmailIconListProps) {
  return (
    <Section style={styles.listContainer}>
      {items.map((item, index) => (
        <Text key={index} style={styles.listItem}>
          {item}
        </Text>
      ))}
    </Section>
  );
}

const styles = {
  listContainer: {
    marginTop: "10px",
    paddingLeft: "2px",
  },
  listItem: {
    margin: "0 0 8px",
    fontSize: "14px",
    lineHeight: "20px",
    color: EMAIL_COLORS.textPrimary,
  },
};
