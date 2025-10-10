import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const changePasswordSchema = z.object({
  userId: z.string().cuid(),
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un símbolo"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validar entrada
    const validated = changePasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { message: "Datos inválidos", errors: validated.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { userId, currentPassword, newPassword } = validated.data;

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        active: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar contraseña actual
    const passwordValid = await bcrypt.compare(currentPassword, user.password);
    if (!passwordValid) {
      return NextResponse.json({ message: "Contraseña actual incorrecta" }, { status: 400 });
    }

    // Verificar que la nueva contraseña sea diferente
    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return NextResponse.json({ message: "La nueva contraseña debe ser diferente a la actual" }, { status: 400 });
    }

    // Hash de la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y quitar flag mustChangePassword
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Contraseña cambiada exitosamente para usuario: ${user.email}`);

    return NextResponse.json({
      message: "Contraseña cambiada exitosamente",
    });
  } catch (error) {
    console.error("❌ Error al cambiar contraseña:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
