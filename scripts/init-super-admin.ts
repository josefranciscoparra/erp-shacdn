/**
 * Script para crear usuario SUPER_ADMIN genérico
 * Ejecutar con: npx tsx scripts/init-super-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPER_ADMIN = {
  email: "superadmin@system.com",
  password: "Admin123!",
  name: "Super Admin",
  role: "SUPER_ADMIN" as const,
  active: true,
  mustChangePassword: true, // Forzar cambio en primer login
};

async function main() {
  console.log("👤 Inicializando usuario SUPER_ADMIN...\n");

  // Verificar si existe la organización
  const org = await prisma.organization.findFirst();

  if (!org) {
    console.log("❌ No se encontró ninguna organización.");
    console.log("   Ejecuta primero: npx tsx scripts/init-default-org.ts");
    process.exit(1);
  }

  console.log(`📁 Organización encontrada: ${org.name}`);

  // Verificar si ya existe el super admin
  const existing = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN.email },
  });

  if (existing) {
    console.log(`\n✅ Ya existe el usuario: ${existing.email}`);
    console.log(`   Nombre: ${existing.name}`);
    console.log(`   Role: ${existing.role}`);
    console.log(`   Activo: ${existing.active ? "Sí" : "No"}`);
    return;
  }

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, 10);

  // Crear super admin
  const admin = await prisma.user.create({
    data: {
      email: SUPER_ADMIN.email,
      password: hashedPassword,
      name: SUPER_ADMIN.name,
      role: SUPER_ADMIN.role,
      active: SUPER_ADMIN.active,
      mustChangePassword: SUPER_ADMIN.mustChangePassword,
      orgId: org.id,
    },
  });

  console.log(`\n✅ Usuario SUPER_ADMIN creado correctamente!`);
  console.log(`\n📝 Credenciales de acceso:`);
  console.log(`   Email: ${SUPER_ADMIN.email}`);
  console.log(`   Password: ${SUPER_ADMIN.password}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`\n⚠️  IMPORTANTE: El usuario deberá cambiar la contraseña en el primer login`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
