import { calculateHash } from "./hash";

/**
 * Metadatos de firma que se añaden al PDF
 */
export interface SignatureMetadata {
  signerName: string;
  signerEmail: string;
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
  signaturePolicy: string;
  documentHash: string;
}

/**
 * Resultado del proceso de firma
 */
export interface SignedDocumentResult {
  signedFileBuffer: Buffer;
  signedFileHash: string;
  metadata: SignatureMetadata;
}

/**
 * Firma un documento PDF añadiendo metadatos de firma
 *
 * NOTA: Esta es una implementación básica que no modifica el PDF original.
 * Para firma PAdES completa, se requeriría una librería como node-signpdf.
 *
 * Por ahora, devolvemos el PDF original sin modificar y generamos
 * un hash + metadatos que se almacenarán como evidencia.
 *
 * @param pdfBuffer Buffer del PDF original
 * @param metadata Metadatos de la firma
 * @returns Resultado con el documento "firmado" y su hash
 */
export async function signPdfDocument(pdfBuffer: Buffer, metadata: SignatureMetadata): Promise<SignedDocumentResult> {
  // Por ahora, el PDF firmado es el mismo que el original
  // En el futuro, aquí se añadiría una firma digital PAdES
  const signedFileBuffer = pdfBuffer;

  // Calcular hash del documento firmado
  const signedFileHash = calculateHash(signedFileBuffer);

  return {
    signedFileBuffer,
    signedFileHash,
    metadata,
  };
}

/**
 * Genera metadatos de firma a partir de la información del firmante
 */
export function generateSignatureMetadata(
  signer: {
    name: string;
    email?: string;
  },
  documentHash: string,
  policy: string,
  ipAddress?: string,
  userAgent?: string,
): SignatureMetadata {
  return {
    signerName: signer.name,
    signerEmail: signer.email ?? "no-email",
    signedAt: new Date().toISOString(),
    ipAddress,
    userAgent,
    signaturePolicy: policy,
    documentHash,
  };
}

/**
 * Verifica la integridad de un documento firmado comparando hashes
 */
export function verifyDocumentIntegrity(documentBuffer: Buffer, expectedHash: string): boolean {
  const actualHash = calculateHash(documentBuffer);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}
