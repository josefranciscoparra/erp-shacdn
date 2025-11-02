import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addSignatureEvent,
  buildSignatureEvidence,
  createInitialTimeline,
  createTimelineEvent,
} from "@/lib/signatures/evidence-builder";
import { calculateHash } from "@/lib/signatures/hash";
import { createSignatureCompletedNotification, notifyDocumentCompleted } from "@/lib/signatures/notifications";
import { generateSignatureMetadata, signPdfDocument } from "@/lib/signatures/pdf-signer";
import { signatureStorageService } from "@/lib/signatures/storage";
import { resolveSignatureStoragePath } from "@/lib/signatures/storage-utils";
import { confirmSignatureSchema } from "@/lib/validations/signature";

export const runtime = "nodejs";

/**
 * POST /api/signatures/sessions/[token]/confirm
 * Confirma y ejecuta la firma del documento (paso 2 del flujo)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { token } = await params;
    const body = await request.json();

    // Validar datos
    const data = confirmSignatureSchema.parse({
      signToken: token,
      ipAddress: body.ipAddress,
      userAgent: body.userAgent,
    });

    // Buscar el firmante con toda la información necesaria
    const signer = await prisma.signer.findUnique({
      where: { signToken: token },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        request: {
          include: {
            document: true,
            signers: {
              orderBy: { order: "asc" },
              include: {
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!signer) {
      return NextResponse.json({ error: "Sesión de firma no encontrada" }, { status: 404 });
    }

    // Verificar que el usuario logueado es el firmante
    if (signer.employee.email !== session.user.email) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Verificar que no esté expirada
    if (signer.request.expiresAt < new Date()) {
      return NextResponse.json({ error: "Solicitud expirada" }, { status: 410 });
    }

    // Verificar estado
    if (signer.status !== "PENDING") {
      return NextResponse.json({ error: "Esta firma ya fue procesada" }, { status: 400 });
    }

    // Verificar que se haya dado consentimiento
    if (!signer.consentGivenAt) {
      return NextResponse.json({ error: "Debe dar consentimiento antes de firmar" }, { status: 400 });
    }

    // PROCESO DE FIRMA
    // 1. Obtener el documento original
    const documentPath = resolveSignatureStoragePath(signer.request.document.originalFileUrl);
    const originalDocUrl = await signatureStorageService.getDocumentUrl(documentPath);
    const originalDocResponse = await fetch(originalDocUrl);
    const originalDocBuffer = Buffer.from(await originalDocResponse.arrayBuffer());

    // 2. Calcular hash del documento original
    const preSignHash = calculateHash(originalDocBuffer);

    // Verificar integridad del documento
    if (preSignHash !== signer.request.document.originalHash) {
      return NextResponse.json({ error: "El documento ha sido modificado y no puede ser firmado" }, { status: 400 });
    }

    // 3. Generar metadatos de firma
    const signatureMetadata = generateSignatureMetadata(
      {
        name: `${signer.employee.firstName} ${signer.employee.lastName}`,
        email: signer.employee.email ?? undefined,
      },
      preSignHash,
      signer.request.policy,
      data.ipAddress,
      data.userAgent,
    );

    // 4. "Firmar" el documento (por ahora, mantener el original)
    const { signedFileBuffer, signedFileHash } = await signPdfDocument(originalDocBuffer, signatureMetadata);

    // 5. Subir documento firmado al storage
    const signedDocUpload = await signatureStorageService.uploadSignedDocument(
      session.user.orgId,
      signer.request.document.id,
      signer.id,
      signedFileBuffer,
      signer.request.document.title + ".pdf",
      {
        signerName: signatureMetadata.signerName,
        signedAt: signatureMetadata.signedAt,
      },
    );

    // 6. Crear línea de tiempo para evidencias
    const timeline = createInitialTimeline({
      documentTitle: signer.request.document.title,
      requestedBy: "HR",
      signers: signer.request.signers.map((s) => `${s.employee?.firstName ?? ""} ${s.employee?.lastName ?? ""}`),
    });

    const timelineWithConsent = [
      ...timeline,
      createTimelineEvent("CONSENT_GIVEN", `${signer.employee.firstName} ${signer.employee.lastName}`),
    ];

    const finalTimeline = addSignatureEvent(
      timelineWithConsent,
      `${signer.employee.firstName} ${signer.employee.lastName}`,
      signedFileHash,
    );

    // 7. Construir evidencia completa
    const evidence = buildSignatureEvidence({
      timeline: finalTimeline,
      preSignHash,
      postSignHash: signedFileHash,
      signerInfo: {
        name: `${signer.employee.firstName} ${signer.employee.lastName}`,
        email: signer.employee.email ?? undefined,
      },
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      policy: signer.request.policy,
      result: "SUCCESS",
      consentTimestamp: signer.consentGivenAt ?? undefined,
      signatureTimestamp: new Date(),
    });

    // 8. Subir evidencias al storage
    await signatureStorageService.uploadEvidence(session.user.orgId, signer.request.document.id, signer.id, evidence);

    // 9. Actualizar el firmante en la base de datos
    const now = new Date();
    await prisma.signer.update({
      where: { id: signer.id },
      data: {
        status: "SIGNED",
        signedAt: now,
        signedFileUrl: signedDocUpload.path,
        signedHash: signedFileHash,
      },
    });

    // 10. Crear evidencia en la base de datos
    await prisma.signatureEvidence.create({
      data: {
        requestId: signer.requestId,
        signerId: signer.id,
        timeline: evidence.timeline as any,
        preSignHash: evidence.preSignHash,
        postSignHash: evidence.postSignHash,
        signerMetadata: evidence.signerMetadata as any,
        policy: evidence.policy,
        result: evidence.result,
      },
    });

    // 11. Verificar si todos los firmantes han firmado
    const allSigners = signer.request.signers;
    const signedCount = allSigners.filter((s) => s.status === "SIGNED").length + 1; // +1 por el actual
    const allSigned = signedCount === allSigners.length;

    // 12. Actualizar estado de la solicitud si es necesario
    if (allSigned) {
      await prisma.signatureRequest.update({
        where: { id: signer.requestId },
        data: {
          status: "COMPLETED",
          completedAt: now,
        },
      });

      // Notificar a HR/Admins que el documento está completamente firmado
      const admins = await prisma.user.findMany({
        where: {
          orgId: session.user.orgId,
          role: { in: ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"] },
        },
        select: { id: true },
      });

      await notifyDocumentCompleted({
        orgId: session.user.orgId,
        adminUserIds: admins.map((a) => a.id),
        documentTitle: signer.request.document.title,
        requestId: signer.requestId,
      });
    } else {
      // Actualizar a IN_PROGRESS si hay al menos una firma
      await prisma.signatureRequest.update({
        where: { id: signer.requestId },
        data: {
          status: "IN_PROGRESS",
        },
      });
    }

    // 13. Notificar al creador del documento que alguien firmó (solo si no es él mismo)
    if (signer.request.createdByUserId && signer.request.createdByUserId !== session.user.id) {
      await createSignatureCompletedNotification({
        orgId: session.user.orgId,
        userId: signer.request.createdByUserId,
        documentTitle: signer.request.document.title,
        requestId: signer.requestId,
        signerName: `${signer.employee.firstName} ${signer.employee.lastName}`,
      });
    }

    return NextResponse.json({
      success: true,
      signedAt: now.toISOString(),
      signedFileUrl: signedDocUpload.url,
      allCompleted: allSigned,
    });
  } catch (error) {
    console.error("❌ Error al confirmar firma:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
