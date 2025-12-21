import { randomBytes } from "crypto";

import type { PgBoss } from "pg-boss";

import { prisma } from "@/lib/prisma";
import { getRecipientEmployees, resolveSecondSigner } from "@/lib/signatures/double-signature";
import { createSignaturePendingNotification } from "@/lib/signatures/notifications";
import { SIGNATURE_BATCH_ACTIVATE_JOB, type SignatureBatchActivatePayload } from "@/server/jobs/signature-batch-queue";

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

export async function registerSignatureBatchWorker(boss: PgBoss) {
  await boss.createQueue(SIGNATURE_BATCH_ACTIVATE_JOB);

  await boss.work<SignatureBatchActivatePayload>(SIGNATURE_BATCH_ACTIVATE_JOB, async (job) => {
    const payload = job.data;
    if (!payload) {
      throw new Error("Job sin payload para activación de firmas");
    }
    if (!payload.batchId || !payload.orgId) {
      throw new Error("Payload incompleto para activación de firmas");
    }

    const recipientsInput = uniqueIds(payload.recipientEmployeeIds ?? []);
    const additionalSignerIds = uniqueIds(payload.additionalSignerEmployeeIds ?? []);

    const batch = await prisma.signatureBatch.findFirst({
      where: {
        id: payload.batchId,
        orgId: payload.orgId,
      },
    });

    if (!batch) {
      throw new Error("Lote no encontrado");
    }

    if (batch.status !== "DRAFT") {
      console.warn(`[SignatureBatch] Lote ${batch.id} ignorado con estado ${batch.status}`);
      return;
    }

    try {
      const document = await prisma.signableDocument.findUnique({
        where: { id: batch.documentId },
      });

      if (!document) {
        throw new Error("Documento del lote no encontrado");
      }

      const recipients = await getRecipientEmployees(payload.orgId, recipientsInput);

      if (recipients.length === 0) {
        throw new Error("No hay empleados válidos para el lote");
      }

      const additionalSigners = additionalSignerIds.length
        ? await getRecipientEmployees(payload.orgId, additionalSignerIds)
        : [];

      if (additionalSigners.length < additionalSignerIds.length) {
        throw new Error("Uno o más firmantes adicionales no son válidos");
      }

      const additionalSignerMap = new Map(additionalSigners.map((signer) => [signer.id, signer]));

      const updatedBatch = await prisma.$transaction(async (tx) => {
        let pendingCount = 0;

        for (const recipient of recipients) {
          const signersData: Array<{
            employeeId: string;
            order: number;
          }> = [];
          const addedSignerIds = new Set<string>();

          const pushSigner = (employeeId: string) => {
            if (addedSignerIds.has(employeeId)) {
              return;
            }
            addedSignerIds.add(employeeId);
            signersData.push({
              employeeId,
              order: signersData.length + 1,
            });
          };

          pushSigner(recipient.id);

          let secondSignerMissing = false;

          if (batch.requireDoubleSignature && batch.secondSignerRole) {
            const secondSigner = await resolveSecondSigner(
              recipient.id,
              batch.secondSignerRole,
              batch.secondSignerUserId ?? undefined,
              payload.orgId,
              { fallbackUserId: payload.performedById },
            );

            if (secondSigner.missing || !secondSigner.userId || !secondSigner.employeeId) {
              secondSignerMissing = true;
            } else {
              pushSigner(secondSigner.employeeId);
            }
          }

          for (const signerId of additionalSignerIds) {
            const signer = additionalSignerMap.get(signerId);
            if (!signer) {
              continue;
            }
            pushSigner(signer.id);
          }

          const request = await tx.signatureRequest.create({
            data: {
              status: "PENDING",
              policy: "SES",
              expiresAt: batch.expiresAt,
              orgId: payload.orgId,
              documentId: batch.documentId,
              batchId: batch.id,
              secondSignerMissing,
              signers: {
                create: signersData.map((signer) => ({
                  order: signer.order,
                  status: "PENDING",
                  employeeId: signer.employeeId,
                  signToken: randomBytes(32).toString("hex"),
                })),
              },
            },
          });

          pendingCount += 1;

          await createSignaturePendingNotification({
            orgId: payload.orgId,
            userId: recipient.userId,
            documentTitle: document.title,
            requestId: request.id,
            expiresAt: batch.expiresAt,
          });
        }

        return await tx.signatureBatch.update({
          where: { id: batch.id },
          data: {
            status: "ACTIVE",
            totalRecipients: recipients.length,
            pendingCount,
            signedCount: 0,
            rejectedCount: 0,
          },
        });
      });

      await prisma.auditLog.create({
        data: {
          action: "SIGNATURE_BATCH_ACTIVATED",
          category: "SIGNATURE",
          entityId: updatedBatch.id,
          entityType: "SignatureBatch",
          description: `Lote de firmas activado (${updatedBatch.totalRecipients} destinatarios).`,
          performedById: payload.performedById,
          performedByEmail: payload.performedByEmail,
          performedByName: payload.performedByName ?? payload.performedByEmail,
          performedByRole: payload.performedByRole,
          orgId: payload.orgId,
        },
      });
    } catch (error) {
      await prisma.auditLog.create({
        data: {
          action: "SIGNATURE_BATCH_ACTIVATION_FAILED",
          category: "SIGNATURE",
          entityId: batch.id,
          entityType: "SignatureBatch",
          description:
            error instanceof Error
              ? `Error activando lote de firmas: ${error.message}`
              : "Error activando lote de firmas.",
          performedById: payload.performedById,
          performedByEmail: payload.performedByEmail,
          performedByName: payload.performedByName ?? payload.performedByEmail,
          performedByRole: payload.performedByRole,
          orgId: payload.orgId,
        },
      });
      throw error;
    }
  });
}
