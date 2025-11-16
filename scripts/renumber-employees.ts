/**
 * Script de renumeración de empleados con números corruptos
 *
 * Este script RENUMERA empleados que tienen números de empleado corruptos,
 * asignándoles números secuenciales correctos basados en su fecha de creación.
 *
 * Casos de uso:
 * - Números con formato incorrecto (más o menos de 5 dígitos)
 * - Números generados incorrectamente (timestamps, IDs aleatorios)
 * - Resetear numeración después de migración de datos
 *
 * IMPORTANTE: Este script SÍ modifica los números de empleado.
 * - Modo DRY-RUN (default): Solo muestra qué cambios se harían
 * - Modo FIX: Aplica los cambios en la base de datos
 */

import { PrismaClient } from "@prisma/client";

// Importar directamente la función inline para evitar problemas de paths
function formatEmployeeNumber(prefix: string, counter: number, padding: number = 5): string {
  const paddedNumber = String(counter).padStart(padding, "0");
  return `${prefix}${paddedNumber}`;
}

const prisma = new PrismaClient();

interface RenumberCandidate {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  createdAt: Date;
  currentNumber: string;
  newNumber: string;
  reason: string;
}

/**
 * Determina si un número de empleado necesita renumeración
 */
function needsRenumbering(employeeNumber: string | null, orgPrefix: string): { needs: boolean; reason: string } {
  if (!employeeNumber) {
    return { needs: true, reason: "Sin número asignado" };
  }

  // Extraer parte numérica
  const numericPart = employeeNumber.replace(/[A-Z]/g, "");

  // 1. Longitud incorrecta
  if (numericPart.length !== 5) {
    return { needs: true, reason: `Longitud incorrecta: ${numericPart.length} dígitos (esperados: 5)` };
  }

  // 2. Prefijo incorrecto
  const prefix = employeeNumber.replace(/[0-9]/g, "");
  if (prefix !== orgPrefix) {
    return { needs: true, reason: `Prefijo incorrecto: "${prefix}" (esperado: "${orgPrefix}")` };
  }

  return { needs: false, reason: "" };
}

/**
 * Renumera empleados con números corruptos
 */
async function renumberEmployees(dryRun: boolean = true) {
  console.log("🔍 Escaneando empleados para renumeración...\\n");

  // Obtener todas las organizaciones
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      employeeNumberPrefix: true,
    },
  });

  let totalToRenumber = 0;
  const candidatesByOrg: Record<string, RenumberCandidate[]> = {};

  for (const org of organizations) {
    const prefix = org.employeeNumberPrefix ?? "EMP";

    // Obtener TODOS los empleados de la organización ordenados por fecha de creación
    const employees = await prisma.employee.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc", // Orden cronológico para mantener secuencia lógica
      },
    });

    const candidates: RenumberCandidate[] = [];

    // Analizar cada empleado
    for (let index = 0; index < employees.length; index++) {
      const employee = employees[index];
      const check = needsRenumbering(employee.employeeNumber, prefix);

      if (check.needs) {
        // Este empleado necesita renumeración
        const newSequentialNumber = index + 1; // Basado en su posición cronológica
        const newNumber = formatEmployeeNumber(prefix, newSequentialNumber);

        candidates.push({
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          firstName: employee.firstName,
          lastName: employee.lastName,
          createdAt: employee.createdAt,
          currentNumber: employee.employeeNumber ?? "Sin asignar",
          newNumber,
          reason: check.reason,
        });
      }
    }

    if (candidates.length > 0) {
      candidatesByOrg[org.name] = candidates;
      totalToRenumber += candidates.length;
    }
  }

  // Mostrar resultados
  if (totalToRenumber === 0) {
    console.log("✅ No se encontraron empleados que requieran renumeración.\\n");
    return;
  }

  console.log(`⚠️  Se encontraron ${totalToRenumber} empleados que requieren renumeración:\\n`);

  for (const [orgName, candidates] of Object.entries(candidatesByOrg)) {
    console.log(`\\n📊 Organización: ${orgName}`);
    console.log(`   ${candidates.length} empleado(s) a renumerar:\\n`);

    for (const candidate of candidates) {
      console.log(`   👤 ${candidate.firstName} ${candidate.lastName}`);
      console.log(`      📅 Creado: ${candidate.createdAt.toISOString().split("T")[0]}`);
      console.log(`      ❌ Actual: ${candidate.currentNumber}`);
      console.log(`      ✅ Nuevo: ${candidate.newNumber}`);
      console.log(`      ⚠️ Razón: ${candidate.reason}`);
      console.log("");
    }
  }

  // Modo DRY-RUN
  if (dryRun) {
    console.log("\\n⚠️  MODO DRY-RUN: No se realizaron cambios.");
    console.log("\\nPara APLICAR esta renumeración, ejecuta:");
    console.log("  npx tsx scripts/renumber-employees.ts --fix\\n");
    console.log("⚠️  ADVERTENCIA: Esto modificará los números de empleado en la base de datos.\\n");
    return;
  }

  // Modo FIX: Aplicar renumeración
  console.log("\\n🔧 Aplicando renumeración...\\n");

  let renumbered = 0;
  let errors = 0;

  for (const candidates of Object.values(candidatesByOrg)) {
    for (const candidate of candidates) {
      try {
        await prisma.employee.update({
          where: { id: candidate.id },
          data: {
            employeeNumber: candidate.newNumber,
            requiresEmployeeNumberReview: false, // Ya no requiere revisión
          },
        });

        console.log(
          `   ✅ Renumerado: ${candidate.currentNumber} → ${candidate.newNumber} (${candidate.firstName} ${candidate.lastName})`,
        );
        renumbered++;
      } catch (error) {
        console.error(`   ❌ Error al renumerar ${candidate.currentNumber}:`, error);
        errors++;
      }
    }
  }

  console.log(`\\n✅ Renumeración completada:`);
  console.log(`   - Exitosos: ${renumbered}`);
  console.log(`   - Errores: ${errors}`);
  console.log(`   - Total: ${totalToRenumber}\\n`);
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");

  try {
    await renumberEmployees(!fix);
  } catch (error) {
    console.error("❌ Error durante la ejecución:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
