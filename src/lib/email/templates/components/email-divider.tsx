import * as React from "react";

import { Hr } from "@react-email/components";

import { EMAIL_STYLES } from "../shared/constants";

export function EmailDivider() {
  return <Hr style={EMAIL_STYLES.divider} />;
}
