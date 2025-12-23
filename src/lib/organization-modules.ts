export type ModuleKey = "chat" | "shifts" | "geolocation" | "whistleblowing";

export type ModuleAvailability = Record<ModuleKey, boolean>;

export const DEFAULT_MODULE_AVAILABILITY: ModuleAvailability = {
  chat: true,
  shifts: true,
  geolocation: true,
  whistleblowing: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export function getModuleAvailability(features: unknown): ModuleAvailability {
  const base = isRecord(features) ? features : {};
  const modules = isRecord(base.modules) ? base.modules : {};

  const chat = typeof modules.chat === "boolean" ? modules.chat : DEFAULT_MODULE_AVAILABILITY.chat;
  const shifts = typeof modules.shifts === "boolean" ? modules.shifts : DEFAULT_MODULE_AVAILABILITY.shifts;
  const geolocation =
    typeof modules.geolocation === "boolean" ? modules.geolocation : DEFAULT_MODULE_AVAILABILITY.geolocation;
  const whistleblowing =
    typeof modules.whistleblowing === "boolean" ? modules.whistleblowing : DEFAULT_MODULE_AVAILABILITY.whistleblowing;

  return {
    chat,
    shifts,
    geolocation,
    whistleblowing,
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
  if (typeof updates.geolocation === "boolean") sanitizedUpdates.geolocation = updates.geolocation;
  if (typeof updates.whistleblowing === "boolean") sanitizedUpdates.whistleblowing = updates.whistleblowing;

  return {
    ...base,
    modules: {
      ...modules,
      ...sanitizedUpdates,
    },
  };
}
