/**
 * Script para inicializar tipos de ausencia por defecto
 * Ejecutar con: npx tsx scripts/init-absence-types.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultAbsenceTypes = [
  {
    code: "VACATION",
    name: "Vacaciones",
    description: "Días de vacaciones anuales retribuidas",
    color: "#3b82f6", // Azul
    isPaid: true,
    requiresApproval: true,
    minDaysAdvance: 7,
    affectsBalance: true,
  },
  {
    code: "PERSONAL",
    name: "Asuntos personales",
    description: "Días por asuntos personales",
    color: "#8b5cf6", // Violeta
    isPaid: true,
    requiresApproval: true,
    minDaysAdvance: 2,
    affectsBalance: false,
  },
  {
    code: "SICK_LEAVE",
    name: "Baja médica",
    description: "Ausencia por enfermedad o incapacidad temporal",
    color: "#ef4444", // Rojo
    isPaid: true,
    requiresApproval: false, // Se aprueba automáticamente con justificante médico
    minDaysAdvance: 0,
    affectsBalance: false,
  },
  {
    code: "MATERNITY_PATERNITY",
    name: "Maternidad/Paternidad",
    description: "Permiso por nacimiento o adopción",
    color: "#f59e0b", // Naranja
    isPaid: true,
    requiresApproval: true,
    minDaysAdvance: 15,
    affectsBalance: false,
  },
  {
    code: "UNPAID_LEAVE",
    name: "Permiso no retribuido",
    description: "Ausencia sin sueldo",
    color: "#6b7280", // Gris
    isPaid: false,
    requiresApproval: true,
    minDaysAdvance: 15,
    affectsBalance: false,
  },
  {
    code: "TRAINING",
    name: "Formación",
    description: "Ausencia por formación o cursos",
    color: "#10b981", // Verde
    isPaid: true,
    requiresApproval: true,
    minDaysAdvance: 7,
    affectsBalance: false,
  },
];

async function main() {
  console.log("🚀 Iniciando creación de tipos de ausencia...\n");

  // Obtener todas las organizaciones
  const organizations = await prisma.organization.findMany();

  if (organizations.length === 0) {
    console.log("⚠️  No se encontraron organizaciones en la base de datos.");
    console.log("   Crea primero una organización antes de ejecutar este script.");
    return;
  }

  console.log(`📊 Se encontraron ${organizations.length} organizaciones\n`);

  for (const org of organizations) {
    console.log(`📁 Procesando organización: ${org.name}`);

    for (const absenceType of defaultAbsenceTypes) {
      // Verificar si ya existe
      const existing = await prisma.absenceType.findUnique({
        where: {
          orgId_code: {
            orgId: org.id,
            code: absenceType.code,
          },
        },
      });

      if (existing) {
        console.log(`   ⏭️  ${absenceType.name} ya existe, saltando...`);
        continue;
      }

      // Crear el tipo de ausencia
      await prisma.absenceType.create({
        data: {
          ...absenceType,
          orgId: org.id,
        },
      });

      console.log(`   ✅ ${absenceType.name} creado correctamente`);
    }

    console.log("");
  }

  console.log("🎉 Tipos de ausencia inicializados correctamente!\n");
  console.log("📝 Tipos creados:");
  defaultAbsenceTypes.forEach((type) => {
    console.log(`   - ${type.name} (${type.code})`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
