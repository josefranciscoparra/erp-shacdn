import { notFound, redirect } from "next/navigation";

import { Download, FileText } from "lucide-react";

import { SignatureStatusBadge, SignatureUrgencyBadge } from "@/components/signatures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { DownloadEvidenceButton } from "./_components/download-evidence-button";

export default async function SignatureRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!features.signatures) {
    redirect("/dashboard");
  }

  const session = await auth();
  if (!session?.user?.orgId) {
    redirect("/");
  }

  const { id } = await params;

  // Obtener la solicitud con todos los datos relacionados
  const request = await prisma.signatureRequest.findUnique({
    where: { id },
    include: {
      document: true,
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

  const signedCount = request.signers.filter((s) => s.status === "SIGNED").length;
  const totalCount = request.signers.length;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detalle de Solicitud de Firma</h1>
          <p className="text-muted-foreground text-sm">
            ID: <code className="bg-muted rounded px-1 py-0.5 text-xs">{request.id}</code>
          </p>
        </div>
      </div>

      {/* Card de información del documento */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {request.document.title}
              </CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="mr-2">
                  {request.document.category}
                </Badge>
                Versión {request.document.version}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SignatureStatusBadge status={request.status} />
              <SignatureUrgencyBadge expiresAt={request.expiresAt} />
            </div>
          </div>
        </CardHeader>
        {request.document.description && (
          <CardContent>
            <p className="text-muted-foreground text-sm">{request.document.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Card de información de la solicitud */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Solicitud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 @lg/main:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">Política de Firma</p>
              <p className="font-medium">
                {request.policy === "SEQUENTIAL"
                  ? "Secuencial"
                  : request.policy === "PARALLEL"
                    ? "Paralela"
                    : request.policy}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Progreso</p>
              <p className="font-medium">
                {signedCount} de {totalCount} firmado{totalCount === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Fecha de Creación</p>
              <p className="font-medium">
                {new Date(request.createdAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Fecha de Expiración</p>
              <p className="font-medium">
                {new Date(request.expiresAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de firmantes */}
      <Card>
        <CardHeader>
          <CardTitle>Firmantes ({totalCount})</CardTitle>
          <CardDescription>Lista de firmantes y sus estados de firma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {request.signers.map((signer, index) => (
              <div key={signer.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {signer.order}
                      </Badge>
                      <p className="font-medium">
                        {signer.employee.firstName} {signer.employee.lastName}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-sm">{signer.employee.email}</p>
                    {signer.signedAt && (
                      <p className="text-muted-foreground text-xs">
                        Firmado el{" "}
                        {new Date(signer.signedAt).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {signer.status === "SIGNED" ? (
                      <Badge variant="default" className="bg-green-600">
                        Firmado
                      </Badge>
                    ) : signer.status === "REJECTED" ? (
                      <Badge variant="destructive">Rechazado</Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                    {signer.status === "SIGNED" && <DownloadEvidenceButton signerId={signer.id} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
