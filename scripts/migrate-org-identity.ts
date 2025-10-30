/**
 * Script de migración de datos para organizaciones existentes
 *
 * Este script inicializa los campos de identidad organizacional para organizaciones ya creadas:
 * - Genera prefijos automáticos desde el nombre de la organización
 * - Inicializa el contador de empleados según el número de empleados existentes
 * - No modifica organizaciones que ya tienen prefijo configurado
 *
 * Uso: npx tsx scripts/migrate-org-identity.ts
 */

import { PrismaClient } from "@prisma/client";

import { generateOrganizationPrefix } from "../src/lib/employee-numbering";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando migración de identidad organizacional...\n");

  try {
    // Obtener todas las organizaciones
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    console.log(`📊 Se encontraron ${organizations.length} organizaciones.\n`);

    let updated = 0;
    let skipped = 0;

    for (const org of organizations) {
      // Si ya tiene prefijo, skip
      if (org.employeeNumberPrefix) {
        console.log(`⏭️  [${org.name}] Ya tiene prefijo: ${org.employeeNumberPrefix} - SKIP`);
        skipped++;
        continue;
      }

      // Generar prefijo desde el nombre
      const prefix = generateOrganizationPrefix(org.name);

      // Contar empleados existentes para inicializar el contador
      const employeeCount = org._count.employees;

      // Actualizar organización
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          employeeNumberPrefix: prefix,
          employeeNumberCounter: employeeCount,
          // allowedEmailDomains ya tiene default [] en el schema
        },
      });

      console.log(
        `✅ [${org.name}] Actualizada:\n` +
          `   Prefijo: ${prefix}\n` +
          `   Contador inicial: ${employeeCount} (empleados existentes)\n`,
      );

      updated++;
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✨ Migración completada:`);
    console.log(`   - Organizaciones actualizadas: ${updated}`);
    console.log(`   - Organizaciones omitidas: ${skipped}`);
    console.log(`   - Total: ${organizations.length}`);
    console.log("=".repeat(60) + "\n");

    console.log("📝 Próximos pasos:");
    console.log("   1. Verifica los prefijos generados en Prisma Studio: npx prisma studio");
    console.log("   2. Si algún prefijo no es correcto, edítalo desde la UI de organizaciones");
    console.log("   3. Los nuevos empleados se numerarán automáticamente desde el contador\n");
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
