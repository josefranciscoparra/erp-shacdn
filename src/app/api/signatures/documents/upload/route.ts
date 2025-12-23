import { NextRequest, NextResponse } from "next/server";

import { FileCategory, RetentionPolicy, Role } from "@prisma/client";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { calculateHash } from "@/lib/signatures/hash";
import { signatureStorageService } from "@/lib/signatures/storage";
import { registerStoredFile } from "@/lib/storage/storage-ledger";
import {
  cancelReservation,
  commitReservation,
  reserveStorage,
  StorageQuotaExceededError,
} from "@/server/storage/quota";

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

    const effectivePermissions = await computeEffectivePermissions({
      role: session.user.role as Role,
      orgId: session.user.orgId,
      userId: session.user.id,
    });

    if (!effectivePermissions.has("manage_documents")) {
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

    // 1. Reservar espacio de storage ANTES de subir (control de cuota)
    let reservationId: string;
    try {
      reservationId = await reserveStorage(session.user.orgId, BigInt(file.size), session.user.id, `signature-doc`);
    } catch (error) {
      if (error instanceof StorageQuotaExceededError) {
        return NextResponse.json(
          { error: "No hay espacio de almacenamiento suficiente. Contacta con tu administrador." },
          { status: 507 },
        );
      }
      throw error;
    }

    // Variable para tracking del upload (para rollback en caso de error)
    let uploadResult: { path: string; size?: number; mimeType?: string } | null = null;

    try {
      // Calcular hash del archivo
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileHash = calculateHash(fileBuffer);

      // Generar ID para el documento
      const documentId = crypto.randomUUID();

      // 2. Subir a storage
      uploadResult = await signatureStorageService.uploadOriginalDocument(session.user.orgId, documentId, file);

      const normalizedMimeType = uploadResult.mimeType ?? file.type ?? "application/pdf";
      const sizeBytes = uploadResult.size ?? file.size;

      // 3. Crear documento en la BD (con skipStorageIncrement porque ya reservamos)
      const document = await prisma.$transaction(async (tx) => {
        const storedFile = await registerStoredFile({
          orgId: session.user.orgId,
          path: uploadResult!.path,
          sizeBytes,
          mimeType: normalizedMimeType,
          category: FileCategory.SIGNATURE,
          retentionPolicy: RetentionPolicy.SIGNATURE,
          skipStorageIncrement: true, // Ya reservamos el espacio
          tx,
        });

        return tx.signableDocument.create({
          data: {
            title,
            description: description ?? undefined,
            category,
            originalFileUrl: uploadResult!.path,
            originalHash: fileHash,
            fileSize: sizeBytes,
            mimeType: normalizedMimeType,
            version: 1,
            orgId: session.user.orgId,
            createdById: session.user.id,
            storedFileId: storedFile.id,
          },
        });
      });

      // 4. Confirmar reserva (reserved → used)
      await commitReservation(reservationId);

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
      // 5. Rollback: cancelar reserva
      await cancelReservation(reservationId);

      // NOTA: No intentamos borrar el archivo subido porque signatureStorageService
      // no expone un método de delete individual. El archivo quedará huérfano
      // pero no cuenta contra la cuota (la reserva se canceló).
      if (uploadResult?.path) {
        console.warn("⚠️ Archivo huérfano en storage (reserva cancelada):", uploadResult.path);
      }

      throw error;
    }
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
