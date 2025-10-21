"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { differenceInDays, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileSignature,
  FileText,
  Loader2,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import {
  SignatureConsentModal,
  SignatureConfirmModal,
  SignaturePdfViewer,
  SignatureUrgencyBadge,
} from "@/components/signatures";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useSignaturesStore } from "@/stores/signatures-store";

export default function SignPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const {
    currentSession,
    isLoadingSession,
    isSigning,
    fetchSessionByToken,
    giveConsent,
    confirmSignature,
    rejectSignature,
    clearSession,
  } = useSignaturesStore();

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Cargar sesión al montar
  useEffect(() => {
    if (token) {
      fetchSessionByToken(token);
    }

    return () => {
      clearSession();
    };
  }, [token, fetchSessionByToken, clearSession]);

  // Detectar IP y User Agent
  const getUserMetadata = () => {
    return {
      userAgent: navigator.userAgent,
      ipAddress: undefined, // La IP se obtiene en el servidor
    };
  };

  const handleGiveConsent = async () => {
    const metadata = getUserMetadata();
    const success = await giveConsent(token, metadata);
    if (success) {
      setShowConsentModal(false);
      // Recargar sesión para actualizar el estado
      await fetchSessionByToken(token);
    }
  };

  const handleConfirmSignature = async () => {
    const metadata = getUserMetadata();
    const success = await confirmSignature(token, metadata);
    if (success) {
      setShowConfirmModal(false);
      // Redirigir a mis firmas después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard/my-signatures");
      }, 2000);
    }
  };

  const handleRejectSignature = async () => {
    if (!rejectionReason.trim()) return;

    const success = await rejectSignature(token, rejectionReason);
    if (success) {
      setShowRejectDialog(false);
      // Redirigir a mis firmas después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard/my-signatures");
      }, 2000);
    }
  };

  // Loading state
  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-12 w-12 animate-spin" />
          <div>
            <p className="text-lg font-medium">Cargando documento...</p>
            <p className="text-muted-foreground text-sm">Verificando tu solicitud de firma</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - No session found
  if (!currentSession) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <XCircle className="text-destructive h-6 w-6" />
            </div>
            <CardTitle className="text-center">Solicitud no encontrada</CardTitle>
            <CardDescription className="text-center">El enlace de firma no es válido o ha expirado</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/my-signatures")} className="w-full">
              Ir a Mis Firmas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { status, document: doc, request, employee, consentGiven, allSigners } = currentSession;
  const isExpired = new Date(request.expiresAt) < new Date();
  const isSigned = status === "SIGNED";
  const isRejected = status === "REJECTED";
  const isPending = status === "PENDING" && !isExpired;

  const signedCount = allSigners.filter((s) => s.status === "SIGNED").length;
  const totalCount = allSigners.length;

  // Estado: Ya firmado
  if (isSigned) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="bg-success/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <CheckCircle2 className="text-success h-6 w-6" />
            </div>
            <CardTitle className="text-center">Documento firmado</CardTitle>
            <CardDescription className="text-center">Ya has firmado este documento exitosamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 space-y-2 rounded-lg p-4">
              <p className="text-sm font-medium">{doc.title}</p>
              <p className="text-muted-foreground text-xs">{doc.category}</p>
            </div>
            <Button onClick={() => router.push("/dashboard/my-signatures")} className="w-full">
              Ver mis firmas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado: Rechazado
  if (isRejected) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <XCircle className="text-destructive h-6 w-6" />
            </div>
            <CardTitle className="text-center">Firma rechazada</CardTitle>
            <CardDescription className="text-center">Has rechazado la firma de este documento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 space-y-2 rounded-lg p-4">
              <p className="text-sm font-medium">{doc.title}</p>
              <p className="text-muted-foreground text-xs">{doc.category}</p>
            </div>
            <Button onClick={() => router.push("/dashboard/my-signatures")} className="w-full">
              Ver mis firmas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado: Expirado
  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="bg-warning/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertCircle className="text-warning h-6 w-6" />
            </div>
            <CardTitle className="text-center">Solicitud expirada</CardTitle>
            <CardDescription className="text-center">El plazo para firmar este documento ha vencido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 space-y-2 rounded-lg p-4">
              <p className="text-sm font-medium">{doc.title}</p>
              <p className="text-muted-foreground text-xs">
                Expiró el {new Date(request.expiresAt).toLocaleDateString("es-ES")}
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard/my-signatures")} className="w-full">
              Ver mis firmas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado: Pendiente - Mostrar visor de firma
  return (
    <div className="bg-muted/30 min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileSignature className="text-primary h-6 w-6" />
              <h1 className="text-2xl font-semibold">Firma Electrónica</h1>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">Revisa y firma el documento a continuación</p>
          </div>
          <div className="flex items-center gap-2">
            <SignatureUrgencyBadge expiresAt={request.expiresAt} />
            {consentGiven && (
              <Badge variant="outline" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Consentimiento dado
              </Badge>
            )}
          </div>
        </div>

        {/* Alert si no ha dado consentimiento */}
        {!consentGiven && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acción requerida</AlertTitle>
            <AlertDescription>
              Debes leer el documento completo y dar tu consentimiento antes de poder firmarlo.
            </AlertDescription>
          </Alert>
        )}

        {/* Main content - Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna izquierda - PDF Viewer (2/3) */}
          <div className="lg:col-span-2">
            <SignaturePdfViewer pdfUrl={doc.originalFileUrl} title={doc.title} />
          </div>

          {/* Columna derecha - Info y acciones (1/3) */}
          <div className="space-y-4">
            {/* Información del documento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Información del documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">{doc.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{doc.category}</p>
                </div>

                {doc.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs">{doc.description}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Versión:</span>
                    <span className="font-medium">{doc.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tamaño:</span>
                    <span className="font-medium">{(doc.fileSize / 1024).toFixed(0)} KB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Política:</span>
                    <span className="font-medium">{request.policy === "ALL_MUST_SIGN" ? "Todos" : "Cualquiera"}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <div>
                    <p className="text-muted-foreground">Expira en:</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(request.expiresAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progreso de firmantes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Firmantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progreso de firmas</span>
                  <span className="text-sm font-medium">
                    {signedCount} / {totalCount}
                  </span>
                </div>

                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${(signedCount / totalCount) * 100}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {allSigners.map((signer) => (
                    <div key={signer.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {signer.employee.firstName} {signer.employee.lastName}
                      </span>
                      {signer.status === "SIGNED" && <CheckCircle2 className="text-success h-4 w-4" />}
                      {signer.status === "PENDING" && <div className="bg-muted-foreground h-2 w-2 rounded-full" />}
                      {signer.status === "REJECTED" && <XCircle className="text-destructive h-4 w-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Acciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!consentGiven ? (
                  <Button onClick={() => setShowConsentModal(true)} className="w-full" size="lg">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Dar Consentimiento
                  </Button>
                ) : (
                  <Button onClick={() => setShowConfirmModal(true)} className="w-full" size="lg" disabled={isSigning}>
                    {isSigning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Firmando...
                      </>
                    ) : (
                      <>
                        <FileSignature className="mr-2 h-4 w-4" />
                        Firmar Documento
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={() => setShowRejectDialog(true)}
                  variant="outline"
                  className="w-full"
                  disabled={isSigning}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar Firma
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modales */}
      <SignatureConsentModal
        open={showConsentModal}
        onOpenChange={setShowConsentModal}
        onConfirm={handleGiveConsent}
        documentTitle={doc.title}
        isLoading={isSigning}
      />

      <SignatureConfirmModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        onConfirm={handleConfirmSignature}
        documentTitle={doc.title}
        isLoading={isSigning}
      />

      {/* Modal de rechazo */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-destructive/10 rounded-full p-2">
                <XCircle className="text-destructive h-5 w-5" />
              </div>
              Rechazar Firma
            </DialogTitle>
            <DialogDescription>¿Estás seguro de que deseas rechazar la firma de este documento?</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="mb-1 text-sm font-medium">Documento:</p>
              <p className="text-muted-foreground text-sm">{doc.title}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Motivo del rechazo <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="reason"
                placeholder="Explica por qué rechazas firmar este documento..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-muted-foreground text-xs">Este motivo quedará registrado en el sistema.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isSigning}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSignature}
              disabled={!rejectionReason.trim() || isSigning}
            >
              {isSigning ? "Rechazando..." : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
