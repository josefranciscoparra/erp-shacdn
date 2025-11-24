import { PrismaClient } from "@prisma/client";

import { getEffectiveSchedule } from "../src/lib/schedule-engine";

const prisma = new PrismaClient();

async function main() {
  const email = "hr@demo.com";
  console.log(`Searching for user ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!user || !user.employee) {
    console.error("User or employee not found");
    return;
  }

  console.log(`Found employee: ${user.employee.firstName} ${user.employee.lastName} (${user.employee.id})`);

  try {
    const date = new Date();
    console.log(`Calculating schedule for ${date.toISOString()}...`);
    const schedule = await getEffectiveSchedule(user.employee.id, date);
    console.log("Schedule calculated successfully:");
    console.log(JSON.stringify(schedule, null, 2));
  } catch (error) {
    console.error("ERROR calculating schedule:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
