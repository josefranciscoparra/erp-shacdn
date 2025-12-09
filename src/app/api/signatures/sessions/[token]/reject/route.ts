import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addRejectionEvent, buildSignatureEvidence, createInitialTimeline } from "@/lib/signatures/evidence-builder";
import { createSignatureRejectedNotification, notifyDocumentRejected } from "@/lib/signatures/notifications";
import { signatureStorageService } from "@/lib/signatures/storage";
import { rejectSignatureSchema } from "@/lib/validations/signature";
import { updateBatchStats } from "@/server/actions/signature-batch";

export const runtime = "nodejs";

/**
 * POST /api/signatures/sessions/[token]/reject
 * Rechaza la firma de un documento
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
    const data = rejectSignatureSchema.parse({
      signToken: token,
      reason: body.reason,
    });

    // Buscar el firmante
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
            document: {
              select: {
                id: true,
                title: true,
                originalHash: true,
              },
            },
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

    const previousPending = signer.request.signers
      .filter((s) => s.order < signer.order)
      .some((s) => s.status !== "SIGNED");

    if (previousPending) {
      return NextResponse.json({ error: "Aún no es tu turno para gestionar esta firma" }, { status: 409 });
    }

    // Crear línea de tiempo para evidencias
    const timeline = createInitialTimeline({
      documentTitle: signer.request.document.title,
      requestedBy: "HR",
      signers: signer.request.signers.map((s) => `${s.employee?.firstName ?? ""} ${s.employee?.lastName ?? ""}`),
    });

    const finalTimeline = addRejectionEvent(
      timeline,
      `${signer.employee.firstName} ${signer.employee.lastName}`,
      data.reason,
    );

    // Construir evidencia de rechazo
    const evidence = buildSignatureEvidence({
      timeline: finalTimeline,
      preSignHash: signer.request.document.originalHash,
      postSignHash: null,
      signerInfo: {
        name: `${signer.employee.firstName} ${signer.employee.lastName}`,
        email: signer.employee.email ?? undefined,
      },
      ipAddress: signer.ipAddress,
      userAgent: signer.userAgent,
      policy: signer.request.policy,
      result: "REJECTED",
      consentTimestamp: signer.consentGivenAt ?? undefined,
      signatureTimestamp: undefined,
    });

    // Subir evidencias al storage
    await signatureStorageService.uploadEvidence(session.user.orgId, signer.request.document.id, signer.id, evidence);

    // Actualizar el firmante en la base de datos
    const now = new Date();
    await prisma.signer.update({
      where: { id: signer.id },
      data: {
        status: "REJECTED",
        rejectedAt: now,
        rejectionReason: data.reason,
      },
    });

    // Crear evidencia en la base de datos
    await prisma.signatureEvidence.create({
      data: {
        requestId: signer.requestId,
        signerId: signer.id,
        timeline: evidence.timeline as any,
        preSignHash: evidence.preSignHash,
        postSignHash: null,
        signerMetadata: evidence.signerMetadata as any,
        policy: evidence.policy,
        result: evidence.result,
      },
    });

    // Actualizar estado de la solicitud a REJECTED
    await prisma.signatureRequest.update({
      where: { id: signer.requestId },
      data: {
        status: "REJECTED",
      },
    });

    if (signer.request.batchId) {
      await updateBatchStats(signer.request.batchId);
    }

    // Notificar a HR/Admins del rechazo
    const admins = await prisma.user.findMany({
      where: {
        orgId: session.user.orgId,
        role: { in: ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"] },
      },
      select: { id: true },
    });

    await notifyDocumentRejected({
      orgId: session.user.orgId,
      adminUserIds: admins.map((a) => a.id),
      documentTitle: signer.request.document.title,
      requestId: signer.requestId,
      signerName: `${signer.employee.firstName} ${signer.employee.lastName}`,
      reason: data.reason,
    });

    // Notificar al empleado
    const employeeUser = await prisma.user.findFirst({
      where: {
        orgId: session.user.orgId,
        email: signer.employee.email ?? undefined,
      },
    });

    if (employeeUser) {
      await createSignatureRejectedNotification({
        orgId: session.user.orgId,
        userId: employeeUser.id,
        documentTitle: signer.request.document.title,
        requestId: signer.requestId,
        reason: data.reason,
      });
    }

    return NextResponse.json({
      success: true,
      rejectedAt: now.toISOString(),
      reason: data.reason,
    });
  } catch (error) {
    console.error("❌ Error al rechazar firma:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
