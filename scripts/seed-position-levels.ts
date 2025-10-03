/**
 * Script para crear niveles de puesto por defecto
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_LEVELS = [
  { name: "Trainee", order: 1, description: "En formación / prácticas" },
  { name: "Junior", order: 2, description: "Nivel inicial / 0-2 años experiencia" },
  { name: "Mid", order: 3, description: "Nivel intermedio / 2-4 años experiencia" },
  { name: "Senior", order: 4, description: "Nivel avanzado / 4+ años experiencia" },
  { name: "Lead", order: 5, description: "Líder técnico / referente del equipo" },
  { name: "Principal", order: 6, description: "Arquitecto / experto del dominio" },
  { name: "Director", order: 7, description: "Director / responsable de área" },
];

async function main() {
  console.log("🚀 Creando niveles de puesto por defecto...\n");

  // Obtener todas las organizaciones
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  console.log(`📊 Organizaciones encontradas: ${organizations.length}\n`);

  for (const org of organizations) {
    console.log(`🏢 Procesando: ${org.name}`);

    for (const level of DEFAULT_LEVELS) {
      // Verificar si ya existe
      const existing = await prisma.positionLevel.findUnique({
        where: {
          orgId_name: {
            orgId: org.id,
            name: level.name,
          },
        },
      });

      if (existing) {
        console.log(`   ⏭️  Ya existe: ${level.name}`);
        continue;
      }

      // Crear nivel
      await prisma.positionLevel.create({
        data: {
          name: level.name,
          order: level.order,
          description: level.description,
          orgId: org.id,
        },
      });

      console.log(`   ✅ Creado: ${level.name} (orden: ${level.order})`);
    }

    console.log("");
  }

  // Resumen
  const totalLevels = await prisma.positionLevel.count();
  console.log(`\n✅ Total de niveles en el sistema: ${totalLevels}`);
  console.log("\n🎯 Los niveles están listos para asignar a puestos de trabajo!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
