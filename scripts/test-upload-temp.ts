import "dotenv/config";

import { documentStorageService } from "@/lib/storage";

async function main() {
  const orgId = process.argv[2];
  const batchId = process.argv[3];
  if (!orgId || !batchId) {
    console.error("Uso: npx tsx scripts/test-upload-temp.ts <orgId> <batchId>");
    process.exit(1);
  }

  const buffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
  const result = await documentStorageService.uploadPayslipTempFile(orgId, batchId, "test.pdf", buffer);
  console.log(result);
}

void main();
