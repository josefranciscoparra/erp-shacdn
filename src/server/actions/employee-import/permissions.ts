"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"];

export async function requireEmployeeImportPermission() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      orgId: true,
      role: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    throw new Error("No tienes permisos para importar empleados");
  }

  return user;
}
