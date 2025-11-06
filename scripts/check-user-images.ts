import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUserImages() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, image: true },
      take: 10,
    });

    console.log(`\nUsuarios en la base de datos (${users.length}):\n`);

    for (const user of users) {
      console.log(`${user.name} (${user.email})`);
      console.log(`  - Imagen: ${user.image ?? "❌ Sin imagen"}\n`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserImages();
