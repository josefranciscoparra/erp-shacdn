/**
 * Factory del provider de email
 */

import { ResendEmailProvider } from "./providers/resend-provider";
import type { EmailProvider } from "./providers/types";

let providerInstance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  providerInstance ??= new ResendEmailProvider();
  return providerInstance;
}
