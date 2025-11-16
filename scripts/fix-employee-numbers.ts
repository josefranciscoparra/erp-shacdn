/**
 * Script de reparación de números de empleado con formato incorrecto
 *
 * Este script detecta y corrige números de empleado que no siguen el formato estándar:
 * - Formato correcto: PREFIX + 5 dígitos (ej: EMP00001, TMNW00042)
 * - Formatos incorrectos detectados:
 *   - Más de 5 dígitos: EMP000011 (6 dígitos)
 *   - Menos de 5 dígitos: EMP0001 (4 dígitos)
 *   - Sin padding: EMP1, EMP42
 *
 * IMPORTANTE: Este script NO modifica datos automáticamente.
 * Solo REPORTA números corruptos y sugiere correcciones.
 */

import { PrismaClient } from "@prisma/client";

import { formatEmployeeNumber } from "../src/lib/employee-numbering";

const prisma = new PrismaClient();

interface CorruptedEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  orgId: string;
  prefix: string;
  numericPart: string;
  correctNumber: string;
  issue: string;
}

/**
 * Analiza un número de empleado y detecta si está corrupto
 */
function analyzeEmployeeNumber(employeeNumber: string, orgPrefix: string): CorruptedEmployee | null {
  // Extraer parte numérica (quitar todas las letras)
  const numericPart = employeeNumber.replace(/[A-Z]/g, "");

  // Detectar problemas
  const issues: string[] = [];

  // 1. Longitud incorrecta (debe ser exactamente 5 dígitos)
  if (numericPart.length !== 5) {
    issues.push(`Longitud incorrecta: ${numericPart.length} dígitos (esperados: 5)`);
  }

  // 2. Prefijo no coincide con el de la organización
  const prefix = employeeNumber.replace(/[0-9]/g, "");
  if (prefix !== orgPrefix) {
    issues.push(`Prefijo incorrecto: "${prefix}" (esperado: "${orgPrefix}")`);
  }

  // Si no hay problemas, retornar null
  if (issues.length === 0) {
    return null;
  }

  // Calcular número correcto
  const parsedNumber = parseInt(numericPart, 10);
  const correctNumber = formatEmployeeNumber(orgPrefix, parsedNumber);

  return {
    id: "",
    employeeNumber,
    firstName: "",
    lastName: "",
    orgId: "",
    prefix,
    numericPart,
    correctNumber,
    issue: issues.join(", "),
  };
}

/**
 * Escanea y reporta números de empleado corruptos
 */
async function scanCorruptedEmployeeNumbers(dryRun: boolean = true) {
  console.log("🔍 Escaneando números de empleado...\n");

  // Obtener todas las organizaciones con su prefijo
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      employeeNumberPrefix: true,
    },
  });

  let totalCorrupted = 0;
  const corruptedByOrg: Record<string, CorruptedEmployee[]> = {};

  for (const org of organizations) {
    const prefix = org.employeeNumberPrefix ?? "EMP";

    // Obtener todos los empleados de esta organización
    const employees = await prisma.employee.findMany({
      where: {
        orgId: org.id,
        employeeNumber: { not: null },
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        orgId: true,
      },
      orderBy: {
        employeeNumber: "asc",
      },
    });

    const corrupted: CorruptedEmployee[] = [];

    for (const employee of employees) {
      if (!employee.employeeNumber) continue;

      const analysis = analyzeEmployeeNumber(employee.employeeNumber, prefix);

      if (analysis) {
        corrupted.push({
          ...analysis,
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          orgId: employee.orgId,
        });
      }
    }

    if (corrupted.length > 0) {
      corruptedByOrg[org.name] = corrupted;
      totalCorrupted += corrupted.length;
    }
  }

  // Mostrar resultados
  if (totalCorrupted === 0) {
    console.log("✅ No se encontraron números de empleado corruptos.\n");
    return;
  }

  console.log(`❌ Se encontraron ${totalCorrupted} números de empleado con formato incorrecto:\n`);

  for (const [orgName, corrupted] of Object.entries(corruptedByOrg)) {
    console.log(`\n📊 Organización: ${orgName}`);
    console.log(`   ${corrupted.length} número(s) corrupto(s):\n`);

    for (const emp of corrupted) {
      console.log(`   👤 ${emp.firstName} ${emp.lastName}`);
      console.log(`      ❌ Actual: ${emp.employeeNumber}`);
      console.log(`      ✅ Correcto: ${emp.correctNumber}`);
      console.log(`      ⚠️ Problema: ${emp.issue}`);
      console.log("");
    }
  }

  // Si es dry-run, solo mostrar advertencia
  if (dryRun) {
    console.log("\n⚠️  MODO DRY-RUN: No se realizaron cambios.");
    console.log("\nPara CORREGIR estos números automáticamente, ejecuta:");
    console.log("  npx ts-node scripts/fix-employee-numbers.ts --fix\n");
    console.log("⚠️  ADVERTENCIA: Esto modificará la base de datos. Asegúrate de tener un backup.\n");
  } else {
    // Modo FIX: Aplicar correcciones
    console.log("\n🔧 Aplicando correcciones...\n");

    let fixed = 0;
    for (const corrupted of Object.values(corruptedByOrg).flat()) {
      try {
        await prisma.employee.update({
          where: { id: corrupted.id },
          data: {
            employeeNumber: corrupted.correctNumber,
            requiresEmployeeNumberReview: false, // Ya no requiere revisión
          },
        });

        console.log(
          `   ✅ Corregido: ${corrupted.employeeNumber} → ${corrupted.correctNumber} (${corrupted.firstName} ${corrupted.lastName})`,
        );
        fixed++;
      } catch (error) {
        console.error(`   ❌ Error al corregir ${corrupted.employeeNumber}:`, error);
      }
    }

    console.log(`\n✅ Se corrigieron ${fixed} de ${totalCorrupted} números de empleado.\n`);
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");

  try {
    await scanCorruptedEmployeeNumbers(!fix);
  } catch (error) {
    console.error("❌ Error durante la ejecución:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
