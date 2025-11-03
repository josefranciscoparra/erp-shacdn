import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { getAuthenticatedEmployee } from "@/server/actions/shared/get-authenticated-employee";

/**
 * GET /api/expenses/[id]/attachments/[attachmentId]/download
 * Genera una URL firmada temporal para acceder a un adjunto de gasto
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id: expenseId, attachmentId } = await params;
    const { employee, user } = await getAuthenticatedEmployee();

    // Verificar que el adjunto existe
    const attachment = await prisma.expenseAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        expense: {
          include: {
            approvals: {
              select: {
                approverId: true,
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 });
    }

    // Verificar que el adjunto pertenece al gasto solicitado
    if (attachment.expenseId !== expenseId) {
      return NextResponse.json({ error: "Adjunto no pertenece a este gasto" }, { status: 400 });
    }

    // Validar permisos: solo el owner o el aprobador pueden ver los adjuntos
    const isOwner = attachment.expense.employeeId === employee.id;
    const isApprover = attachment.expense.approvals.some((approval) => approval.approverId === user.id);

    if (!isOwner && !isApprover) {
      return NextResponse.json({ error: "No tienes permisos para ver este adjunto" }, { status: 403 });
    }

    // Extraer el path del storage desde la URL
    // La URL guardada es del tipo: https://xxx.r2.cloudflarestorage.com/bucket-name/org-xxx/expenses/...
    // Necesitamos extraer solo la parte después del bucket
    const urlParts = attachment.url.split("/");
    const bucketIndex = urlParts.findIndex((part) => part.includes("r2.cloudflarestorage.com"));

    let filePath: string;
    if (bucketIndex >= 0) {
      // Tomar todo después del dominio/bucket
      filePath = urlParts.slice(bucketIndex + 2).join("/"); // +2 para saltar dominio y bucket
    } else {
      // Si no es URL de R2, asumir que ya es un path
      filePath = attachment.url;
    }

    // Generar URL firmada temporal (1 hora de expiración)
    const signedUrl = await documentStorageService.getDocumentUrl(filePath, 3600);

    return NextResponse.json({
      downloadUrl: signedUrl,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    });
  } catch (error) {
    console.error("Error al generar URL firmada para adjunto:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
