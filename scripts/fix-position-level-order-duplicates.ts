#!/usr/bin/env tsx

/**
 * Script para corregir valores duplicados en el campo `order` de position_levels
 * antes de aplicar la restricción única @@unique([orgId, order])
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Buscando position levels duplicados por organización...\n");

  // Obtener todas las organizaciones
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  for (const org of organizations) {
    console.log(`\n📋 Procesando organización: ${org.name} (${org.id})`);

    // Obtener todos los niveles de esta organización ordenados por order actual
    const levels = await prisma.positionLevel.findMany({
      where: { orgId: org.id },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, order: true },
    });

    if (levels.length === 0) {
      console.log("  ✓ No hay niveles en esta organización");
      continue;
    }

    console.log(`  📊 Encontrados ${levels.length} niveles`);

    // Detectar duplicados
    const orderCounts = new Map<number, number>();
    for (const level of levels) {
      orderCounts.set(level.order, (orderCounts.get(level.order) ?? 0) + 1);
    }

    const hasDuplicates = Array.from(orderCounts.values()).some((count) => count > 1);

    if (!hasDuplicates) {
      console.log("  ✅ No hay duplicados en esta organización");
      continue;
    }

    console.log("  ⚠️  Duplicados detectados! Corrigiendo...");

    // Mostrar estado actual
    console.log("\n  Estado actual:");
    for (const level of levels) {
      console.log(`    - ${level.name}: order = ${level.order}`);
    }

    // Reordenar: asignar valores secuenciales 1, 2, 3, 4...
    console.log("\n  🔧 Reordenando niveles...");
    for (let i = 0; i < levels.length; i++) {
      const newOrder = i + 1; // 1, 2, 3, 4...
      const level = levels[i];

      if (level.order !== newOrder) {
        await prisma.positionLevel.update({
          where: { id: level.id },
          data: { order: newOrder },
        });
        console.log(`    ✓ ${level.name}: ${level.order} → ${newOrder}`);
      } else {
        console.log(`    - ${level.name}: ${level.order} (sin cambios)`);
      }
    }

    console.log("\n  ✅ Organización corregida!");
  }

  console.log("\n\n✨ Proceso completado! Ahora puedes ejecutar `npx prisma db push`\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
