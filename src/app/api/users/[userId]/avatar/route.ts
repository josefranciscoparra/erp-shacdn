import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { extractAvatarStoragePath } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";
import { avatarUploadService } from "@/lib/storage/avatar-service";

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { userId } = params;

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

    if (storedUrl.startsWith("/uploads/")) {
      const redirectUrl = new URL(storedUrl, origin).toString();
      return NextResponse.redirect(redirectUrl, 302);
    }

    const storagePath = extractAvatarStoragePath(storedUrl);

    if (!storagePath) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Generar URL firmada válida por 24 horas
    const signedUrl = await avatarUploadService.getSignedAvatarUrl(storagePath, 24 * 60 * 60);
    const redirectUrl = new URL(signedUrl, origin).toString();

    // Caché de 24 horas en el navegador
    return NextResponse.redirect(redirectUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=86400, immutable", // 24 horas
      },
    });
  } catch (error) {
    console.error("❌ Error al obtener avatar:", error);
    return new NextResponse("Error al obtener avatar", { status: 500 });
  }
}
