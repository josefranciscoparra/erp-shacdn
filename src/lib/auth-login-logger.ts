import { prisma } from "@/lib/prisma";

export type LoginFailureReason =
  | "INVALID_INPUT"
  | "USER_NOT_FOUND"
  | "USER_INACTIVE"
  | "ORG_INACTIVE"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_MISMATCH"
  | "RATE_LIMIT";

type LoginFailureUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null;
};

type LoginFailureLog = {
  reason: LoginFailureReason;
  email: string | null;
  normalizedEmail: string | null;
  user?: LoginFailureUser | null;
  attempts?: number | null;
  lockedUntil?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  rememberMe?: boolean | null;
};

const REASON_DESCRIPTIONS: Record<LoginFailureReason, string> = {
  INVALID_INPUT: "Intento de login fallido: entrada inválida",
  USER_NOT_FOUND: "Intento de login fallido: usuario no encontrado",
  USER_INACTIVE: "Intento de login fallido: usuario inactivo",
  ORG_INACTIVE: "Intento de login fallido: organización inactiva",
  ACCOUNT_LOCKED: "Intento de login fallido: cuenta bloqueada",
  PASSWORD_MISMATCH: "Intento de login fallido: contraseña incorrecta",
  RATE_LIMIT: "Intento de login bloqueado por rate limiting",
};

function resolveEntityId(user: LoginFailureUser | null | undefined, normalizedEmail: string | null) {
  if (user?.id) {
    return user.id;
  }
  if (normalizedEmail) {
    return normalizedEmail;
  }
  return "unknown";
}

function resolvePerformedByEmail(
  user: LoginFailureUser | null | undefined,
  normalizedEmail: string | null,
  email: string | null,
) {
  if (user?.email) {
    return user.email;
  }
  if (normalizedEmail) {
    return normalizedEmail;
  }
  if (email) {
    return email;
  }
  return "unknown";
}

function resolvePerformedByName(user: LoginFailureUser | null | undefined, normalizedEmail: string | null) {
  if (user?.name) {
    return user.name;
  }
  if (normalizedEmail) {
    return normalizedEmail;
  }
  return "Anónimo";
}

export async function logLoginFailure({
  reason,
  email,
  normalizedEmail,
  user,
  attempts,
  lockedUntil,
  ipAddress,
  userAgent,
  rememberMe,
}: LoginFailureLog): Promise<void> {
  try {
    const orgId = user && user.orgId ? user.orgId : null;
    const description = REASON_DESCRIPTIONS[reason];
    const entityId = resolveEntityId(user, normalizedEmail);
    const performedByEmail = resolvePerformedByEmail(user, normalizedEmail, email);

    await prisma.auditLog.create({
      data: {
        action: "LOGIN_FAILED",
        category: "AUTH",
        entityId,
        entityType: user ? "User" : "Credential",
        entityData: {
          reason,
          email: email ?? null,
          normalizedEmail: normalizedEmail ?? null,
          userId: user && user.id ? user.id : null,
          orgId,
          attempts: attempts ?? null,
          lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
          rememberMe: rememberMe ?? null,
        },
        description,
        performedById: user && user.id ? user.id : "anonymous",
        performedByEmail,
        performedByName: resolvePerformedByName(user, normalizedEmail),
        performedByRole: user && user.role ? user.role : "ANONYMOUS",
        orgId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[AuthLoginLogger] Error writing login failure:", error);
    }
  }
}
