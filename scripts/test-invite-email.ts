/**
 * Script para probar el envío del email de invitación
 *
 * Uso: npx tsx scripts/test-invite-email.ts tu-email@ejemplo.com
 */

import { sendAuthInviteEmail } from "../src/lib/email/email-service";

// Usa la variable de entorno, con fallback a localhost
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function main() {
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error("❌ Uso: npx tsx scripts/test-invite-email.ts tu-email@ejemplo.com");
    process.exit(1);
  }

  const appUrl = getAppUrl();
  console.log(`\n📧 Enviando email de prueba a: ${testEmail}`);
  console.log(`🔗 URL base: ${appUrl}\n`);

  let exitCode = 0;

  try {
    const result = await sendAuthInviteEmail({
      to: {
        email: testEmail,
        name: "Usuario de Prueba",
      },
      inviteLink: `${appUrl}/auth/accept-invite?token=test-token-123`,
      companyName: "Acme Corp",
      inviterName: "RRHH",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 horas
    });

    if (result.success) {
      console.log("✅ Email enviado correctamente!");
      console.log(`   ID: ${result.id}`);
    } else {
      console.error("❌ Error al enviar:", result.error);
      exitCode = 1;
    }
  } catch (error) {
    console.error("❌ Error:", error);
    exitCode = 1;
  }

  process.exit(exitCode);
}

main();
