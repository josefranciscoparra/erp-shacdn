import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { extractAvatarStoragePath } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";
import { avatarUploadService } from "@/lib/storage/avatar-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { userId } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        orgId: true,
        image: true,
      },
    });

    if (!targetUser?.image) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (targetUser.orgId !== session.user.orgId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const storedUrl = targetUser.image;
    const origin = request.nextUrl.origin;
    const acceptHeader = request.headers.get("accept") ?? "";
    const acceptsWebP = acceptHeader.includes("image/webp");

    if (storedUrl.startsWith("/uploads/")) {
      const redirectUrl = new URL(storedUrl, origin).toString();
      return NextResponse.redirect(redirectUrl, {
        status: 302,
        headers: {
          Vary: "Accept",
        },
      });
    }

    const storagePath = extractAvatarStoragePath(storedUrl);

    if (!storagePath) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const isWebpFile = storagePath.endsWith(".webp");

    // Bloque de conversión a PNG eliminado para forzar WebP
    // PROXY: Servimos la imagen directamente desde el servidor para evitar problemas de CORS/Redirección con next/image
    const avatarBuffer = await avatarUploadService.getAvatarBuffer(storagePath);

    // Determinar Content-Type basado en la extensión (aunque subimos todo como webp, soportamos legacy)
    let contentType = "image/webp";
    if (storagePath.endsWith(".png")) contentType = "image/png";
    if (storagePath.endsWith(".jpg") || storagePath.endsWith(".jpeg")) contentType = "image/jpeg";

    // Caché de 24 horas (86400s)
    return new NextResponse(avatarBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        Vary: "Accept",
      },
    });
  } catch (error) {
    console.error("❌ Error al obtener avatar:", error);
    return new NextResponse("Error al obtener avatar", { status: 500 });
  }
}
