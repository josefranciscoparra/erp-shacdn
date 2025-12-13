"use server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { sendTestEmail } from "@/lib/email/email-service";

const sendTestEmailSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().optional(),
});

/**
 * Envía un correo de prueba a un destinatario específico
 * Solo disponible para SUPER_ADMIN
 */
export async function sendTestEmailToAddress(
  email: string,
  name?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "No hay usuario autenticado" };
  }

  // Solo permitir a SUPER_ADMIN
  if (session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "No tienes permisos para esta acción" };
  }

  // Validar email
  const validation = sendTestEmailSchema.safeParse({ email, name });
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const result = await sendTestEmail({
    to: {
      email: validation.data.email,
      name: validation.data.name,
    },
    userId: session.user.id,
    orgId: session.user.orgId,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Error enviando correo de prueba",
    };
  }

  return { success: true };
}
