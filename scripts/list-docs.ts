import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const documents = await prisma.employeeDocument.findMany({
    where: { kind: "PAYSLIP" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      fileName: true,
      storageUrl: true,
      createdAt: true,
      employeeId: true,
    },
  });
  console.log(documents);
  await prisma.$disconnect();
}

void main();
