import type { SignatureResult } from "@prisma/client";

/**
 * Evento en la línea de tiempo de firma
 */
export interface TimelineEvent {
  event: string;
  timestamp: string;
  actor?: string;
  details?: Record<string, unknown>;
}

/**
 * Metadatos del firmante para evidencia
 */
export interface SignerMetadata {
  ip: string | null;
  userAgent: string | null;
  geolocation?: {
    country?: string;
    city?: string;
  };
  sessionId?: string;
  consentTimestamp?: string;
  signatureTimestamp?: string;
}

/**
 * Estructura completa de evidencia
 */
export interface SignatureEvidenceData {
  timeline: TimelineEvent[];
  preSignHash: string;
  postSignHash: string | null;
  signerMetadata: SignerMetadata;
  policy: string;
  result: SignatureResult;
}

/**
 * Crea un nuevo evento para la línea de tiempo
 */
export function createTimelineEvent(event: string, actor?: string, details?: Record<string, unknown>): TimelineEvent {
  return {
    event,
    timestamp: new Date().toISOString(),
    actor,
    details,
  };
}

/**
 * Construye la evidencia completa de una firma
 */
export function buildSignatureEvidence(data: {
  timeline: TimelineEvent[];
  preSignHash: string;
  postSignHash: string | null;
  signerInfo: {
    name: string;
    email?: string;
  };
  ipAddress: string | null;
  userAgent: string | null;
  policy: string;
  result: SignatureResult;
  consentTimestamp?: Date;
  signatureTimestamp?: Date;
}): SignatureEvidenceData {
  const signerMetadata: SignerMetadata = {
    ip: data.ipAddress,
    userAgent: data.userAgent,
    consentTimestamp: data.consentTimestamp?.toISOString(),
    signatureTimestamp: data.signatureTimestamp?.toISOString(),
  };

  return {
    timeline: data.timeline,
    preSignHash: data.preSignHash,
    postSignHash: data.postSignHash,
    signerMetadata,
    policy: data.policy,
    result: data.result,
  };
}

/**
 * Genera un documento PDF de evidencia (opcional)
 *
 * NOTA: Esta es una implementación placeholder.
 * Para generar PDFs reales, se requeriría una librería como pdfkit o puppeteer.
 */
export function generateEvidencePdf(evidence: SignatureEvidenceData): string {
  // Por ahora, devolvemos un JSON formateado
  // En el futuro, esto generaría un PDF legible
  return JSON.stringify(evidence, null, 2);
}

/**
 * Valida que una evidencia tenga todos los campos requeridos
 */
export function validateEvidence(evidence: SignatureEvidenceData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!evidence.timeline || evidence.timeline.length === 0) {
    errors.push("Timeline vacía");
  }

  if (!evidence.preSignHash) {
    errors.push("Falta hash pre-firma");
  }

  if (evidence.result === "SUCCESS" && !evidence.postSignHash) {
    errors.push("Falta hash post-firma para firma exitosa");
  }

  if (!evidence.policy) {
    errors.push("Falta política de firma");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Crea una línea de tiempo inicial para una solicitud de firma
 */
export function createInitialTimeline(data: {
  documentTitle: string;
  requestedBy: string;
  signers: string[];
}): TimelineEvent[] {
  return [
    createTimelineEvent("SIGNATURE_REQUEST_CREATED", data.requestedBy, {
      documentTitle: data.documentTitle,
      signersCount: data.signers.length,
      signers: data.signers,
    }),
  ];
}

/**
 * Añade un evento de consentimiento a la línea de tiempo
 */
export function addConsentEvent(timeline: TimelineEvent[], signerName: string): TimelineEvent[] {
  return [
    ...timeline,
    createTimelineEvent("CONSENT_GIVEN", signerName, {
      action: "Firmante aceptó términos y condiciones",
    }),
  ];
}

/**
 * Añade un evento de firma a la línea de tiempo
 */
export function addSignatureEvent(
  timeline: TimelineEvent[],
  signerName: string,
  documentHash: string,
): TimelineEvent[] {
  return [
    ...timeline,
    createTimelineEvent("DOCUMENT_SIGNED", signerName, {
      action: "Documento firmado exitosamente",
      documentHash,
    }),
  ];
}

/**
 * Añade un evento de rechazo a la línea de tiempo
 */
export function addRejectionEvent(timeline: TimelineEvent[], signerName: string, reason: string): TimelineEvent[] {
  return [
    ...timeline,
    createTimelineEvent("SIGNATURE_REJECTED", signerName, {
      action: "Firmante rechazó la firma",
      reason,
    }),
  ];
}
