import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const batches = await prisma.payslipBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      originalFileName: true,
      status: true,
      readyCount: true,
      publishedCount: true,
    },
  });
  console.log(batches);
  await prisma.$disconnect();
}

void main();
