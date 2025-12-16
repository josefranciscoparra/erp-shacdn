"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Globe,
  Hash,
  Monitor,
  PenTool,
  Send,
  Shield,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Tipos para el timeline de eventos
interface TimelineEvent {
  event: string;
  timestamp: string;
  user?: string;
  details?: string | Record<string, unknown>;
}

// Tipo para los metadatos del firmante
interface SignerMetadata {
  ip?: string;
  userAgent?: string;
  geolocation?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  sessionId?: string;
}

interface SignerEvidence {
  signerId: string;
  signerName: string;
  signerEmail: string;
  order: number;
  status: string;
  signedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  consentGivenAt: string | null;
  evidence: {
    id: string;
    timeline: TimelineEvent[];
    preSignHash: string;
    postSignHash: string | null;
    signerMetadata: SignerMetadata;
    policy: string;
    result: string;
    createdAt: string;
  } | null;
}

interface AuditData {
  requestId: string;
  documentTitle: string;
  documentDescription: string | null;
  documentCategory: string;
  documentVersion: number;
  requestStatus: string;
  requestPolicy: string;
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
  batchId: string | null;
  batchName: string | null;
  signers: SignerEvidence[];
}

interface AuditTimelineProps {
  data: AuditData;
}

const eventIcons: Record<string, React.ReactNode> = {
  CREATED: <FileText className="h-4 w-4" />,
  REQUEST_CREATED: <Send className="h-4 w-4" />,
  SIGNATURE_REQUEST_CREATED: <Send className="h-4 w-4" />,
  CONSENT_GIVEN: <Shield className="h-4 w-4" />,
  SIGNED: <PenTool className="h-4 w-4" />,
  REJECTED: <XCircle className="h-4 w-4" />,
  EXPIRED: <Clock className="h-4 w-4" />,
  REMINDER_SENT: <Bell className="h-4 w-4" />,
  DOCUMENT_VIEWED: <FileText className="h-4 w-4" />,
  DOCUMENT_SIGNED: <PenTool className="h-4 w-4" />,
  HASH_VERIFIED: <Hash className="h-4 w-4" />,
  DEFAULT: <AlertCircle className="h-4 w-4" />,
};

const eventLabels: Record<string, string> = {
  CREATED: "Documento creado",
  REQUEST_CREATED: "Solicitud creada",
  SIGNATURE_REQUEST_CREATED: "Solicitud creada",
  CONSENT_GIVEN: "Consentimiento dado",
  SIGNED: "Documento firmado",
  DOCUMENT_SIGNED: "Documento firmado",
  REJECTED: "Documento rechazado",
  EXPIRED: "Solicitud expirada",
  REMINDER_SENT: "Recordatorio enviado",
  DOCUMENT_VIEWED: "Documento visualizado",
  HASH_VERIFIED: "Hash verificado",
};

const eventColors: Record<string, string> = {
  CREATED: "bg-blue-500",
  REQUEST_CREATED: "bg-blue-500",
  SIGNATURE_REQUEST_CREATED: "bg-blue-500",
  CONSENT_GIVEN: "bg-purple-500",
  SIGNED: "bg-green-500",
  DOCUMENT_SIGNED: "bg-green-500",
  REJECTED: "bg-red-500",
  EXPIRED: "bg-gray-500",
  REMINDER_SENT: "bg-amber-500",
  DOCUMENT_VIEWED: "bg-cyan-500",
  HASH_VERIFIED: "bg-indigo-500",
  DEFAULT: "bg-gray-400",
};

function formatTimestamp(timestamp: string): string {
  return format(new Date(timestamp), "dd MMM yyyy HH:mm:ss", { locale: es });
}

function truncateHash(hash: string, length: number = 16): string {
  if (hash.length <= length * 2) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}

function parseUserAgent(userAgent: string): string {
  // Simplificar el user agent para mostrar solo lo relevante
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Navegador desconocido";
}

function formatEventDetails(details?: string | Record<string, unknown>): string | null {
  if (!details) {
    return null;
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    if ("action" in details && typeof details.action === "string") {
      return details.action;
    }
    if ("documentTitle" in details && "signersCount" in details) {
      return `Documento: ${details.documentTitle} · Firmantes: ${details.signersCount}`;
    }
    return JSON.stringify(details);
  } catch {
    return null;
  }
}

function getReadableEventLabel(event: string): string {
  if (eventLabels[event]) {
    return eventLabels[event];
  }

  return event
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AuditTimeline({ data }: AuditTimelineProps) {
  // Construir timeline global combinando eventos de la solicitud y de cada firmante
  const globalEvents: Array<{
    event: string;
    timestamp: string;
    user?: string;
    details?: string;
    signerId?: string;
    signerName?: string;
  }> = [];

  // Evento de creación de la solicitud
  globalEvents.push({
    event: "REQUEST_CREATED",
    timestamp: data.createdAt,
    details: `Documento: ${data.documentTitle}`,
  });

  // Añadir eventos de cada firmante
  for (const signer of data.signers) {
    if (signer.consentGivenAt) {
      globalEvents.push({
        event: "CONSENT_GIVEN",
        timestamp: signer.consentGivenAt,
        user: signer.signerName,
        signerId: signer.signerId,
        signerName: signer.signerName,
      });
    }

    if (signer.signedAt) {
      globalEvents.push({
        event: "SIGNED",
        timestamp: signer.signedAt,
        user: signer.signerName,
        signerId: signer.signerId,
        signerName: signer.signerName,
      });
    }

    if (signer.rejectedAt) {
      globalEvents.push({
        event: "REJECTED",
        timestamp: signer.rejectedAt,
        user: signer.signerName,
        details: signer.rejectionReason ?? undefined,
        signerId: signer.signerId,
        signerName: signer.signerName,
      });
    }

    // Añadir eventos del timeline de evidencia si existen
    if (signer.evidence?.timeline) {
      const timeline = signer.evidence.timeline;
      for (const event of timeline) {
        globalEvents.push({
          event: event.event,
          timestamp: event.timestamp,
          user: event.user ?? signer.signerName,
          details: event.details,
          signerId: signer.signerId,
          signerName: signer.signerName,
        });
      }
    }
  }

  // Ordenar eventos por timestamp
  globalEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Preparar datos para exportación JSON
  const handleExportJson = () => {
    const exportData = {
      requestId: data.requestId,
      documentTitle: data.documentTitle,
      documentCategory: data.documentCategory,
      documentVersion: data.documentVersion,
      requestStatus: data.requestStatus,
      requestPolicy: data.requestPolicy,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      completedAt: data.completedAt,
      batchId: data.batchId,
      batchName: data.batchName,
      signers: data.signers.map((signer) => ({
        signerId: signer.signerId,
        signerName: signer.signerName,
        signerEmail: signer.signerEmail,
        order: signer.order,
        status: signer.status,
        signedAt: signer.signedAt,
        rejectedAt: signer.rejectedAt,
        rejectionReason: signer.rejectionReason,
        consentGivenAt: signer.consentGivenAt,
        evidence: signer.evidence
          ? {
              id: signer.evidence.id,
              timeline: signer.evidence.timeline,
              preSignHash: signer.evidence.preSignHash,
              postSignHash: signer.evidence.postSignHash,
              signerMetadata: signer.evidence.signerMetadata,
              policy: signer.evidence.policy,
              result: signer.evidence.result,
              createdAt: signer.evidence.createdAt,
            }
          : null,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${data.requestId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Resumen general */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {data.documentTitle}
              </CardTitle>
              <CardDescription>
                {data.documentCategory} - Versión {data.documentVersion}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportJson}>
              <Download className="mr-2 h-4 w-4" />
              Exportar JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 @lg/main:grid-cols-2 @3xl/main:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-sm">Estado</p>
              <Badge
                variant={
                  data.requestStatus === "COMPLETED"
                    ? "default"
                    : data.requestStatus === "REJECTED"
                      ? "destructive"
                      : "secondary"
                }
                className={data.requestStatus === "COMPLETED" ? "bg-green-600" : ""}
              >
                {data.requestStatus === "COMPLETED"
                  ? "Completado"
                  : data.requestStatus === "REJECTED"
                    ? "Rechazado"
                    : data.requestStatus === "PENDING"
                      ? "Pendiente"
                      : data.requestStatus === "IN_PROGRESS"
                        ? "En Progreso"
                        : data.requestStatus}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Política</p>
              <p className="font-medium">{data.requestPolicy === "SEQUENTIAL" ? "Secuencial" : data.requestPolicy}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Creado</p>
              <p className="font-medium">{formatTimestamp(data.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Expira</p>
              <p className="font-medium">{formatTimestamp(data.expiresAt)}</p>
            </div>
          </div>

          {data.batchId && (
            <div className="bg-muted/50 rounded-lg border p-3">
              <p className="text-muted-foreground text-sm">Parte del lote</p>
              <p className="font-medium">{data.batchName ?? data.batchId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Eventos
          </CardTitle>
          <CardDescription>{globalEvents.length} eventos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-6 pl-6">
            {/* Línea vertical */}
            <div className="bg-border absolute top-0 left-2 h-full w-0.5" />

            {globalEvents.map((event, index) => (
              <div key={`${event.event}-${index}`} className="relative">
                {/* Punto en la línea */}
                <div
                  className={`absolute -left-4 flex h-4 w-4 items-center justify-center rounded-full ${eventColors[event.event] ?? eventColors.DEFAULT}`}
                >
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>

                <div className="ml-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{eventIcons[event.event] ?? eventIcons.DEFAULT}</span>
                    <span className="font-medium">{getReadableEventLabel(event.event)}</span>
                    {event.signerName && (
                      <Badge variant="outline" className="text-xs">
                        {event.signerName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{formatTimestamp(event.timestamp)}</p>
                  {formatEventDetails(event.details) && (
                    <p className="text-muted-foreground text-sm">{formatEventDetails(event.details)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detalles por firmante */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Evidencia por Firmante
          </CardTitle>
          <CardDescription>Detalles técnicos de cada firma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.signers.map((signer, index) => (
            <div key={signer.signerId}>
              {index > 0 && <Separator className="my-6" />}

              <div className="space-y-4">
                {/* Header del firmante */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      Orden {signer.order}
                    </Badge>
                    <div>
                      <p className="font-medium">{signer.signerName}</p>
                      <p className="text-muted-foreground text-sm">{signer.signerEmail}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      signer.status === "SIGNED"
                        ? "default"
                        : signer.status === "REJECTED"
                          ? "destructive"
                          : "secondary"
                    }
                    className={signer.status === "SIGNED" ? "bg-green-600" : ""}
                  >
                    {signer.status === "SIGNED" ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : signer.status === "REJECTED" ? (
                      <XCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <Clock className="mr-1 h-3 w-3" />
                    )}
                    {signer.status === "SIGNED" ? "Firmado" : signer.status === "REJECTED" ? "Rechazado" : "Pendiente"}
                  </Badge>
                </div>

                {/* Fechas importantes */}
                <div className="grid gap-3 @lg/main:grid-cols-3">
                  {signer.consentGivenAt && (
                    <div className="bg-muted/30 rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs uppercase">Consentimiento</p>
                      <p className="text-sm font-medium">{formatTimestamp(signer.consentGivenAt)}</p>
                    </div>
                  )}
                  {signer.signedAt && (
                    <div className="rounded-lg border bg-green-50 p-3 dark:bg-green-900/20">
                      <p className="text-xs text-green-700 uppercase dark:text-green-400">Fecha de firma</p>
                      <p className="text-sm font-medium">{formatTimestamp(signer.signedAt)}</p>
                    </div>
                  )}
                  {signer.rejectedAt && (
                    <div className="rounded-lg border bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-xs text-red-700 uppercase dark:text-red-400">Fecha de rechazo</p>
                      <p className="text-sm font-medium">{formatTimestamp(signer.rejectedAt)}</p>
                      {signer.rejectionReason && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">Motivo: {signer.rejectionReason}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Evidencia técnica */}
                {signer.evidence && (
                  <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
                    <p className="text-sm font-medium">Evidencia Técnica</p>

                    <div className="grid gap-3 @lg/main:grid-cols-2">
                      {/* Hashes */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Hash className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm font-medium">Hashes de Integridad</span>
                        </div>
                        <div className="space-y-1 pl-6">
                          <div>
                            <p className="text-muted-foreground text-xs">Pre-firma (SHA-256)</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <code className="bg-muted cursor-pointer rounded px-1 py-0.5 text-xs">
                                    {truncateHash(signer.evidence.preSignHash)}
                                  </code>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <code className="text-xs">{signer.evidence.preSignHash}</code>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {signer.evidence.postSignHash && (
                            <div>
                              <p className="text-muted-foreground text-xs">Post-firma (SHA-256)</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <code className="bg-muted cursor-pointer rounded px-1 py-0.5 text-xs">
                                      {truncateHash(signer.evidence.postSignHash)}
                                    </code>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <code className="text-xs">{signer.evidence.postSignHash}</code>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metadatos del firmante */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Monitor className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm font-medium">Metadatos del Firmante</span>
                        </div>
                        <div className="space-y-1 pl-6">
                          {signer.evidence.signerMetadata.ip && (
                            <div className="flex items-center gap-2">
                              <Globe className="text-muted-foreground h-3 w-3" />
                              <p className="text-xs">
                                <span className="text-muted-foreground">IP:</span>{" "}
                                <code className="bg-muted rounded px-1">{signer.evidence.signerMetadata.ip}</code>
                              </p>
                            </div>
                          )}
                          {signer.evidence.signerMetadata.userAgent && (
                            <div className="flex items-center gap-2">
                              <Monitor className="text-muted-foreground h-3 w-3" />
                              <p className="text-xs">
                                <span className="text-muted-foreground">Navegador:</span>{" "}
                                {parseUserAgent(signer.evidence.signerMetadata.userAgent)}
                              </p>
                            </div>
                          )}
                          <p className="text-xs">
                            <span className="text-muted-foreground">Política:</span> {signer.evidence.policy}
                          </p>
                          <p className="text-xs">
                            <span className="text-muted-foreground">Resultado:</span>{" "}
                            <Badge
                              variant={signer.evidence.result === "SIGNED" ? "default" : "secondary"}
                              className={`text-xs ${signer.evidence.result === "SIGNED" ? "bg-green-600" : ""}`}
                            >
                              {signer.evidence.result}
                            </Badge>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
