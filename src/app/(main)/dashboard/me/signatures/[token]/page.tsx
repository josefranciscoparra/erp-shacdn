"use client";

import { use, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import {
  SignatureConfirmModal,
  SignatureConsentModal,
  SignaturePdfViewer,
  SignatureStatusBadge,
  SignatureUrgencyBadge,
} from "@/components/signatures";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSignaturesStore } from "@/stores/signatures-store";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function SignatureViewerPage({ params }: PageProps) {
  const router = useRouter();
  const { token } = use(params);

  const {
    currentSession,
    isLoadingSession,
    isSigning,
    fetchSessionByToken,
    giveConsent,
    confirmSignature,
    rejectSignature,
    clearSession,
    downloadSignedDocument,
  } = useSignaturesStore();

  const [consentChecked, setConsentChecked] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSessionByToken(token);

    return () => {
      clearSession();
    };
  }, [token, fetchSessionByToken, clearSession]);

  const handleConsentClick = async () => {
    if (!consentChecked) {
      setShowConsentModal(true);
      return;
    }
  };

  const handleGiveConsent = async () => {
    const result = await giveConsent(token, {
      ipAddress: undefined, // Se puede obtener del cliente si es necesario
      userAgent: navigator.userAgent,
    });

    if (result) {
      setConsentChecked(true);
      setShowConsentModal(false);
    }
  };

  const handleSignClick = () => {
    if (!currentSession?.consentGiven) {
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSignature = async () => {
    const result = await confirmSignature(token, {
      ipAddress: undefined,
      userAgent: navigator.userAgent,
    });

    if (result) {
      setShowConfirmModal(false);
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/me/signatures");
      }, 3000);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason || rejectionReason.length < 10) {
      return;
    }

    const result = await rejectSignature(token, rejectionReason);

    if (result) {
      setShowRejectDialog(false);
      router.push("/dashboard/me/signatures");
    }
  };

  // Loading
  if (isLoadingSession) {
    return (
      <div className="@container/main flex min-h-[600px] items-center justify-center">
        <div className="space-y-2 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando documento...</p>
        </div>
      </div>
    );
  }

  // Error o no encontrado
  if (!currentSession) {
    return (
      <div className="@container/main flex min-h-[600px] items-center justify-center">
        <Card className="space-y-4 p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <div>
            <h2 className="text-lg font-semibold">Sesión no encontrada</h2>
            <p className="text-muted-foreground mt-1 text-sm">El enlace de firma no es válido o ha expirado</p>
          </div>
          <Button onClick={() => router.push("/dashboard/me/signatures")}>Volver a mis firmas</Button>
        </Card>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="@container/main flex min-h-[600px] items-center justify-center">
        <Card className="max-w-md space-y-4 p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <div>
            <h2 className="text-xl font-semibold">¡Documento firmado!</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Has firmado &quot;{currentSession.document.title}&quot; exitosamente
            </p>
            <p className="text-muted-foreground mt-1 text-xs">Redirigiendo...</p>
          </div>
        </Card>
      </div>
    );
  }

  const isSigned = currentSession.status === "SIGNED";
  const isRejected = currentSession.status === "REJECTED";
  const isAlreadyCompleted = isSigned || isRejected;
  const currentSigner = currentSession.allSigners.find((signer) => signer.id === currentSession.signerId);
  const signedTimestamp = currentSession.signedAt ?? currentSigner?.signedAt ?? null;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{currentSession.document.title}</h1>
            {currentSession.document.description && (
              <p className="text-muted-foreground mt-1 text-sm">{currentSession.document.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <SignatureUrgencyBadge expiresAt={currentSession.request.expiresAt} />
            <SignatureStatusBadge status={currentSession.request.status as any} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 @4xl/main:grid-cols-[1fr_350px]">
        {/* PDF Viewer */}
        <div>
          <SignaturePdfViewer pdfUrl={currentSession.document.originalFileUrl} title={currentSession.document.title} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Firmantes */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium">Firmantes ({currentSession.allSigners.length})</h3>
            <div className="space-y-2">
              {currentSession.allSigners.map((signer) => (
                <div key={signer.id} className="bg-muted/30 flex items-center justify-between rounded-md p-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">
                      {signer.employee.firstName} {signer.employee.lastName}
                    </p>
                    <p className="text-muted-foreground text-xs">Orden: {signer.order}</p>
                  </div>
                  <SignatureStatusBadge status={signer.status as any} />
                </div>
              ))}
            </div>
          </Card>

          {/* Resumen Legal */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium">Información Legal</h3>
            <div className="text-muted-foreground space-y-2 text-xs">
              <p>
                <strong>Política:</strong> {currentSession.request.policy}
              </p>
              <p>
                <strong>Vence:</strong>{" "}
                {new Date(currentSession.request.expiresAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p>
                <strong>Categoría:</strong> {currentSession.document.category}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer - Acciones de Firma */}
      {isAlreadyCompleted ? (
        <Card className="sticky bottom-0 z-10 space-y-4 p-6">
          <div>
            <h3 className="text-lg font-semibold">
              {isSigned ? "Ya has firmado este documento" : "Has rechazado este documento"}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {isSigned && signedTimestamp
                ? `Firmado el ${new Date(signedTimestamp).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}.`
                : null}
              {isRejected && currentSession.rejectionReason ? ` Motivo: ${currentSession.rejectionReason}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isSigned && (
              <Button
                variant="outline"
                onClick={() => void downloadSignedDocument(currentSession.request.id)}
                className="min-w-[180px] flex-1"
              >
                Descargar PDF firmado
              </Button>
            )}
            <Button
              variant="default"
              onClick={() => router.push("/dashboard/me/signatures")}
              className="min-w-[180px] flex-1"
            >
              Volver a mis firmas
            </Button>
          </div>
        </Card>
      ) : !showRejectDialog ? (
        <Card className="sticky bottom-0 z-10 space-y-4 p-6">
          {/* Checkbox de consentimiento */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="consent"
              checked={currentSession.consentGiven}
              onCheckedChange={(checked) => {
                if (checked && !currentSession.consentGiven) {
                  handleConsentClick();
                }
              }}
              disabled={currentSession.consentGiven}
            />
            <label htmlFor="consent" className="cursor-pointer text-sm leading-relaxed select-none">
              Declaro que he leído y comprendo el contenido de este documento, acepto sus términos y firmo de forma
              voluntaria. Esta firma electrónica tiene el mismo valor legal que una firma manuscrita.
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRejectDialog(true)} disabled={isSigning} className="flex-1">
              Rechazar
            </Button>
            <Button onClick={handleSignClick} disabled={!currentSession.consentGiven || isSigning} className="flex-1">
              {isSigning ? "Firmando..." : "Firmar Documento"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="sticky bottom-0 z-10 space-y-4 p-6">
          <div>
            <Label htmlFor="reason">Motivo del rechazo *</Label>
            <Textarea
              id="reason"
              placeholder="Explica por qué rechazas este documento (mínimo 10 caracteres)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="mt-2"
            />
            <p className="text-muted-foreground mt-1 text-xs">{rejectionReason.length}/500 caracteres</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              disabled={isSigning}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectionReason.length < 10 || isSigning}>
              Confirmar Rechazo
            </Button>
          </div>
        </Card>
      )}

      {/* Modales */}
      <SignatureConsentModal
        open={showConsentModal}
        onOpenChange={setShowConsentModal}
        onConfirm={handleGiveConsent}
        documentTitle={currentSession.document.title}
        isLoading={isSigning}
      />

      <SignatureConfirmModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        onConfirm={handleConfirmSignature}
        documentTitle={currentSession.document.title}
        isLoading={isSigning}
      />
    </div>
  );
}
