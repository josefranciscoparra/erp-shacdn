/**
 * Genera la URL del avatar de un usuario usando el endpoint seguro
 * que genera URLs firmadas temporalmente
 */
export function getUserAvatarUrl(userId: string): string {
  return `/api/users/${userId}/avatar?v=${Date.now()}`;
}

/**
 * Verifica si un usuario tiene imagen de avatar
 */
export function hasAvatar(imageUrl: string | null | undefined): boolean {
  return Boolean(imageUrl);
}
