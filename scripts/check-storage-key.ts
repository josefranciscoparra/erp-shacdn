import "dotenv/config";

import { getStorageProvider } from "@/lib/storage";

async function main() {
  const key = process.argv[2];
  if (!key) {
    console.error("Uso: npx tsx scripts/check-storage-key.ts <storage-key>");
    process.exit(1);
  }

  const provider = getStorageProvider();
  const exists = await provider.exists(key);
  console.log(`exists=${exists} for ${key}`);
}

void main();
