#!/usr/bin/env tsx
/**
 * Script para inicializar datos básicos de una organización
 *
 * Crea todos los datos iniciales necesarios para que una organización esté operativa:
 * - Tipos de ausencia (vacaciones, bajas, permisos)
 * - Configuración de PTO
 * - Niveles de puesto (Junior, Senior, etc.)
 * - Departamentos y puestos
 * - Política de gastos
 * - Centro de coste por defecto (opcional)
 *
 * Uso:
 *   npm run seed:org-init -- --orgId="tu-org-id-aqui"
 *
 * O editar directamente el ORG_ID en este archivo
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// CONFIGURACIÓN: Edita esto o pasa --orgId como argumento
const ORG_ID = process.env.ORG_ID ?? process.argv.find((arg) => arg.startsWith("--orgId="))?.split("=")[1];

// ==================== DATOS A CREAR ====================

// Tipos de ausencia por defecto (España)
const ABSENCE_TYPES = [
  {
    name: "Vacaciones",
    code: "VAC",
    description: "Vacaciones anuales retribuidas",
    requiresApproval: true,
    affectsBalance: true,
    isPaid: true,
    minDaysAdvance: 15,
    color: "#10b981", // green
  },
  {
    name: "Baja por Enfermedad",
    code: "SICK",
    description: "Baja médica por enfermedad común",
    requiresApproval: false,
    affectsBalance: false,
    isPaid: true,
    minDaysAdvance: 0,
    color: "#ef4444", // red
  },
  {
    name: "Permiso Personal",
    code: "PERS",
    description: "Permiso por asuntos personales",
    requiresApproval: true,
    affectsBalance: true,
    isPaid: true,
    minDaysAdvance: 3,
    color: "#f59e0b", // amber
  },
  {
    name: "Permiso No Retribuido",
    code: "UNPAID",
    description: "Permiso sin sueldo",
    requiresApproval: true,
    affectsBalance: false,
    isPaid: false,
    minDaysAdvance: 7,
    color: "#6b7280", // gray
  },
  {
    name: "Teletrabajo",
    code: "REMOTE",
    description: "Trabajo desde casa",
    requiresApproval: true,
    affectsBalance: false,
    isPaid: true,
    minDaysAdvance: 1,
    color: "#3b82f6", // blue
  },
  {
    name: "Formación",
    code: "TRAIN",
    description: "Asistencia a formación o eventos",
    requiresApproval: true,
    affectsBalance: false,
    isPaid: true,
    minDaysAdvance: 7,
    color: "#8b5cf6", // violet
  },
  {
    name: "Maternidad/Paternidad",
    code: "MAT",
    description: "Baja por maternidad o paternidad",
    requiresApproval: false,
    affectsBalance: false,
    isPaid: true,
    minDaysAdvance: 0,
    color: "#ec4899", // pink
  },
];

// Configuración de PTO por defecto (España)
const PTO_CONFIG = {
  defaultAnnualDays: 22, // Días laborables (España)
  accrualStartMonth: 1, // Enero
  allowNegativeBalance: false,
  requiresApproval: true,
  minRequestNoticeDays: 15,
  maxConsecutiveDays: 30,
  carryOverEnabled: false,
  carryOverMaxDays: 0,
  carryOverExpiryMonths: 0,
};

// Niveles de puesto
const POSITION_LEVELS = [
  { name: "Trainee", order: 1, description: "En formación / prácticas" },
  { name: "Junior", order: 2, description: "Nivel inicial / 0-2 años experiencia" },
  { name: "Mid", order: 3, description: "Nivel intermedio / 2-4 años experiencia" },
  { name: "Senior", order: 4, description: "Nivel avanzado / 4+ años experiencia" },
  { name: "Lead", order: 5, description: "Líder técnico / referente del equipo" },
  { name: "Principal", order: 6, description: "Arquitecto / experto del dominio" },
  { name: "Director", order: 7, description: "Director / responsable de área" },
];

// Departamentos y puestos
const DEPARTMENTS_AND_POSITIONS = [
  {
    department: "Dirección General",
    description: "Dirección y gestión estratégica de la empresa",
    positions: [
      { title: "Director/a General", description: "Dirección ejecutiva de la compañía" },
      { title: "Director/a de Operaciones", description: "Gestión de operaciones y procesos" },
      { title: "Asistente de Dirección", description: "Soporte administrativo a dirección" },
    ],
  },
  {
    department: "Recursos Humanos",
    description: "Gestión de personas y talento",
    positions: [
      { title: "Director/a de RRHH", description: "Dirección del departamento de personas" },
      { title: "Responsable de Selección", description: "Reclutamiento y selección de personal" },
      { title: "Técnico/a de RRHH", description: "Gestión administrativa de personal" },
      { title: "Técnico/a de Formación", description: "Desarrollo y formación de empleados" },
    ],
  },
  {
    department: "Administración y Finanzas",
    description: "Gestión económica y financiera",
    positions: [
      { title: "Director/a Financiero/a (CFO)", description: "Dirección financiera de la empresa" },
      { title: "Controller Financiero/a", description: "Control de gestión y reporting" },
      { title: "Responsable de Contabilidad", description: "Gestión contable y fiscal" },
      { title: "Administrativo/a Contable", description: "Tareas administrativas y contables" },
      { title: "Tesorero/a", description: "Gestión de tesorería y pagos" },
    ],
  },
  {
    department: "Comercial y Ventas",
    description: "Desarrollo de negocio y ventas",
    positions: [
      { title: "Director/a Comercial", description: "Dirección del área comercial" },
      { title: "Responsable de Ventas", description: "Gestión del equipo de ventas" },
      { title: "Key Account Manager", description: "Gestión de cuentas clave" },
      { title: "Comercial", description: "Venta y captación de clientes" },
      { title: "Inside Sales", description: "Ventas internas y seguimiento" },
    ],
  },
  {
    department: "Marketing y Comunicación",
    description: "Estrategia de marketing y comunicación",
    positions: [
      { title: "Director/a de Marketing", description: "Dirección de estrategia de marketing" },
      { title: "Responsable de Marketing Digital", description: "Gestión de canales digitales" },
      { title: "Community Manager", description: "Gestión de redes sociales" },
      { title: "Diseñador/a Gráfico/a", description: "Diseño y creatividad" },
      { title: "Responsable de Comunicación", description: "Comunicación interna y externa" },
    ],
  },
  {
    department: "Tecnología (IT)",
    description: "Sistemas de información y tecnología",
    positions: [
      { title: "CTO / Director/a de Tecnología", description: "Dirección tecnológica" },
      { title: "Responsable de Sistemas", description: "Gestión de infraestructura IT" },
      { title: "Desarrollador/a Senior", description: "Desarrollo de software senior" },
      { title: "Desarrollador/a", description: "Desarrollo de software" },
      { title: "Desarrollador/a Junior", description: "Desarrollo de software junior" },
      { title: "DevOps Engineer", description: "Operaciones y despliegue" },
      { title: "Analista de Datos", description: "Análisis y Business Intelligence" },
      { title: "Soporte Técnico", description: "Soporte a usuarios" },
    ],
  },
  {
    department: "Producción",
    description: "Operaciones y producción",
    positions: [
      { title: "Director/a de Producción", description: "Dirección de operaciones productivas" },
      { title: "Responsable de Planta", description: "Gestión de planta de producción" },
      { title: "Jefe/a de Turno", description: "Coordinación de turno de producción" },
      { title: "Operario/a de Producción", description: "Operaciones en planta" },
      { title: "Técnico/a de Mantenimiento", description: "Mantenimiento de equipos" },
    ],
  },
  {
    department: "Calidad",
    description: "Control de calidad y procesos",
    positions: [
      { title: "Responsable de Calidad", description: "Gestión del sistema de calidad" },
      { title: "Técnico/a de Calidad", description: "Control y auditoría de calidad" },
      { title: "Inspector/a de Calidad", description: "Inspección de productos" },
    ],
  },
  {
    department: "Logística y Almacén",
    description: "Gestión de logística y almacenamiento",
    positions: [
      { title: "Responsable de Logística", description: "Gestión de cadena de suministro" },
      { title: "Jefe/a de Almacén", description: "Gestión de almacén" },
      { title: "Mozo/a de Almacén", description: "Operaciones de almacén" },
      { title: "Responsable de Compras", description: "Gestión de compras y proveedores" },
    ],
  },
  {
    department: "Atención al Cliente",
    description: "Servicio y atención al cliente",
    positions: [
      { title: "Responsable de Atención al Cliente", description: "Gestión del servicio al cliente" },
      { title: "Agente de Atención al Cliente", description: "Soporte y atención" },
      { title: "Técnico/a de Soporte", description: "Soporte técnico a clientes" },
    ],
  },
];

// Política de gastos (España)
const EXPENSE_POLICY = {
  mileageRateEurPerKm: 0.26, // Tarifa estándar España 2024
  mealDailyLimit: 30.0,
  lodgingDailyLimit: 100.0,
  categoryRequirements: {
    FUEL: {
      requiresReceipt: true,
      vatAllowed: true,
      description: "Combustible para vehículos de empresa o desplazamientos",
    },
    MILEAGE: {
      requiresReceipt: false,
      vatAllowed: false,
      description: "Kilometraje con vehículo propio",
    },
    MEAL: {
      requiresReceipt: true,
      vatAllowed: true,
      maxDailyAmount: 30.0,
      description: "Comidas en desplazamientos o con clientes",
    },
    TOLL: {
      requiresReceipt: true,
      vatAllowed: true,
      description: "Peajes de autopistas",
    },
    PARKING: {
      requiresReceipt: false,
      vatAllowed: true,
      description: "Parking en desplazamientos",
    },
    LODGING: {
      requiresReceipt: true,
      vatAllowed: true,
      maxDailyAmount: 100.0,
      description: "Alojamiento en desplazamientos",
    },
    OTHER: {
      requiresReceipt: true,
      vatAllowed: true,
      description: "Otros gastos justificados",
    },
  },
  attachmentRequired: true,
  costCenterRequired: false,
  vatAllowed: true,
  approvalLevels: 1,
};

// ==================== FUNCIONES AUXILIARES ====================

function logSection(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
}

async function createAbsenceTypes(orgId: string) {
  logSection("📋 TIPOS DE AUSENCIA");

  let created = 0;
  let skipped = 0;

  for (const absenceType of ABSENCE_TYPES) {
    const existing = await prisma.absenceType.findFirst({
      where: { orgId, code: absenceType.code },
    });

    if (existing) {
      console.log(`   ⏭️  Ya existe: ${absenceType.name} (${absenceType.code})`);
      skipped++;
    } else {
      await prisma.absenceType.create({
        data: {
          ...absenceType,
          orgId,
          active: true,
        },
      });
      console.log(`   ✅ Creado: ${absenceType.name} (${absenceType.code})`);
      created++;
    }
  }

  console.log(`\n   📊 Resumen: ${created} creados, ${skipped} omitidos`);
  return { created, skipped };
}

async function createPtoConfig(orgId: string) {
  logSection("🏖️  CONFIGURACIÓN DE PTO (VACACIONES)");

  const existing = await prisma.organizationPtoConfig.findUnique({
    where: { orgId },
  });

  if (existing) {
    console.log(`   ⏭️  Ya existe configuración de PTO para esta organización`);
    console.log(`   📌 Días anuales actuales: ${existing.defaultAnnualDays}`);
    return { created: 0, skipped: 1 };
  }

  await prisma.organizationPtoConfig.create({
    data: {
      ...PTO_CONFIG,
      orgId,
    },
  });

  console.log(`   ✅ Configuración de PTO creada`);
  console.log(`   📌 Días anuales por defecto: ${PTO_CONFIG.defaultAnnualDays}`);
  console.log(`   📌 Aviso mínimo: ${PTO_CONFIG.minRequestNoticeDays} días`);
  console.log(`   📌 Máximo consecutivo: ${PTO_CONFIG.maxConsecutiveDays} días`);

  return { created: 1, skipped: 0 };
}

async function createPositionLevels(orgId: string) {
  logSection("📊 NIVELES DE PUESTO");

  let created = 0;
  let skipped = 0;

  for (const level of POSITION_LEVELS) {
    const existing = await prisma.positionLevel.findUnique({
      where: {
        orgId_name: {
          orgId,
          name: level.name,
        },
      },
    });

    if (existing) {
      console.log(`   ⏭️  Ya existe: ${level.name}`);
      skipped++;
    } else {
      await prisma.positionLevel.create({
        data: {
          ...level,
          orgId,
        },
      });
      console.log(`   ✅ Creado: ${level.name} (orden: ${level.order})`);
      created++;
    }
  }

  console.log(`\n   📊 Resumen: ${created} creados, ${skipped} omitidos`);
  return { created, skipped };
}

async function createDepartmentsAndPositions(orgId: string) {
  logSection("🏢 DEPARTAMENTOS Y PUESTOS");

  let createdDepartments = 0;
  let skippedDepartments = 0;
  let createdPositions = 0;
  let skippedPositions = 0;

  for (const deptData of DEPARTMENTS_AND_POSITIONS) {
    const existingDept = await prisma.department.findFirst({
      where: { orgId, name: deptData.department },
    });

    let department;
    if (existingDept) {
      console.log(`   ⏭️  Departamento ya existe: ${deptData.department}`);
      department = existingDept;
      skippedDepartments++;
    } else {
      department = await prisma.department.create({
        data: {
          orgId,
          name: deptData.department,
          description: deptData.description,
          active: true,
        },
      });
      console.log(`   ✅ Departamento creado: ${deptData.department}`);
      createdDepartments++;
    }

    for (const posData of deptData.positions) {
      const existingPos = await prisma.position.findFirst({
        where: { orgId, title: posData.title },
      });

      if (existingPos) {
        console.log(`      ⏭️  Puesto ya existe: ${posData.title}`);
        skippedPositions++;
      } else {
        await prisma.position.create({
          data: {
            orgId,
            title: posData.title,
            description: posData.description,
            active: true,
          },
        });
        console.log(`      ✅ Puesto creado: ${posData.title}`);
        createdPositions++;
      }
    }
  }

  console.log(`\n   📊 Resumen Departamentos: ${createdDepartments} creados, ${skippedDepartments} omitidos`);
  console.log(`   📊 Resumen Puestos: ${createdPositions} creados, ${skippedPositions} omitidos`);

  return {
    createdDepartments,
    skippedDepartments,
    createdPositions,
    skippedPositions,
  };
}

async function createExpensePolicy(orgId: string) {
  logSection("💰 POLÍTICA DE GASTOS");

  const existing = await prisma.expensePolicy.findFirst({
    where: { orgId },
  });

  if (existing) {
    console.log(`   ⏭️  Ya existe política de gastos para esta organización`);
    console.log(`   📌 Kilometraje actual: ${existing.mileageRateEurPerKm} €/km`);
    return { created: 0, skipped: 1 };
  }

  await prisma.expensePolicy.create({
    data: {
      ...EXPENSE_POLICY,
      orgId,
    },
  });

  console.log(`   ✅ Política de gastos creada`);
  console.log(`   📌 Kilometraje: ${EXPENSE_POLICY.mileageRateEurPerKm} €/km`);
  console.log(`   📌 Límite comidas: ${EXPENSE_POLICY.mealDailyLimit} €/día`);
  console.log(`   📌 Límite alojamiento: ${EXPENSE_POLICY.lodgingDailyLimit} €/día`);

  return { created: 1, skipped: 0 };
}

async function createDefaultCostCenter(orgId: string, orgName: string) {
  logSection("🏭 CENTRO DE COSTE POR DEFECTO (OPCIONAL)");

  const existing = await prisma.costCenter.findFirst({
    where: { orgId },
  });

  if (existing) {
    console.log(`   ⏭️  Ya existen centros de coste (${await prisma.costCenter.count({ where: { orgId } })})`);
    console.log(`   ℹ️  Omitiendo creación de centro por defecto`);
    return { created: 0, skipped: 1 };
  }

  const costCenter = await prisma.costCenter.create({
    data: {
      orgId,
      name: "Oficina Principal",
      code: "MAIN",
      address: "Dirección pendiente de configurar",
      timezone: "Europe/Madrid",
    },
  });

  console.log(`   ✅ Centro de coste creado: ${costCenter.name} (${costCenter.code})`);
  console.log(`   ℹ️  Recuerda actualizar la dirección en la configuración`);

  return { created: 1, skipped: 0 };
}

// ==================== MAIN ====================

async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                                                            ║");
  console.log("║     🚀 INICIALIZACIÓN DE ORGANIZACIÓN - ERP TimeNow       ║");
  console.log("║                                                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Validar ORG_ID
  if (!ORG_ID) {
    console.error("❌ ERROR: Debes proporcionar un ORG_ID\n");
    console.log("Uso:");
    console.log('  npm run seed:org-init -- --orgId="tu-org-id-aqui"');
    console.log("  O edita la variable ORG_ID en el script\n");
    process.exit(1);
  }

  // Verificar que la organización existe
  const organization = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: { id: true, name: true },
  });

  if (!organization) {
    console.error(`❌ ERROR: No se encontró la organización con ID: ${ORG_ID}\n`);
    process.exit(1);
  }

  console.log(`✅ Organización encontrada: ${organization.name}`);
  console.log(`📋 ID: ${organization.id}\n`);

  // Mostrar qué se va a crear
  console.log("⚠️  Este script creará los siguientes datos iniciales:\n");
  console.log(`   📋 ${ABSENCE_TYPES.length} tipos de ausencia (vacaciones, bajas, permisos)`);
  console.log(`   🏖️  1 configuración de PTO (vacaciones)`);
  console.log(`   📊 ${POSITION_LEVELS.length} niveles de puesto (Junior, Senior, etc.)`);
  console.log(`   🏢 ${DEPARTMENTS_AND_POSITIONS.length} departamentos`);
  const totalPositions = DEPARTMENTS_AND_POSITIONS.reduce((sum, dept) => sum + dept.positions.length, 0);
  console.log(`   💼 ${totalPositions} puestos de trabajo`);
  console.log(`   💰 1 política de gastos`);
  console.log(`   🏭 1 centro de coste (si no existe ninguno)\n`);

  // Mostrar datos existentes
  const [
    existingAbsences,
    existingPtoConfig,
    existingLevels,
    existingDepts,
    existingPositions,
    existingPolicy,
    existingCenters,
  ] = await Promise.all([
    prisma.absenceType.count({ where: { orgId: ORG_ID } }),
    prisma.organizationPtoConfig.count({ where: { orgId: ORG_ID } }),
    prisma.positionLevel.count({ where: { orgId: ORG_ID } }),
    prisma.department.count({ where: { orgId: ORG_ID } }),
    prisma.position.count({ where: { orgId: ORG_ID } }),
    prisma.expensePolicy.count({ where: { orgId: ORG_ID } }),
    prisma.costCenter.count({ where: { orgId: ORG_ID } }),
  ]);

  if (
    existingAbsences > 0 ||
    existingPtoConfig > 0 ||
    existingLevels > 0 ||
    existingDepts > 0 ||
    existingPositions > 0 ||
    existingPolicy > 0 ||
    existingCenters > 0
  ) {
    console.log(`ℹ️  Datos existentes en la organización:`);
    if (existingAbsences > 0) console.log(`   - ${existingAbsences} tipos de ausencia`);
    if (existingPtoConfig > 0) console.log(`   - Configuración de PTO ya existe`);
    if (existingLevels > 0) console.log(`   - ${existingLevels} niveles de puesto`);
    if (existingDepts > 0) console.log(`   - ${existingDepts} departamentos`);
    if (existingPositions > 0) console.log(`   - ${existingPositions} puestos`);
    if (existingPolicy > 0) console.log(`   - Política de gastos ya existe`);
    if (existingCenters > 0) console.log(`   - ${existingCenters} centros de coste`);
    console.log(`\n   ℹ️  Este script NO eliminará los datos existentes, solo añadirá los faltantes.\n`);
  }

  console.log("⏳ Esperando 5 segundos antes de continuar...");
  console.log("   (Presiona Ctrl+C para cancelar)\n");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Ejecutar creación de datos
  const results = {
    absenceTypes: await createAbsenceTypes(ORG_ID),
    ptoConfig: await createPtoConfig(ORG_ID),
    positionLevels: await createPositionLevels(ORG_ID),
    departmentsAndPositions: await createDepartmentsAndPositions(ORG_ID),
    expensePolicy: await createExpensePolicy(ORG_ID),
    costCenter: await createDefaultCostCenter(ORG_ID, organization.name),
  };

  // Resumen final
  logSection("✨ PROCESO COMPLETADO");

  console.log("📊 RESUMEN FINAL:\n");
  console.log(
    `   📋 Tipos de ausencia: ${results.absenceTypes.created} creados, ${results.absenceTypes.skipped} omitidos`,
  );
  console.log(`   🏖️  Configuración PTO: ${results.ptoConfig.created} creada, ${results.ptoConfig.skipped} omitida`);
  console.log(
    `   📊 Niveles de puesto: ${results.positionLevels.created} creados, ${results.positionLevels.skipped} omitidos`,
  );
  console.log(
    `   🏢 Departamentos: ${results.departmentsAndPositions.createdDepartments} creados, ${results.departmentsAndPositions.skippedDepartments} omitidos`,
  );
  console.log(
    `   💼 Puestos: ${results.departmentsAndPositions.createdPositions} creados, ${results.departmentsAndPositions.skippedPositions} omitidos`,
  );
  console.log(
    `   💰 Política de gastos: ${results.expensePolicy.created} creada, ${results.expensePolicy.skipped} omitida`,
  );
  console.log(
    `   🏭 Centros de coste: ${results.costCenter.created} creados, ${results.costCenter.skipped} omitidos\n`,
  );

  console.log("✅ La organización está lista para empezar a operar!\n");
  console.log("📝 Próximos pasos sugeridos:");
  console.log("   1. Crear usuarios y asignar roles");
  console.log("   2. Crear empleados y vincularlos a usuarios");
  console.log("   3. Asignar empleados a departamentos y puestos");
  console.log("   4. Configurar calendarios y festivos");
  console.log("   5. Configurar centros de coste adicionales (si es necesario)\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Error al ejecutar el script:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
