/**
 * Normaliza emails para comparaciones y persistencia.
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  if (normalized === "") {
    return null;
  }

  return normalized;
}
