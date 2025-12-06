import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { PAYSLIP_ADMIN_ROLES } from "@/lib/payslip/config";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

/**
 * GET /api/payslips/items/[id]/preview
 * Devuelve URL firmada para preview del PDF
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!PAYSLIP_ADMIN_ROLES.includes(role as (typeof PAYSLIP_ADMIN_ROLES)[number])) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { id } = await params;

    const item = await prisma.payslipUploadItem.findFirst({
      where: { id, orgId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    const storage = getStorageProvider();
    const signedUrl = await storage.getSignedUrl(item.tempFilePath, {
      expiresIn: 3600, // 1 hora
      operation: "read",
    });

    return NextResponse.json({
      success: true,
      url: signedUrl,
      fileName: item.originalFileName,
    });
  } catch (error) {
    console.error("Error al obtener preview:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
