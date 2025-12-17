/**
 * Script de Reconciliacion de Storage
 *
 * Compara el valor de storageUsedBytes en Organization con la suma real
 * de archivos en StoredFile (excluyendo los marcados como deleted).
 *
 * Uso:
 *   npx ts-node scripts/reconcile-storage.ts [orgId]
 *   npx ts-node scripts/reconcile-storage.ts [orgId] --fix
 *   npx ts-node scripts/reconcile-storage.ts --all
 *   npx ts-node scripts/reconcile-storage.ts --all --fix
 *
 * Opciones:
 *   orgId     ID de la organizacion a auditar (opcional si se usa --all)
 *   --all     Auditar todas las organizaciones
 *   --fix     Corregir automaticamente las desviaciones encontradas
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ReconciliationResult {
  orgId: string;
  orgName: string;
  storedInOrg: bigint;
  calculatedFromFiles: bigint;
  deviation: bigint;
  deviationPercent: number;
  filesCount: number;
  fixed: boolean;
}

async function reconcileOrg(orgId: string, fix: boolean): Promise<ReconciliationResult> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, storageUsedBytes: true },
  });

  if (!org) {
    throw new Error(`Organizacion no encontrada: ${orgId}`);
  }

  // Sumar todos los archivos activos (no borrados)
  const aggregate = await prisma.storedFile.aggregate({
    where: {
      orgId,
      deletedAt: null,
    },
    _sum: { sizeBytes: true },
    _count: true,
  });

  // eslint-disable-next-line no-underscore-dangle
  const calculatedFromFiles = BigInt(aggregate._sum.sizeBytes ?? 0);
  const storedInOrg = org.storageUsedBytes;
  const deviation = storedInOrg - calculatedFromFiles;

  const deviationPercent =
    calculatedFromFiles > BigInt(0)
      ? Number((deviation * BigInt(10000)) / calculatedFromFiles) / 100
      : storedInOrg > BigInt(0)
        ? 100
        : 0;

  let fixed = false;

  if (fix && deviation !== BigInt(0)) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { storageUsedBytes: calculatedFromFiles },
    });
    fixed = true;
  }

  return {
    orgId: org.id,
    orgName: org.name,
    storedInOrg,
    calculatedFromFiles,
    deviation,
    deviationPercent,
    filesCount: aggregate._count,
    fixed,
  };
}

function formatBytes(bytes: bigint): string {
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function printResult(result: ReconciliationResult): void {
  const status = result.deviation === BigInt(0) ? "OK" : result.fixed ? "FIXED" : "DESVIACION";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Organizacion: ${result.orgName} (${result.orgId})`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Archivos activos:     ${result.filesCount}`);
  console.log(`  Storage en Org:       ${formatBytes(result.storedInOrg)}`);
  console.log(`  Calculado de files:   ${formatBytes(result.calculatedFromFiles)}`);
  console.log(`  Desviacion:           ${formatBytes(result.deviation)} (${result.deviationPercent.toFixed(2)}%)`);
  console.log(`  Estado:               ${status}`);

  if (result.deviation !== BigInt(0) && !result.fixed) {
    console.log(`\n  [!] Para corregir, ejecutar con --fix`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");
  const all = args.includes("--all");
  const orgId = args.find((arg) => !arg.startsWith("--"));

  console.log("\n===== RECONCILIACION DE STORAGE =====\n");
  console.log(`Modo: ${fix ? "CORRECCION ACTIVA" : "SOLO LECTURA"}`);

  const results: ReconciliationResult[] = [];

  if (all) {
    const orgs = await prisma.organization.findMany({
      select: { id: true },
      orderBy: { name: "asc" },
    });

    console.log(`Auditando ${orgs.length} organizaciones...\n`);

    for (const org of orgs) {
      try {
        const result = await reconcileOrg(org.id, fix);
        results.push(result);
        printResult(result);
      } catch (error) {
        console.error(`Error auditando ${org.id}:`, error);
      }
    }
  } else if (orgId) {
    const result = await reconcileOrg(orgId, fix);
    results.push(result);
    printResult(result);
  } else {
    console.log("Uso:");
    console.log("  npx ts-node scripts/reconcile-storage.ts [orgId]");
    console.log("  npx ts-node scripts/reconcile-storage.ts [orgId] --fix");
    console.log("  npx ts-node scripts/reconcile-storage.ts --all");
    console.log("  npx ts-node scripts/reconcile-storage.ts --all --fix");
    process.exit(1);
  }

  // Resumen final
  console.log(`\n${"=".repeat(60)}`);
  console.log("RESUMEN");
  console.log(`${"=".repeat(60)}`);

  const withDeviation = results.filter((r) => r.deviation !== BigInt(0));
  const fixed = results.filter((r) => r.fixed);

  console.log(`  Total organizaciones: ${results.length}`);
  console.log(`  Sin desviacion:       ${results.length - withDeviation.length}`);
  console.log(`  Con desviacion:       ${withDeviation.length}`);

  if (fix) {
    console.log(`  Corregidas:           ${fixed.length}`);
  }

  if (withDeviation.length > 0 && !fix) {
    console.log("\n  [!] Ejecutar con --fix para corregir las desviaciones.");
  }

  console.log("");
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
