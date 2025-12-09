import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArrowLeft, FileCheck, FileSignature, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { AuditTimeline } from "./_components/audit-timeline";

export default async function SignatureAuditPage({ params }: { params: Promise<{ id: string }> }) {
  if (!features.signatures) {
    redirect("/dashboard");
  }

  const session = await auth();
  if (!session?.user?.orgId) {
    redirect("/");
  }

  const { id } = await params;

  // Obtener la solicitud con todos los datos relacionados para auditoría
  const request = await prisma.signatureRequest.findUnique({
    where: { id },
    include: {
      document: true,
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
      signers: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
            },
          },
          evidence: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  // Verificar que pertenece a la organización
  if (request.orgId !== session.user.orgId) {
    notFound();
  }

  // Verificar permisos: HR/Admin pueden ver todas, empleados solo las suyas
  const allowedRoles = ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"];
  const isHrOrAdmin = allowedRoles.includes(session.user.role);
  const isSignerOnRequest = request.signers.some((s) => s.employee.id === session.user.employeeId);

  if (!isHrOrAdmin && !isSignerOnRequest) {
    notFound();
  }

  // Preparar datos para el componente de timeline
  const auditData = {
    requestId: request.id,
    documentTitle: request.document.title,
    documentDescription: request.document.description,
    documentCategory: request.document.category,
    documentVersion: request.document.version,
    requestStatus: request.status,
    requestPolicy: request.policy,
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
    completedAt: request.completedAt?.toISOString() ?? null,
    batchId: request.batchId,
    batchName: request.batch?.name ?? null,
    signers: request.signers.map((signer) => ({
      signerId: signer.id,
      signerName: `${signer.employee.firstName} ${signer.employee.lastName}`,
      signerEmail: signer.employee.email,
      order: signer.order,
      status: signer.status,
      signedAt: signer.signedAt?.toISOString() ?? null,
      rejectedAt: signer.rejectedAt?.toISOString() ?? null,
      rejectionReason: signer.rejectionReason,
      consentGivenAt: signer.consentGivenAt?.toISOString() ?? null,
      evidence: signer.evidence
        ? {
            id: signer.evidence.id,
            timeline: signer.evidence.timeline as Array<{
              event: string;
              timestamp: string;
              user?: string;
              details?: string;
            }>,
            preSignHash: signer.evidence.preSignHash,
            postSignHash: signer.evidence.postSignHash,
            signerMetadata: signer.evidence.signerMetadata as {
              ip?: string;
              userAgent?: string;
              geolocation?: {
                latitude?: number;
                longitude?: number;
                accuracy?: number;
              };
              sessionId?: string;
            },
            policy: signer.evidence.policy,
            result: signer.evidence.result,
            createdAt: signer.evidence.createdAt.toISOString(),
          }
        : null,
    })),
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/signatures/${id}`} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver al detalle
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <History className="text-primary h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Auditoría de Firma</h1>
              <p className="text-muted-foreground text-sm">Timeline completo y evidencia técnica de la solicitud</p>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/signatures/${id}`}>
              <FileSignature className="mr-2 h-4 w-4" />
              Ver solicitud
            </Link>
          </Button>
          {request.status === "COMPLETED" && request.document.signedFileUrl && (
            <Button variant="outline" size="sm" asChild>
              <Link href={request.document.signedFileUrl} target="_blank" rel="noopener noreferrer">
                <FileCheck className="mr-2 h-4 w-4" />
                Ver PDF firmado
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <AuditTimeline data={auditData} />
    </div>
  );
}
