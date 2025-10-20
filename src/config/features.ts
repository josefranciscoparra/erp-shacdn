const parseFlag = (value?: string | null): boolean => {
  if (!value) return true;

  const normalized = value.trim().toLowerCase();
  if (["false", "0", "off", "disabled", "no"].includes(normalized)) {
    return false;
  }

  if (["true", "1", "on", "enabled", "yes"].includes(normalized)) {
    return true;
  }

  return true;
};

const rawDocumentsFlag =
  typeof process.env.NEXT_PUBLIC_FEATURE_DOCUMENTS_ENABLED !== "undefined" &&
  process.env.NEXT_PUBLIC_FEATURE_DOCUMENTS_ENABLED !== undefined
    ? process.env.NEXT_PUBLIC_FEATURE_DOCUMENTS_ENABLED
    : process.env.FEATURE_DOCUMENTS_ENABLED;

const rawSignaturesFlag =
  typeof process.env.NEXT_PUBLIC_FEATURE_SIGNATURES_ENABLED !== "undefined" &&
  process.env.NEXT_PUBLIC_FEATURE_SIGNATURES_ENABLED !== undefined
    ? process.env.NEXT_PUBLIC_FEATURE_SIGNATURES_ENABLED
    : process.env.FEATURE_SIGNATURES_ENABLED;

export const features = {
  documents: parseFlag(rawDocumentsFlag ?? undefined),
  signatures: parseFlag(rawSignaturesFlag ?? undefined),
} as const;

export type FeatureFlags = typeof features;
