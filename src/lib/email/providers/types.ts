/**
 * Interface del provider de email
 */

import type { BaseEmailPayload, EmailSendResult } from "../types";

export interface EmailProvider {
  sendRawEmail(payload: BaseEmailPayload): Promise<EmailSendResult>;
}
