import { Resend } from "resend";

import { emailConfig } from "@/config/email";

import type { BaseEmailPayload, EmailSendResult } from "../types";

import type { EmailProvider } from "./types";

export class ResendEmailProvider implements EmailProvider {
  private client: Resend;

  constructor() {
    if (!emailConfig.resendApiKey) {
      throw new Error("[ResendEmailProvider] RESEND_API_KEY no configurada");
    }
    this.client = new Resend(emailConfig.resendApiKey);
  }

  async sendRawEmail(payload: BaseEmailPayload): Promise<EmailSendResult> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    if (!emailConfig.from) {
      return {
        success: false,
        error: "[ResendEmailProvider] EMAIL_FROM no configurado",
        provider: "resend",
      };
    }

    try {
      const result = await this.client.emails.send({
        from: emailConfig.from,
        to: recipients.map((r) => r.email),
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      // Resend devuelve { data: { id }, error: null } o { data: null, error: { ... } }
      if (result.error) {
        return {
          success: false,
          error: result.error.message,
          provider: "resend",
        };
      }

      return {
        success: true,
        id: result.data.id,
        provider: "resend",
      };
    } catch (error: unknown) {
      console.error("[ResendEmailProvider] Error enviando email:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: message,
        provider: "resend",
      };
    }
  }
}
