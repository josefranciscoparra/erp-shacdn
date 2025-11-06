import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function enableChatFeature() {
  try {
    // Obtener la organización
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, features: true },
    });

    console.log(`Encontradas ${orgs.length} organizaciones\n`);

    for (const org of orgs) {
      const features = (org.features as Record<string, unknown>) || {};

      console.log(`[${org.name}]`);
      console.log(`  - ID: ${org.id}`);
      console.log(`  - Features actuales:`, features);

      // Habilitar chat
      const updatedFeatures = { ...features, chat: true };

      await prisma.organization.update({
        where: { id: org.id },
        data: { features: updatedFeatures },
      });

      console.log(`  - Features actualizadas:`, updatedFeatures);
      console.log(`  ✅ Chat habilitado\n`);
    }

    console.log("✅ Proceso completado");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

enableChatFeature();
