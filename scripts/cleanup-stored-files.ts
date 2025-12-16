import { PrismaClient } from "@prisma/client";

import { documentStorageService } from "@/lib/storage";
import { finalizeStoredFileDeletion, hasRetentionExpired } from "@/lib/storage/storage-ledger";

const prisma = new PrismaClient();
const BATCH_SIZE = Number(process.env.STORAGE_CLEANUP_BATCH ?? 50);

async function main() {
  const now = new Date();
  const files = await prisma.storedFile.findMany({
    where: {
      deletedAt: {
        not: null,
      },
      legalHold: false,
      retainUntil: {
        lte: now,
      },
    },
    orderBy: {
      deletedAt: "asc",
    },
    take: BATCH_SIZE,
  });

  if (files.length === 0) {
    console.log("✅ No hay archivos pendientes de purga");
    return;
  }

  console.log(`🧹 Purga de almacenamiento: procesando ${files.length} archivos`);

  for (const file of files) {
    try {
      if (!hasRetentionExpired(file, now)) {
        console.log(`⏭️  Retención activa para ${file.id}, se omitirá hasta ${file.retainUntil?.toISOString()}`);
        continue;
      }

      await documentStorageService.deleteDocument(file.path);
      await finalizeStoredFileDeletion(file);

      console.log(`✅ Archivo ${file.id} eliminado y contador actualizado`);
    } catch (error) {
      console.error(`❌ Error al purgar archivo ${file.id}:`, error);
    }
  }
}

main()
  .catch((error) => {
    console.error("❌ Error en cleanup de storage:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
