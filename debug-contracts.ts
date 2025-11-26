import { prisma } from "./src/lib/prisma";

async function main() {
  // Fetch the first employee found (assuming single user dev env or I can filter by email if known)
  // For dev, usually I can look at all employees
  const employees = await prisma.employee.findMany({
    include: {
      user: true,
      employmentContracts: true,
    },
  });

  console.log("Found employees:", employees.length);

  for (const emp of employees) {
    console.log("------------------------------------------------");
    console.log(`Employee: ${emp.firstName} ${emp.lastName}`);
    console.log(`User Email: ${emp.user?.email}`);

    const activeContract = emp.employmentContracts.find((c) => c.active);
    if (activeContract) {
      console.log("Active Contract found:");
      console.log(`  Weekly Hours: ${activeContract.weeklyHours}`);
      console.log(`  Start Date: ${activeContract.startDate}`);
      console.log(`  Work Schedule Type: ${activeContract.workScheduleType}`);
    } else {
      console.log("No active contract found.");
    }
  }
}

main();
