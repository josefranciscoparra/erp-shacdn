import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { extractAvatarStoragePath } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";
import { avatarUploadService } from "@/lib/storage/avatar-service";

export const runtime = "nodejs";

// eslint-disable-next-line complexity -- Endpoint con múltiples validaciones y fallback Safari
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

    if (!acceptsWebP && isWebpFile) {
      const avatarBuffer = await avatarUploadService.getAvatarBuffer(storagePath);
      const pngBuffer = await avatarUploadService.convertAvatarToPng(avatarBuffer);

      return new NextResponse(pngBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, must-revalidate",
          Vary: "Accept",
          "Content-Length": pngBuffer.length.toString(),
        },
      });
    }

    // Generar URL firmada válida por 24 horas
    const signedUrl = await avatarUploadService.getSignedAvatarUrl(storagePath, 24 * 60 * 60);
    const redirectUrl = new URL(signedUrl, origin).toString();

    // Caché de 24 horas con revalidación (compatible con Safari)
    // Removido 'immutable' porque Safari lo interpreta demasiado estrictamente
    // y no recarga la imagen incluso cuando cambia el parámetro ?v=timestamp
    // Con must-revalidate, Safari verificará si la imagen cambió después de 24h
    return NextResponse.redirect(redirectUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=86400, must-revalidate", // 24 horas
        Vary: "Accept",
      },
    });
  } catch (error) {
    console.error("❌ Error al obtener avatar:", error);
    return new NextResponse("Error al obtener avatar", { status: 500 });
  }
}
