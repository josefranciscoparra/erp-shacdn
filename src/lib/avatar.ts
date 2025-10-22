const DEFAULT_CACHE_VERSION = () => Date.now().toString();

export function buildAvatarApiUrl(userId: string, version?: number | string): string {
  const cacheKey = version ?? DEFAULT_CACHE_VERSION();
  return `/api/users/${userId}/avatar?v=${cacheKey}`;
}

export function resolveAvatarForClient(
  storedUrl: string | null | undefined,
  userId: string,
  version?: number | string,
): string | null {
  if (!storedUrl) {
    return null;
  }

  return buildAvatarApiUrl(userId, version);
}

export function extractAvatarStoragePath(storedUrl: string | null | undefined): string {
  if (!storedUrl) {
    return "";
  }

  const sanitized = storedUrl.split("?")[0];

  if (sanitized.startsWith("/uploads/")) {
    return sanitized.replace(/^\/uploads\//, "");
  }

  if (sanitized.startsWith("uploads/")) {
    return sanitized.replace(/^uploads\//, "");
  }

  try {
    const url = new URL(sanitized);
    const pathWithoutSlash = url.pathname.replace(/^\//, "");
    const segments = pathWithoutSlash.split("/").filter(Boolean);
    const orgSegmentIndex = segments.findIndex((segment) => segment.startsWith("org-"));

    if (orgSegmentIndex >= 0) {
      return segments.slice(orgSegmentIndex).join("/");
    }

    return segments.join("/");
  } catch {
    const normalized = sanitized.replace(/^\//, "");
    const segments = normalized.split("/").filter(Boolean);
    const orgSegmentIndex = segments.findIndex((segment) => segment.startsWith("org-"));

    if (orgSegmentIndex >= 0) {
      return segments.slice(orgSegmentIndex).join("/");
    }

    return normalized;
  }
}
