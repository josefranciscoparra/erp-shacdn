import { z } from "zod";

// Tipos de documentos permitidos
export const documentKindSchema = z.enum([
  "CONTRACT",
  "PAYSLIP", 
  "ID_DOCUMENT",
  "SS_DOCUMENT",
  "CERTIFICATE",
  "MEDICAL",
  "OTHER"
]);

// Schema para subir documento
export const uploadDocumentSchema = z.object({
  file: z.any().refine(
    (file) => file instanceof File,
    "Debe ser un archivo válido"
  ).refine(
    (file) => file.size <= 10 * 1024 * 1024, // 10MB
    "El archivo no puede superar los 10MB"
  ).refine(
    (file) => [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ].includes(file.type),
    "Tipo de archivo no permitido. Solo se permiten PDF, DOC, DOCX, JPG, PNG, WEBP"
  ),
  documentKind: documentKindSchema,
  description: z.string().optional(),
  employeeId: z.string().min(1, "ID de empleado requerido"),
});

// Schema para actualizar documento
export const updateDocumentSchema = z.object({
  description: z.string().optional(),
  documentKind: documentKindSchema.optional(),
});

// Schema para filtros de documentos
export const documentFiltersSchema = z.object({
  employeeId: z.string().optional(),
  documentKind: documentKindSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

// Tipos TypeScript derivados
export type DocumentKind = z.infer<typeof documentKindSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentFilters = z.infer<typeof documentFiltersSchema>;

// Labels para mostrar en la UI
export const documentKindLabels: Record<DocumentKind, string> = {
  CONTRACT: "Contrato",
  PAYSLIP: "Nómina",
  ID_DOCUMENT: "DNI/NIE",
  SS_DOCUMENT: "Seguridad Social",
  CERTIFICATE: "Certificado",
  MEDICAL: "Médico",
  OTHER: "Otro"
};

// Colores para badges de tipos de documento
export const documentKindColors: Record<DocumentKind, string> = {
  CONTRACT: "bg-blue-50 text-blue-700 border-blue-200",
  PAYSLIP: "bg-green-50 text-green-700 border-green-200",
  ID_DOCUMENT: "bg-purple-50 text-purple-700 border-purple-200",
  SS_DOCUMENT: "bg-orange-50 text-orange-700 border-orange-200",
  CERTIFICATE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  MEDICAL: "bg-red-50 text-red-700 border-red-200",
  OTHER: "bg-gray-50 text-gray-700 border-gray-200"
};

// Iconos para tipos de documento (usando lucide-react)
export const documentKindIcons: Record<DocumentKind, string> = {
  CONTRACT: "FileText",
  PAYSLIP: "Receipt",
  ID_DOCUMENT: "CreditCard",
  SS_DOCUMENT: "Shield",
  CERTIFICATE: "Award",
  MEDICAL: "Heart",
  OTHER: "File"
};

// Helper para validar tipo MIME
export function isValidMimeType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];
  
  return allowedTypes.includes(mimeType);
}

// Helper para obtener extensión de archivo
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

// Helper para formatear tamaño de archivo
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper para determinar si un archivo es imagen
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// Helper para determinar si un archivo es PDF
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

// Helper para obtener icono basado en tipo MIME
export function getFileIcon(mimeType: string): string {
  if (isPdfFile(mimeType)) return 'FileText';
  if (isImageFile(mimeType)) return 'Image';
  if (mimeType.includes('word')) return 'FileText';
  return 'File';
}