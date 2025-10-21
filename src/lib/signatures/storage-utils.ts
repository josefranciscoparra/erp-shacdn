const normalize = (value?: string | null) => (typeof value === "string" ? value.trim() : "");

const stripLeadingSlash = (input: string): string => input.replace(/^\/+/, "");

const removePrefix = (input: string, prefix?: string): string => {
  if (!prefix) return input;
  const normalizedPrefix = stripLeadingSlash(prefix.toLowerCase());
  if (!normalizedPrefix) return input;

  const normalizedInput = stripLeadingSlash(input);
  if (normalizedInput.toLowerCase().startsWith(`${normalizedPrefix}/`)) {
    return normalizedInput.slice(normalizedPrefix.length + 1);
  }

  return normalizedInput;
};

export function resolveSignatureStoragePath(rawPath: string | null | undefined): string {
  const value = normalize(rawPath);
  if (!value) {
    return "";
  }

  if (!value.startsWith("http")) {
    const localBase = normalize(process.env.LOCAL_STORAGE_URL) || "uploads";
    return removePrefix(value, localBase);
  }

  try {
    const url = new URL(value);
    const segments = stripLeadingSlash(url.pathname).split("/").filter(Boolean);
    if (segments.length === 0) {
      return "";
    }

    const bucket = normalize(process.env.R2_BUCKET);
    if (bucket) {
      const sanitizedBucket = stripLeadingSlash(bucket);
      if (segments[0].toLowerCase() === sanitizedBucket.toLowerCase()) {
        return segments.slice(1).join("/");
      }
    }

    const orgIndex = segments.findIndex((segment) => segment.toLowerCase().startsWith("org-"));
    if (orgIndex !== -1) {
      return segments.slice(orgIndex).join("/");
    }

    const containerPrefix = normalize(process.env.AZURE_CONTAINER_PREFIX) || "documents";
    if (segments[0].toLowerCase().startsWith(`${containerPrefix.toLowerCase()}-`)) {
      const orgSegment = segments[0].slice(containerPrefix.length + 1);
      return [orgSegment, ...segments.slice(1)].join("/");
    }

    const localBase = normalize(process.env.LOCAL_STORAGE_URL) || "uploads";
    const pathFromSegments = segments.join("/");
    return removePrefix(pathFromSegments, localBase);
  } catch (error) {
    console.warn("resolveSignatureStoragePath: unable to parse URL", error);
    const localBase = normalize(process.env.LOCAL_STORAGE_URL) || "uploads";
    return removePrefix(value, localBase);
  }
}
