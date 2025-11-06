import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Migra el feature flag de chat del JSON features al campo chatEnabled
 */
async function migrateChatFeature() {
  try {
    console.log("🔄 Migrando feature flag de chat...\n");

    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, chatEnabled: true, features: true },
    });

    console.log(`Encontradas ${orgs.length} organizaciones\n`);

    let migratedCount = 0;

    for (const org of orgs) {
      const features = (org.features as Record<string, unknown>) || {};
      const hasChatInFeatures = features.chat === true;

      console.log(`[${org.name}]`);
      console.log(`  - chatEnabled (campo): ${org.chatEnabled}`);
      console.log(`  - features.chat (JSON): ${hasChatInFeatures}`);

      // Si el JSON tiene chat=true pero el campo es false, migrar
      if (hasChatInFeatures && !org.chatEnabled) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { chatEnabled: true },
        });

        console.log(`  ✅ Migrado: chatEnabled = true`);
        migratedCount++;
      } else if (org.chatEnabled) {
        console.log(`  ℹ️  Ya está habilitado en el campo chatEnabled`);
      } else {
        console.log(`  ➖ Chat no habilitado`);
      }

      console.log("");
    }

    console.log(`\n✅ Migración completada`);
    console.log(`   - Total organizaciones: ${orgs.length}`);
    console.log(`   - Migradas: ${migratedCount}`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateChatFeature();
