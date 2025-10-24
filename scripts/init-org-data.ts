/**
 * Script para inicializar datos maestros de una organización específica
 * Ejecutar con: ORG_ID=<id> npm run init:org-data
 * O: npx tsx scripts/init-org-data.ts <orgId>
 *
 * Este script NO crea:
 * - La organización (debe existir previamente)
 * - El usuario Super Admin (es global)
 *
 * Este script SÍ crea:
 * - Tipos de ausencia para la organización
 * - Niveles de posición para la organización
 * - Centro de coste por defecto (si no existe)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Datos por defecto de tipos de ausencia
const DEFAULT_ABSENCE_TYPES = [
  {
    code: "VACATION",
    name: "Vacaciones",
    description: "Días de vacaciones anuales retribuidas",
    color: "#3b82f6",
    isPaid: true,
    requiresApproval: true,
    minDaysAdvance: 0,
    affectsBalance: true,
  },
  {
    code: "PERSONAL",
    name: "Asuntos personales",
    description: "Días por asuntos personales",
    color: "#8b5cf6",
    isPaid: true,
    requiresApproval: true,
    minDaysAdvance: 0,
    affectsBalance: false,
  },
  {
    code: "SICK_LEAVE",
    name: "Baja médica",
    description: "Ausencia por enfermedad o incapacidad temporal",
    color: "#ef4444",
    isPaid: true,
    requiresApproval: false,
    minDaysAdvance: 0,
    affectsBalance: false,
  },
  {
    code: "MATERNITY_PATERNITY",
    name: "Maternidad/Paternidad",
    description: "Permiso por nacimiento o adopción",
    color: "#f59e0b",
    isPaid: true,
    requiresApproval: true,
    minDaysAdvance: 0,
    affectsBalance: false,
  },
  {
    code: "UNPAID_LEAVE",
    name: "Permiso no retribuido",
    description: "Ausencia sin sueldo",
    color: "#6b7280",
    isPaid: false,
    requiresApproval: true,
    minDaysAdvance: 0,
    affectsBalance: false,
  },
  {
    code: "TRAINING",
    name: "Formación",
    description: "Ausencia por formación o cursos",
    color: "#10b981",
    isPaid: true,
    requiresApproval: true,
    minDaysAdvance: 0,
    affectsBalance: false,
  },
];

// Datos por defecto de niveles de posición
const DEFAULT_POSITION_LEVELS = [
  { name: "Trainee", order: 1, description: "En formación / prácticas" },
  { name: "Junior", order: 2, description: "Nivel inicial / 0-2 años experiencia" },
  { name: "Mid", order: 3, description: "Nivel intermedio / 2-4 años experiencia" },
  { name: "Senior", order: 4, description: "Nivel avanzado / 4+ años experiencia" },
  { name: "Lead", order: 5, description: "Líder técnico / referente del equipo" },
  { name: "Principal", order: 6, description: "Arquitecto / experto del dominio" },
  { name: "Director", order: 7, description: "Director / responsable de área" },
];

// Datos por defecto de centro de coste
const DEFAULT_COST_CENTER = {
  name: "Sede principal",
  code: "CC001",
  address: "Calle Principal, 123",
  timezone: "Europe/Madrid",
  active: true,
};

async function initAbsenceTypes(orgId: string, orgName: string) {
  console.log("\n📋 Inicializando tipos de ausencia...");

  let created = 0;
  let skipped = 0;

  for (const absenceType of DEFAULT_ABSENCE_TYPES) {
    const existing = await prisma.absenceType.findUnique({
      where: {
        orgId_code: {
          orgId,
          code: absenceType.code,
        },
      },
    });

    if (existing) {
      console.log(`   ⏭️  ${absenceType.name} ya existe`);
      skipped++;
      continue;
    }

    await prisma.absenceType.create({
      data: {
        ...absenceType,
        orgId,
      },
    });

    console.log(`   ✅ ${absenceType.name} creado`);
    created++;
  }

  console.log(`\n   📊 Total: ${created} creados, ${skipped} existentes`);
}

async function initPositionLevels(orgId: string, orgName: string) {
  console.log("\n🎯 Inicializando niveles de posición...");

  let created = 0;
  let skipped = 0;

  for (const level of DEFAULT_POSITION_LEVELS) {
    const existing = await prisma.positionLevel.findUnique({
      where: {
        orgId_name: {
          orgId,
          name: level.name,
        },
      },
    });

    if (existing) {
      console.log(`   ⏭️  ${level.name} ya existe`);
      skipped++;
      continue;
    }

    await prisma.positionLevel.create({
      data: {
        name: level.name,
        order: level.order,
        description: level.description,
        orgId,
      },
    });

    console.log(`   ✅ ${level.name} creado (orden: ${level.order})`);
    created++;
  }

  console.log(`\n   📊 Total: ${created} creados, ${skipped} existentes`);
}

async function initCostCenter(orgId: string, orgName: string) {
  console.log("\n🏢 Verificando centro de coste...");

  const existing = await prisma.costCenter.findFirst({
    where: { orgId },
  });

  if (existing) {
    console.log(`   ✅ Ya existe: ${existing.name}`);
    return;
  }

  const costCenter = await prisma.costCenter.create({
    data: {
      ...DEFAULT_COST_CENTER,
      orgId,
    },
  });

  console.log(`   ✅ Creado: ${costCenter.name} (${costCenter.code})`);
}

async function main() {
  // Obtener el ID de la organización
  const orgId = process.env.ORG_ID ?? process.argv[2];

  if (!orgId) {
    console.error("❌ Error: Debes proporcionar el ID de la organización");
    console.log("\nUso:");
    console.log("  ORG_ID=<id> npm run init:org-data");
    console.log("  O: npx tsx scripts/init-org-data.ts <orgId>");
    process.exit(1);
  }

  console.log("🚀 Inicializando datos maestros para organización específica");
  console.log("━".repeat(60));

  // Verificar que la organización existe
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!organization) {
    console.error(`\n❌ Error: No se encontró la organización con ID: ${orgId}`);
    process.exit(1);
  }

  console.log(`\n🏢 Organización: ${organization.name}`);
  console.log(`   ID: ${organization.id}`);
  console.log(`   VAT: ${organization.vat}`);

  // Ejecutar inicializaciones
  await initCostCenter(orgId, organization.name);
  await initAbsenceTypes(orgId, organization.name);
  await initPositionLevels(orgId, organization.name);

  // Resumen final
  console.log("\n" + "━".repeat(60));
  console.log("\n🎉 Datos maestros inicializados correctamente!");
  console.log(`\n📦 La organización "${organization.name}" está lista para usarse`);
}

main()
  .catch((error) => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
