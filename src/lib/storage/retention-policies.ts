import type { DocumentKind, FileCategory, RetentionPolicy } from "@prisma/client";
import { addMonths, addYears } from "date-fns";

export interface RetentionMetadata {
  legalReference: string;
  action: "BLOCK" | "SCHEDULE_DELETE";
  minimumYears?: number;
  recommendedYears?: number;
  defaultMonths?: number;
}

const RETENTION_POLICIES: Record<RetentionPolicy, RetentionMetadata> = {
  PAYROLL: {
    legalReference: "Estatuto de los Trabajadores",
    action: "BLOCK",
    minimumYears: 4,
    recommendedYears: 6,
  },
  CONTRACT: {
    legalReference: "Código de Comercio y ET",
    action: "BLOCK",
    minimumYears: 6,
    recommendedYears: 6,
  },
  TIME_TRACKING: {
    legalReference: "RDL 8/2019 - Registro horario",
    action: "BLOCK",
    minimumYears: 4,
    recommendedYears: 4,
  },
  PTO: {
    legalReference: "ET + jurisprudencia vacaciones/bajas",
    action: "SCHEDULE_DELETE",
    minimumYears: 4,
    recommendedYears: 4,
  },
  WHISTLEBLOWING: {
    legalReference: "Ley 2/2023 Canal de Denuncias",
    action: "SCHEDULE_DELETE",
    defaultMonths: 3,
  },
  SIGNATURE: {
    legalReference: "eIDAS + mismas obligaciones del documento base",
    action: "BLOCK",
    recommendedYears: 6,
  },
  GENERIC: {
    legalReference: "RGPD art.5 - limitación de conservación",
    action: "SCHEDULE_DELETE",
    recommendedYears: 2,
  },
};

const CATEGORY_TO_POLICY: Record<FileCategory, RetentionPolicy> = {
  PAYROLL: "PAYROLL",
  CONTRACT: "CONTRACT",
  TIME_TRACKING: "TIME_TRACKING",
  PTO: "PTO",
  WHISTLEBLOWING: "WHISTLEBLOWING",
  SIGNATURE: "SIGNATURE",
  EXPENSE: "GENERIC",
  OTHER: "GENERIC",
};

const DOCUMENT_KIND_TO_CATEGORY: Partial<Record<DocumentKind, FileCategory>> = {
  PAYSLIP: "PAYROLL",
  CONTRACT: "CONTRACT",
  SS_DOCUMENT: "TIME_TRACKING",
  ID_DOCUMENT: "CONTRACT",
  MEDICAL: "PTO",
  CERTIFICATE: "PTO",
};

export function getRetentionMetadata(policy: RetentionPolicy): RetentionMetadata {
  return RETENTION_POLICIES[policy];
}

export function getDefaultRetentionPolicy(category: FileCategory): RetentionPolicy {
  return CATEGORY_TO_POLICY[category] ?? "GENERIC";
}

export function getFileCategoryForDocumentKind(kind: DocumentKind): FileCategory {
  return DOCUMENT_KIND_TO_CATEGORY[kind] ?? "OTHER";
}

export function getRetentionPolicyForDocumentKind(kind: DocumentKind): RetentionPolicy {
  const category = getFileCategoryForDocumentKind(kind);
  return getDefaultRetentionPolicy(category);
}

export function calculateRetention(policy: RetentionPolicy, createdAt: Date = new Date()): Date | null {
  switch (policy) {
    case "PAYROLL":
    case "CONTRACT":
      return addYears(createdAt, 6);
    case "TIME_TRACKING":
      return addYears(createdAt, 4);
    case "PTO":
      return addYears(createdAt, 4);
    case "WHISTLEBLOWING":
      return addMonths(createdAt, 3);
    case "SIGNATURE":
      // Por defecto seguimos el documento base, por lo que usamos 6 años
      return addYears(createdAt, 6);
    case "GENERIC":
    default:
      return addYears(createdAt, 2);
  }
}

export function describeRetention(policy: RetentionPolicy): string {
  const meta = getRetentionMetadata(policy);
  if (policy === "WHISTLEBLOWING") {
    return "Se eliminan a los 3 meses salvo investigación en curso (Ley 2/2023)";
  }

  const years = meta.recommendedYears ?? meta.minimumYears;
  if (years) {
    return `Conservación durante ${years} años (${meta.legalReference})`;
  }

  return `Aplicación de política ${policy} (${meta.legalReference})`;
}
