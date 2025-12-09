"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Documento firmado para mostrar en el expediente del empleado.
 * No duplica archivos, solo referencia a SignatureRequest existentes.
 */
export interface EmployeeSignedDocument {
  signatureRequestId: string;
  documentId: string;
  documentTitle: string;
  documentCategory: string;
  documentVersion: string;
  batchId: string | null;
  batchName: string | null;
  signedAt: string;
  signerStatus: string;
  downloadUrl: string | null;
}

/**
 * Obtiene los documentos firmados por un empleado.
 * No duplica archivos, solo referencia a SignatureRequest existentes.
 *
 * @param employeeId - ID del empleado
 * @returns Lista de documentos firmados
 */
export async function getEmployeeSignedDocuments(
  employeeId: string,
): Promise<{ success: true; data: EmployeeSignedDocument[] } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return { success: false, error: "No autorizado" };
    }

    // Verificar que el empleado pertenece a la organización
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { orgId: true },
    });

    if (!employee || employee.orgId !== session.user.orgId) {
      return { success: false, error: "Empleado no encontrado" };
    }

    // Buscar todos los Signers de este empleado que estén firmados
    const signers = await prisma.signer.findMany({
      where: {
        employeeId,
        status: "SIGNED",
      },
      include: {
        signatureRequest: {
          include: {
            document: true,
            batch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        signedAt: "desc",
      },
    });

    // Mapear a la estructura de salida
    const signedDocuments: EmployeeSignedDocument[] = signers.map((signer) => ({
      signatureRequestId: signer.signatureRequest.id,
      documentId: signer.signatureRequest.document.id,
      documentTitle: signer.signatureRequest.document.title,
      documentCategory: signer.signatureRequest.document.category,
      documentVersion: signer.signatureRequest.document.version,
      batchId: signer.signatureRequest.batch?.id ?? null,
      batchName: signer.signatureRequest.batch?.name ?? null,
      signedAt: signer.signedAt?.toISOString() ?? new Date().toISOString(),
      signerStatus: signer.status,
      downloadUrl: signer.signatureRequest.document.signedFileUrl,
    }));

    return { success: true, data: signedDocuments };
  } catch (error) {
    console.error("Error al obtener documentos firmados:", error);
    return { success: false, error: "Error al obtener documentos firmados" };
  }
}

/**
 * Obtiene el número de documentos firmados por un empleado.
 * Útil para mostrar badges en tabs.
 *
 * @param employeeId - ID del empleado
 * @returns Número de documentos firmados
 */
export async function getEmployeeSignedDocumentsCount(
  employeeId: string,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return { success: false, error: "No autorizado" };
    }

    // Verificar que el empleado pertenece a la organización
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { orgId: true },
    });

    if (!employee || employee.orgId !== session.user.orgId) {
      return { success: false, error: "Empleado no encontrado" };
    }

    // Contar Signers firmados de este empleado
    const count = await prisma.signer.count({
      where: {
        employeeId,
        status: "SIGNED",
      },
    });

    return { success: true, count };
  } catch (error) {
    console.error("Error al contar documentos firmados:", error);
    return { success: false, error: "Error al contar documentos firmados" };
  }
}
