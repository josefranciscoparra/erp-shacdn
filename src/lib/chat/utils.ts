/**
 * Utilidades para el módulo de chat
 */

/**
 * Normaliza dos IDs de usuario para asegurar consistencia
 * Siempre devuelve [menor, mayor] alfabéticamente
 */
export function normalizeUserIds(
  userId1: string,
  userId2: string
): [string, string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

/**
 * Verifica si el feature flag de chat está habilitado para una organización
 */
export function isChatEnabled(features: Record<string, unknown>): boolean {
  return features.chat === true;
}

/**
 * Valida que el tamaño del mensaje no exceda el límite (2KB)
 */
export function validateMessageSize(body: string): boolean {
  const sizeInBytes = new TextEncoder().encode(body).length;
  return sizeInBytes <= 2048; // 2KB
}

/**
 * Sanitiza el cuerpo del mensaje (elimina espacios extras, etc.)
 */
export function sanitizeMessageBody(body: string): string {
  return body.trim().replace(/\s+/g, " ");
}

/**
 * Obtiene el otro participante de una conversación
 */
export function getOtherParticipant(
  conversation: {
    userAId: string;
    userBId: string;
    userA: { id: string; name: string; email: string; image: string | null };
    userB: { id: string; name: string; email: string; image: string | null };
  },
  currentUserId: string
) {
  return conversation.userAId === currentUserId
    ? conversation.userB
    : conversation.userA;
}

/**
 * Formatea la fecha del último mensaje
 */
export function formatLastMessageDate(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMinutes < 1) {
    return "Ahora";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d`;
  } else {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  }
}
