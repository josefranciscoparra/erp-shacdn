/**
 * Script de migración: Convertir Position.level (String) a PositionLevel (tabla)
 *
 * Este script:
 * 1. Lee los niveles actuales de positions.level
 * 2. Crea registros únicos en position_levels
 * 3. Actualiza las relaciones en positions
 * 4. Prepara la BD para eliminar la columna level
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando migración de Position.level → PositionLevel...\n");

  // 1. Obtener todos los niveles únicos actuales
  const positions = await prisma.$queryRaw<Array<{ level: string | null; orgId: string }>>`
    SELECT DISTINCT level, "orgId"
    FROM positions
    WHERE level IS NOT NULL
    ORDER BY level
  `;

  console.log(`📊 Niveles encontrados: ${positions.length}`);
  positions.forEach((p) => console.log(`   - ${p.level} (Org: ${p.orgId})`));

  // 2. Crear registros en PositionLevel para cada nivel único
  const levelMap = new Map<string, string>(); // level_name → level_id
  const levelOrder: Record<string, number> = {
    Trainee: 1,
    Junior: 2,
    Mid: 3,
    Senior: 4,
    Lead: 5,
    Principal: 6,
    Director: 7,
  };

  console.log("\n📝 Creando registros en PositionLevel...");

  for (const { level, orgId } of positions) {
    if (!level) continue;

    // Verificar si ya existe
    const existing = await prisma.positionLevel.findUnique({
      where: {
        orgId_name: {
          orgId,
          name: level,
        },
      },
    });

    if (existing) {
      console.log(`   ⏭️  Ya existe: ${level}`);
      levelMap.set(`${orgId}:${level}`, existing.id);
      continue;
    }

    // Crear nuevo nivel
    const newLevel = await prisma.positionLevel.create({
      data: {
        name: level,
        order: levelOrder[level] || 0,
        orgId,
        description: `Nivel ${level}`,
      },
    });

    levelMap.set(`${orgId}:${level}`, newLevel.id);
    console.log(`   ✅ Creado: ${level} (ID: ${newLevel.id})`);
  }

  // 3. Actualizar todas las posiciones con la nueva relación
  console.log("\n🔗 Actualizando relaciones en Position...");

  const allPositions = await prisma.$queryRaw<Array<{ id: string; level: string | null; orgId: string }>>`
    SELECT id, level, "orgId" FROM positions WHERE level IS NOT NULL
  `;

  let updated = 0;
  for (const position of allPositions) {
    if (!position.level) continue;

    const levelId = levelMap.get(`${position.orgId}:${position.level}`);
    if (!levelId) {
      console.log(`   ⚠️  No se encontró nivel para: ${position.level}`);
      continue;
    }

    await prisma.position.update({
      where: { id: position.id },
      data: { levelId },
    });

    updated++;
  }

  console.log(`   ✅ ${updated} posiciones actualizadas`);

  // 4. Resumen final
  console.log("\n📊 Resumen de migración:");
  const totalLevels = await prisma.positionLevel.count();
  const positionsWithLevel = await prisma.position.count({
    where: { levelId: { not: null } },
  });

  console.log(`   - Niveles creados: ${totalLevels}`);
  console.log(`   - Posiciones con nivel: ${positionsWithLevel}`);

  console.log("\n✅ Migración completada con éxito!");
  console.log("\n⚠️  IMPORTANTE: Ahora puedes eliminar la columna 'level' de Position");
  console.log("   Ejecuta: npx prisma migrate dev --name remove_position_level_column");
}

main()
  .catch((e) => {
    console.error("❌ Error en la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
