#!/usr/bin/env tsx
/**
 * Script para rellenar departamentos y puestos en una organización existente
 *
 * Uso:
 *   npm run seed:departments -- --orgId="tu-org-id-aqui"
 *
 * O editar directamente el ORG_ID en este archivo
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// CONFIGURACIÓN: Edita esto o pasa --orgId como argumento
const ORG_ID = process.env.ORG_ID ?? process.argv.find((arg) => arg.startsWith("--orgId="))?.split("=")[1];

// Datos de departamentos y puestos típicos de una empresa española
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

async function main() {
  console.log("🚀 Iniciando script de seed de departamentos y puestos...\n");

  // Validar ORG_ID
  if (!ORG_ID) {
    console.error("❌ ERROR: Debes proporcionar un ORG_ID");
    console.log("\nUso:");
    console.log('  npm run seed:departments -- --orgId="tu-org-id-aqui"');
    console.log("  O edita la variable ORG_ID en el script\n");
    process.exit(1);
  }

  // Verificar que la organización existe
  const organization = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: { id: true, name: true },
  });

  if (!organization) {
    console.error(`❌ ERROR: No se encontró la organización con ID: ${ORG_ID}`);
    process.exit(1);
  }

  console.log(`✅ Organización encontrada: ${organization.name} (${organization.id})\n`);

  // Preguntar confirmación
  console.log("⚠️  Este script creará los siguientes departamentos y puestos:");
  console.log(`   Total: ${DEPARTMENTS_AND_POSITIONS.length} departamentos`);
  const totalPositions = DEPARTMENTS_AND_POSITIONS.reduce((sum, dept) => sum + dept.positions.length, 0);
  console.log(`   Total: ${totalPositions} puestos\n`);

  // Contar existentes
  const existingDepartments = await prisma.department.count({ where: { orgId: ORG_ID } });
  const existingPositions = await prisma.position.count({ where: { orgId: ORG_ID } });

  if (existingDepartments > 0 || existingPositions > 0) {
    console.log(`⚠️  La organización ya tiene:`);
    console.log(`   - ${existingDepartments} departamentos`);
    console.log(`   - ${existingPositions} puestos`);
    console.log(`\n   Este script NO eliminará los existentes, solo añadirá los nuevos.\n`);
  }

  console.log("Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("\n📝 Creando departamentos y puestos...\n");

  let createdDepartments = 0;
  let skippedDepartments = 0;
  let createdPositions = 0;
  let skippedPositions = 0;

  for (const deptData of DEPARTMENTS_AND_POSITIONS) {
    // Verificar si el departamento ya existe
    const existingDept = await prisma.department.findFirst({
      where: {
        orgId: ORG_ID,
        name: deptData.department,
      },
    });

    let department;
    if (existingDept) {
      console.log(`   ⏭️  Departamento ya existe: ${deptData.department}`);
      department = existingDept;
      skippedDepartments++;
    } else {
      department = await prisma.department.create({
        data: {
          orgId: ORG_ID,
          name: deptData.department,
          description: deptData.description,
          active: true,
        },
      });
      console.log(`   ✅ Departamento creado: ${deptData.department}`);
      createdDepartments++;
    }

    // Crear puestos para este departamento
    for (const posData of deptData.positions) {
      // Verificar si el puesto ya existe
      const existingPos = await prisma.position.findFirst({
        where: {
          orgId: ORG_ID,
          title: posData.title,
        },
      });

      if (existingPos) {
        console.log(`      ⏭️  Puesto ya existe: ${posData.title}`);
        skippedPositions++;
      } else {
        await prisma.position.create({
          data: {
            orgId: ORG_ID,
            title: posData.title,
            description: posData.description,
            active: true,
          },
        });
        console.log(`      ✅ Puesto creado: ${posData.title}`);
        createdPositions++;
      }
    }

    console.log(""); // Línea en blanco entre departamentos
  }

  console.log("\n✨ Proceso completado!\n");
  console.log("📊 Resumen:");
  console.log(`   Departamentos creados: ${createdDepartments}`);
  console.log(`   Departamentos omitidos (ya existían): ${skippedDepartments}`);
  console.log(`   Puestos creados: ${createdPositions}`);
  console.log(`   Puestos omitidos (ya existían): ${skippedPositions}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("\n❌ Error al ejecutar el script:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
