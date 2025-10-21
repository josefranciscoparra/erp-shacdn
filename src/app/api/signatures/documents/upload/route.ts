import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateHash } from "@/lib/signatures/hash";
import { signatureStorageService } from "@/lib/signatures/storage";

export const runtime = "nodejs";

/**
 * POST /api/signatures/documents/upload
 * Sube un PDF y crea un SignableDocument
 */
export async function POST(request: NextRequest) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId || !session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo HR_ADMIN, ORG_ADMIN y SUPER_ADMIN pueden subir documentos
    const allowedRoles = ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string | null;

    if (!file || !title || !category) {
      return NextResponse.json({ error: "Faltan campos requeridos (file, title, category)" }, { status: 400 });
    }

    // Validar que sea PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se permiten archivos PDF" }, { status: 400 });
    }

    // Validar tamaño (20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no puede superar 20MB" }, { status: 400 });
    }

    // Calcular hash del archivo
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileHash = calculateHash(fileBuffer);

    // Generar ID para el documento
    const documentId = crypto.randomUUID();

    // Subir a storage
    const uploadResult = await signatureStorageService.uploadOriginalDocument(session.user.orgId, documentId, file);

    // Crear documento en la BD
    // IMPORTANTE: Guardamos el path, no la url, para generar URLs firmadas después
    const document = await prisma.signableDocument.create({
      data: {
        title,
        description: description ?? undefined,
        category,
        originalFileUrl: uploadResult.path, // Guardamos el path para generar signed URLs
        originalHash: fileHash,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        version: 1,
        orgId: session.user.orgId,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(
      {
        document: {
          id: document.id,
          title: document.title,
          category: document.category,
          fileSize: document.fileSize,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Error al subir documento:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
