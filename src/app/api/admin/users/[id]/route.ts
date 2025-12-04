import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUserDeactivation } from "@/lib/user-validation";
import { canManageUsers } from "@/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[id] - Obtener detalles de un usuario
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!canManageUsers(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
    }

    const userId = params.id;
    const orgId = session.user.orgId;

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        orgId,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
            employeeNumber: true,
            employmentStatus: true,
            email: true,
            phone: true,
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
                email: true,
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
            sessionToken: true,
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id] - Actualizar usuario
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!canManageUsers(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
    }

    const userId = params.id;
    const orgId = session.user.orgId;
    const body = await request.json();

    // Verificar que el usuario exista
    const user = await prisma.user.findFirst({
      where: { id: userId, orgId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Actualizar solo campos permitidos
    const allowedUpdates: any = {};

    if (body.name !== undefined) {
      allowedUpdates.name = body.name;
    }

    if (body.email !== undefined) {
      // Verificar que el email no esté en uso por otro usuario
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: body.email,
          orgId,
          NOT: {
            id: userId,
          },
        },
      });

      if (existingEmail) {
        return NextResponse.json({ error: "El email ya está en uso por otro usuario" }, { status: 409 });
      }

      allowedUpdates.email = body.email;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: allowedUpdates,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Usuario actualizado exitosamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id] - Desactivar usuario
 * (No eliminación física, solo desactivación)
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!canManageUsers(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
    }

    const userId = params.id;
    const orgId = session.user.orgId;

    // Verificar que el usuario exista
    const user = await prisma.user.findFirst({
      where: { id: userId, orgId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Validar permisos para desactivar
    const validation = validateUserDeactivation(
      {
        id: session.user.id,
        role: session.user.role,
        orgId: session.user.orgId,
        email: session.user.email,
        name: session.user.name,
      },
      userId,
      user.role,
      user.orgId,
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 403 });
    }

    // Desactivar usuario (no eliminación física)
    const deactivatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        active: false,
      },
    });

    return NextResponse.json({
      message: "Usuario desactivado exitosamente",
      user: {
        id: deactivatedUser.id,
        email: deactivatedUser.email,
        active: deactivatedUser.active,
      },
    });
  } catch (error) {
    console.error("Error al desactivar usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
