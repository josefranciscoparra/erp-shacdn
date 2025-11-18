/**
 * Script para actualizar tipos de ausencia existentes con valores por defecto
 * para los nuevos campos de granularidad
 */

import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Actualizando tipos de ausencia existentes...");

  // Obtener todos los tipos de ausencia
  const absenceTypes = await prisma.absenceType.findMany();

  console.log(`📊 Encontrados ${absenceTypes.length} tipos de ausencia`);

  if (absenceTypes.length === 0) {
    console.log("✅ No hay tipos de ausencia para actualizar");
    return;
  }

  let updated = 0;

  // Actualizar cada tipo verificando valores null/undefined
  for (const type of absenceTypes) {
    const needsUpdate =
      type.allowPartialDays == null ||
      type.granularityMinutes == null ||
      type.minimumDurationMinutes == null ||
      type.compensationFactor == null;

    if (needsUpdate) {
      console.log(`  - Actualizando "${type.name}" (${type.code})...`);

      await prisma.absenceType.update({
        where: { id: type.id },
        data: {
          allowPartialDays: type.allowPartialDays ?? false,
          granularityMinutes: type.granularityMinutes ?? 480,
          minimumDurationMinutes: type.minimumDurationMinutes ?? 480,
          compensationFactor: type.compensationFactor ?? new Decimal(1.0),
        },
      });

      updated++;
    }
  }

  console.log(`✅ Actualización completada: ${updated} registros actualizados`);

  // Verificar los resultados
  const allTypes = await prisma.absenceType.findMany({
    select: {
      name: true,
      code: true,
      allowPartialDays: true,
      granularityMinutes: true,
      minimumDurationMinutes: true,
      compensationFactor: true,
    },
  });

  console.log("\n📋 Resumen de tipos de ausencia:");
  console.table(
    allTypes.map((t) => ({
      Nombre: t.name,
      Código: t.code,
      "Fracciones?": t.allowPartialDays ? "Sí" : "No",
      "Granularidad (min)": t.granularityMinutes,
      "Mín. duración (min)": t.minimumDurationMinutes,
      "Factor comp.": Number(t.compensationFactor),
    })),
  );
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
