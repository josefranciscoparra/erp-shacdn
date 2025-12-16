import "dotenv/config";

import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

async function main() {
  const batchId = process.argv[2];
  if (!batchId) {
    console.error("Uso: npx tsx scripts/debug-payslip-temp.ts <batchId>");
    process.exit(1);
  }

  const storageProvider = getStorageProvider();
  console.log(`Storage provider: ${storageProvider.constructor.name}`);

  const items = await prisma.payslipUploadItem.findMany({
    where: { batchId },
    select: {
      id: true,
      tempFilePath: true,
      status: true,
      orgId: true,
    },
  });

  console.log(`Items encontrados: ${items.length}`);

  for (const item of items) {
    try {
      const exists = await storageProvider.exists(item.tempFilePath);
      console.log(`${item.id} | ${item.status} | ${item.tempFilePath} | exists=${exists}`);
    } catch (error) {
      console.error(`Error comprobando ${item.id}:`, error);
    }
  }

  await prisma.$disconnect();
}

void main();
