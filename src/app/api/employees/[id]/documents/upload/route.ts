import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { getFileCategoryForDocumentKind, getRetentionPolicyForDocumentKind } from "@/lib/storage/retention-policies";
import { registerStoredFile } from "@/lib/storage/storage-ledger";
import { documentKindSchema, documentKindLabels } from "@/lib/validations/document";
import { createNotification } from "@/server/actions/notifications";
import {
  cancelReservation,
  commitReservation,
  reserveStorage,
  StorageQuotaExceededError,
} from "@/server/storage/quota";

// Schema para validar form data
const uploadFormSchema = z.object({
  documentKind: documentKindSchema,
  description: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!features.documents) {
    return NextResponse.json({ error: "El módulo de documentos está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: employeeId } = await params;

    // Validar que el empleado existe y pertenece a la organización
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        orgId: session.user.orgId,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Obtener form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentKind = formData.get("documentKind") as string;
    const description = formData.get("description") as string | null;

    console.log("📄 Datos recibidos:", {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      documentKind,
    });

    // Validar archivo
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    // Validar datos del formulario
    const validationResult = uploadFormSchema.safeParse({
      documentKind,
      description: description ?? undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { documentKind: validDocumentKind, description: validDescription } = validationResult.data;

    // Validar archivo
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "El archivo es demasiado grande (máximo 10MB)" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Tipo de archivo no permitido. Solo se permiten PDF, DOC, DOCX, JPG, PNG, WEBP",
        },
        { status: 400 },
      );
    }

    // 1. Reservar espacio de storage ANTES de subir (control de cuota)
    let reservationId: string;
    try {
      reservationId = await reserveStorage(
        session.user.orgId,
        BigInt(file.size),
        session.user.id,
        `employee-doc-${employeeId}`,
      );
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
      // 2. Subir archivo al storage (sanitizar metadata para headers HTTP)
      const uploadedByName = session.user.name || session.user.email;
      const sanitizedUploadedBy = uploadedByName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\u0020-\u007E]/g, "");

      uploadResult = await documentStorageService.uploadEmployeeDocument(
        session.user.orgId,
        employeeId,
        file,
        validDocumentKind,
        {
          uploadedBy: sanitizedUploadedBy,
          uploadedById: session.user.id,
        },
      );

      const fileCategory = getFileCategoryForDocumentKind(validDocumentKind);
      const retentionPolicy = getRetentionPolicyForDocumentKind(validDocumentKind);
      const normalizedMimeType = uploadResult.mimeType ?? file.type ?? "application/octet-stream";
      const sizeBytes = uploadResult.size ?? file.size ?? 0;

      // 3. Guardar metadata en BD (con skipStorageIncrement porque ya reservamos)
      const document = await prisma.$transaction(async (tx) => {
        const storedFile = await registerStoredFile({
          orgId: session.user.orgId,
          employeeId,
          path: uploadResult!.path,
          sizeBytes,
          mimeType: normalizedMimeType,
          category: fileCategory,
          retentionPolicy,
          skipStorageIncrement: true, // Ya reservamos el espacio
          tx,
        });

        return tx.employeeDocument.create({
          data: {
            kind: validDocumentKind,
            fileName: file.name,
            storageUrl: uploadResult!.path,
            fileSize: sizeBytes,
            mimeType: normalizedMimeType,
            description: validDescription,
            orgId: session.user.orgId,
            employeeId,
            uploadedById: session.user.id,
            storedFileId: storedFile.id,
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      });

      // 4. Confirmar reserva (reserved → used)
      await commitReservation(reservationId);

      // Notificar al empleado si tiene usuario asociado
      if (employee.userId) {
        try {
          await createNotification(
            employee.userId,
            session.user.orgId,
            "DOCUMENT_UPLOADED",
            `Nuevo documento: ${documentKindLabels[validDocumentKind]}`,
            `${session.user.name || "Un administrador"} ha subido un documento de tipo ${documentKindLabels[validDocumentKind]} a tu perfil.`,
          );
        } catch (notificationError) {
          // No fallar la subida si falla la notificación
          console.error("⚠️ Error al enviar notificación de documento:", notificationError);
        }
      }

      // Transformar fechas para el cliente
      const transformedDocument = {
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      };

      return NextResponse.json({
        success: true,
        document: transformedDocument,
      });
    } catch (error) {
      // 5. Rollback: cancelar reserva
      await cancelReservation(reservationId);

      // Intentar borrar archivo del storage si ya se subió (best-effort)
      if (uploadResult?.path) {
        try {
          await documentStorageService.deleteDocument(uploadResult.path);
        } catch (deleteError) {
          console.error("⚠️ Error al eliminar archivo huérfano del storage:", deleteError);
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("❌ Error al subir documento:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack available");
    console.error("❌ Error message:", error instanceof Error ? error.message : String(error));

    // Manejar errores específicos del storage
    if (error instanceof Error) {
      if (error.message.includes("Tipo de archivo no permitido")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("demasiado grande")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      // Devolver el mensaje de error real en desarrollo
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
