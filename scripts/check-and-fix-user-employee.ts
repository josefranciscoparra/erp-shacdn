/**
 * Script para verificar y crear empleado para usuario
 * Ejecutar con: npx tsx scripts/check-and-fix-user-employee.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verificando usuarios sin empleado asociado...\n");

  // Obtener todos los usuarios
  const users = await prisma.user.findMany({
    include: {
      employee: true,
      organization: true,
    },
  });

  for (const user of users) {
    console.log(`\n📧 Usuario: ${user.email} (${user.name})`);
    console.log(`   Organización: ${user.organization.name}`);
    console.log(`   Rol: ${user.role}`);

    if (user.employee) {
      console.log(`   ✅ Ya tiene empleado asociado: ${user.employee.firstName} ${user.employee.lastName}`);

      // Verificar si tiene contrato activo
      const activeContract = await prisma.employmentContract.findFirst({
        where: {
          employeeId: user.employee.id,
          active: true,
        },
      });

      if (!activeContract) {
        console.log(`   ⚠️  El empleado NO tiene contrato activo. Creando uno...`);

        const contract = await prisma.employmentContract.create({
          data: {
            orgId: user.orgId,
            employeeId: user.employee.id,
            contractType: "INDEFINIDO",
            startDate: new Date("2024-01-01"), // Fecha de ejemplo
            weeklyHours: 40,
            grossSalary: 30000,
            active: true,
          },
        });

        console.log(`   ✅ Contrato creado correctamente`);
      } else {
        console.log(`   ✅ Tiene contrato activo desde: ${activeContract.startDate.toLocaleDateString()}`);
      }
    } else {
      console.log(`   ⚠️  NO tiene empleado asociado. Creando uno...`);

      // Crear empleado
      const employee = await prisma.employee.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          firstName: user.name.split(" ")[0] || user.name,
          lastName: user.name.split(" ").slice(1).join(" ") || "Apellido",
          nifNie: `${Math.random().toString().substring(2, 10)}X`, // NIF temporal
          email: user.email,
          employmentStatus: "ACTIVE",
          active: true,
        },
      });

      console.log(`   ✅ Empleado creado: ${employee.firstName} ${employee.lastName}`);

      // Crear contrato activo
      const contract = await prisma.employmentContract.create({
        data: {
          orgId: user.orgId,
          employeeId: employee.id,
          contractType: "INDEFINIDO",
          startDate: new Date("2024-01-01"), // Fecha de ejemplo
          weeklyHours: 40,
          grossSalary: 30000,
          active: true,
        },
      });

      console.log(`   ✅ Contrato activo creado desde: ${contract.startDate.toLocaleDateString()}`);
    }
  }

  console.log("\n\n🎉 Verificación completada!");
  console.log("Ahora todos los usuarios tienen empleado y contrato activo.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
