import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/auth/verify-password
 * Verifica la contraseña del usuario actual sin hacer login
 * Usado para operaciones sensibles como ver IBAN
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
    }

    // Obtener usuario con contraseña
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar contraseña
    const isValid = await bcrypt.compare(password, user.password);

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error("Error al verificar contraseña:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
