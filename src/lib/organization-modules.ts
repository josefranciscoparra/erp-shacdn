import { features as globalFeatures } from "@/config/features";

export type ModuleKey =
  | "chat"
  | "shifts"
  | "geolocation"
  | "whistleblowing"
  | "documents"
  | "signatures"
  | "expenses"
  | "payroll"
  | "projects";

export type ModuleAvailability = Record<ModuleKey, boolean>;

export const DEFAULT_MODULE_AVAILABILITY: ModuleAvailability = {
  chat: true,
  shifts: true,
  geolocation: true,
  whistleblowing: true,
  documents: true,
  signatures: true,
  expenses: true,
  payroll: true,
  projects: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export function getModuleAvailability(features: unknown): ModuleAvailability {
  const base = isRecord(features) ? features : {};
  const modules = isRecord(base.modules) ? base.modules : {};

  const chat = typeof modules.chat === "boolean" ? modules.chat : DEFAULT_MODULE_AVAILABILITY.chat;
  const shifts = typeof modules.shifts === "boolean" ? modules.shifts : DEFAULT_MODULE_AVAILABILITY.shifts;
  const whistleblowing =
    typeof modules.whistleblowing === "boolean" ? modules.whistleblowing : DEFAULT_MODULE_AVAILABILITY.whistleblowing;
  const documents = typeof modules.documents === "boolean" ? modules.documents : DEFAULT_MODULE_AVAILABILITY.documents;
  const signatures =
    typeof modules.signatures === "boolean" ? modules.signatures : DEFAULT_MODULE_AVAILABILITY.signatures;
  const expenses = typeof modules.expenses === "boolean" ? modules.expenses : DEFAULT_MODULE_AVAILABILITY.expenses;
  const payroll = typeof modules.payroll === "boolean" ? modules.payroll : DEFAULT_MODULE_AVAILABILITY.payroll;
  const projects = typeof modules.projects === "boolean" ? modules.projects : DEFAULT_MODULE_AVAILABILITY.projects;

  return {
    chat,
    shifts,
    geolocation: true,
    whistleblowing,
    documents: documents && globalFeatures.documents,
    signatures: signatures && globalFeatures.signatures,
    expenses,
    payroll,
    projects,
  };
}

export function mergeModuleAvailability(
  features: unknown,
  updates: Partial<ModuleAvailability>,
): Record<string, unknown> {
  const base = isRecord(features) ? features : {};
  const modules = isRecord(base.modules) ? base.modules : {};

  const sanitizedUpdates: Record<string, boolean> = {};
  if (typeof updates.chat === "boolean") sanitizedUpdates.chat = updates.chat;
  if (typeof updates.shifts === "boolean") sanitizedUpdates.shifts = updates.shifts;
  if (typeof updates.whistleblowing === "boolean") sanitizedUpdates.whistleblowing = updates.whistleblowing;
  if (typeof updates.documents === "boolean") sanitizedUpdates.documents = updates.documents;
  if (typeof updates.signatures === "boolean") sanitizedUpdates.signatures = updates.signatures;
  if (typeof updates.expenses === "boolean") sanitizedUpdates.expenses = updates.expenses;
  if (typeof updates.payroll === "boolean") sanitizedUpdates.payroll = updates.payroll;
  if (typeof updates.projects === "boolean") sanitizedUpdates.projects = updates.projects;

  return {
    ...base,
    modules: {
      ...modules,
      ...sanitizedUpdates,
    },
  };
}
