/**
 * Script para crear organización y centro de coste por defecto
 * Ejecutar con: npx tsx scripts/init-default-org.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ORG = {
  name: "Mi empresa",
  vat: "B00000000",
  active: true,
  annualPtoDays: 23,
  ptoCalculationMethod: "PROPORTIONAL",
  ptoAccrualStartDate: "CONTRACT_START",
};

const DEFAULT_COST_CENTER = {
  name: "Sede principal",
  code: "CC001",
  address: "Calle Principal, 123",
  timezone: "Europe/Madrid",
  active: true,
};

async function main() {
  console.log("🏢 Inicializando organización por defecto...\n");

  // Verificar si ya existe una organización
  const existingOrg = await prisma.organization.findFirst();

  if (existingOrg) {
    console.log(`✅ Ya existe una organización: ${existingOrg.name}`);
    console.log(`   ID: ${existingOrg.id}`);
    console.log(`   VAT: ${existingOrg.vat}`);

    // Verificar si tiene centro de coste
    const existingCostCenter = await prisma.costCenter.findFirst({
      where: { orgId: existingOrg.id },
    });

    if (existingCostCenter) {
      console.log(`\n✅ Ya existe un centro de coste: ${existingCostCenter.name}`);
    } else {
      // Crear centro de coste para la organización existente
      const costCenter = await prisma.costCenter.create({
        data: {
          ...DEFAULT_COST_CENTER,
          orgId: existingOrg.id,
        },
      });
      console.log(`\n✅ Centro de coste creado: ${costCenter.name}`);
    }

    return;
  }

  // Crear organización nueva
  const org = await prisma.organization.create({
    data: DEFAULT_ORG,
  });

  console.log(`✅ Organización creada: ${org.name}`);
  console.log(`   ID: ${org.id}`);
  console.log(`   VAT: ${org.vat}`);
  console.log(`   Días PTO anuales: ${org.annualPtoDays}`);

  // Crear centro de coste
  const costCenter = await prisma.costCenter.create({
    data: {
      ...DEFAULT_COST_CENTER,
      orgId: org.id,
    },
  });

  console.log(`\n✅ Centro de coste creado: ${costCenter.name}`);
  console.log(`   Código: ${costCenter.code}`);
  console.log(`   Timezone: ${costCenter.timezone}`);

  console.log("\n🎉 Organización y centro de coste inicializados correctamente!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
