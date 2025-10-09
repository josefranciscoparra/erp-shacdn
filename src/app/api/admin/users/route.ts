import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { generateTemporaryPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos de administrador
    if (!["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const status = searchParams.get("status"); // active, inactive, with-temp-password, all
    const skip = (page - 1) * limit;

    const orgId = session.user.orgId;

    // Construir filtros
    const where: any = { orgId };

    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    } else if (status === "with-temp-password") {
      where.temporaryPasswords = {
        some: {
          active: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      };
    }

    // Obtener usuarios con paginación
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              secondLastName: true,
              employeeNumber: true,
              employmentStatus: true,
            },
          },
          temporaryPasswords: {
            where: {
              active: true,
              expiresAt: {
                gt: new Date(),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              password: true,
              createdAt: true,
              expiresAt: true,
              reason: true,
              usedAt: true,
              createdBy: {
                select: {
                  name: true,
                },
              },
            },
          },
          sessions: {
            where: {
              expires: {
                gt: new Date(),
              },
            },
            orderBy: {
              expires: "desc",
            },
            take: 1,
            select: {
              expires: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos de administrador
    if (!["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, ...data } = body;

    const orgId = session.user.orgId;

    switch (action) {
      case "reset-password":
        return await resetUserPassword(userId, orgId, session.user.id, data.reason);

      case "change-role":
        return await changeUserRole(userId, orgId, data.role);

      case "toggle-active":
        return await toggleUserActive(userId, orgId);

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error en acción de usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Funciones auxiliares

async function resetUserPassword(userId: string, orgId: string, createdById: string, reason?: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, orgId },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          secondLastName: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  await prisma.$transaction(async (tx) => {
    // Desactivar contraseñas temporales anteriores
    await tx.temporaryPassword.updateMany({
      where: {
        userId,
        active: true,
      },
      data: {
        active: false,
      },
    });

    // Actualizar contraseña del usuario
    await tx.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    // Crear nueva contraseña temporal
    await tx.temporaryPassword.create({
      data: {
        orgId,
        userId,
        password: temporaryPassword,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        reason: reason ?? "Reset por administrador",
        notes: `Contraseña reseteada por administrador para ${user.employee?.firstName ?? user.name}`,
        createdById,
      },
    });
  });

  return NextResponse.json({
    message: "Contraseña reseteada exitosamente",
    temporaryPassword,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

async function changeUserRole(userId: string, orgId: string, newRole: string) {
  const validRoles = ["EMPLOYEE", "MANAGER", "HR_ADMIN", "ORG_ADMIN"];

  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, orgId },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  return NextResponse.json({
    message: "Rol actualizado exitosamente",
    newRole,
  });
}

async function toggleUserActive(userId: string, orgId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, orgId },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const newActiveStatus = !user.active;

  await prisma.user.update({
    where: { id: userId },
    data: { active: newActiveStatus },
  });

  return NextResponse.json({
    message: `Usuario ${newActiveStatus ? "activado" : "desactivado"} exitosamente`,
    active: newActiveStatus,
  });
}
