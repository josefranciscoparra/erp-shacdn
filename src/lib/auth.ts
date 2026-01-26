import { createHash } from "crypto";

import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { logLoginFailure } from "@/lib/auth-login-logger";
import { checkLoginRateLimit, clearLoginRateLimitForUser, recordLoginFailureRateLimit } from "@/lib/auth-rate-limit";
import { sendAccountLockedEmail } from "@/lib/email/email-service";
import { prisma } from "@/lib/prisma";
import { sendAccountLockedAdminAlerts } from "@/lib/security-alerts";
import { normalizeEmail } from "@/lib/validations/email";
import { MAX_PASSWORD_ATTEMPTS, PASSWORD_LOCK_MINUTES } from "@/lib/validations/password";

type OrgMembershipPayload = {
  orgId: string;
  orgName: string | null;
  isDefault: boolean;
};

// Schema de validación para login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.coerce.boolean().optional(),
});

const supportTokenSchema = z.object({
  token: z.string().min(32),
});

const SHORT_SESSION_SECONDS = 12 * 60 * 60; // 12 horas para sesiones estándar
const LONG_SESSION_SECONDS = 30 * 24 * 60 * 60; // 30 días para "Recordarme"

class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

function parseRememberFlag(value: unknown): boolean {
  if (value === true || value === "true") {
    return true;
  }
  return false;
}

function cleanHeaderValue(value: string | null) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function getRequestIp(headersList: Headers) {
  const forwardedFor = cleanHeaderValue(headersList.get("x-forwarded-for"));
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0];
    if (first) {
      const trimmed = first.trim();
      if (trimmed !== "") {
        return trimmed;
      }
    }
  }
  return cleanHeaderValue(headersList.get("x-real-ip")) ?? cleanHeaderValue(headersList.get("cf-connecting-ip"));
}

async function getUserOrgScope(userId: string, fallbackOrgId?: string, userRole?: string) {
  // Si es SUPER_ADMIN, obtener TODAS las organizaciones activas
  if (userRole === "SUPER_ADMIN") {
    const allOrganizations = await prisma.organization.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    const accessibleOrgIds = allOrganizations.map((org) => org.id);
    const activeOrgId = fallbackOrgId ?? accessibleOrgIds[0] ?? null;

    const orgMemberships: OrgMembershipPayload[] = allOrganizations.map((org) => ({
      orgId: org.id,
      orgName: org.name,
      isDefault: org.id === activeOrgId,
    }));

    return {
      activeOrgId,
      accessibleOrgIds,
      orgMemberships,
    };
  }

  // Para otros roles, usar membresías de UserOrganization
  const memberships = await prisma.userOrganization.findMany({
    where: {
      userId,
      isActive: true,
      organization: {
        active: true,
      },
    },
    select: {
      orgId: true,
      isDefault: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const accessibleOrgIds = memberships.map((membership) => membership.orgId);
  const fallbackList = fallbackOrgId ? [fallbackOrgId] : [];
  const finalAccessible = accessibleOrgIds.length > 0 ? accessibleOrgIds : fallbackList;

  const activeOrgId =
    memberships.find((membership) => membership.isDefault)?.orgId ?? finalAccessible[0] ?? fallbackOrgId ?? null;

  const orgMemberships: OrgMembershipPayload[] = memberships.map((membership) => ({
    orgId: membership.orgId,
    orgName: membership.organization?.name ?? null,
    isDefault: membership.isDefault,
  }));

  return {
    activeOrgId,
    accessibleOrgIds: finalAccessible,
    orgMemberships,
  };
}

export const {
  handlers,
  signIn,
  signOut,
  auth,
  unstable_update: updateSession,
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  // Confía en el host en entornos locales/proxy para evitar problemas de detección de origen
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // Secure sólo en producción (https). En desarrollo debe ser false.
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as typeof user & {
          employeeId?: string | null;
          employeeOrgId?: string | null;
          lastPasswordChangeAt?: string | null;
          rememberMe?: boolean;
          supportSessionExpiresAt?: number | null;
          impersonatedById?: string | null;
          impersonatedByEmail?: string | null;
          impersonatedByName?: string | null;
          impersonationExpiresAt?: number | null;
        };
        token.id = user.id;
        token.role = user.role;
        token.orgId = user.orgId;
        token.name = user.name;
        token.email = user.email;
        token.mustChangePassword = user.mustChangePassword;
        token.employeeId = typedUser.employeeId ?? null;
        // Avatar sin timestamp - se cachea por 24h
        token.image = user.image ? `/api/users/${user.id}/avatar` : null;
        token.employeeOrgId = typedUser.employeeOrgId ?? null;
        const orgScope = await getUserOrgScope(user.id, user.orgId, user.role);
        token.activeOrgId = orgScope.activeOrgId ?? user.orgId;
        token.accessibleOrgIds = orgScope.accessibleOrgIds;
        token.orgMemberships = orgScope.orgMemberships;
        token.orgId = token.activeOrgId;
        token.lastPasswordChangeAt = typedUser.lastPasswordChangeAt ?? null;
        token.rememberMe = typedUser.rememberMe ?? false;
        token.impersonatedById = typedUser.impersonatedById ?? null;
        token.impersonatedByEmail = typedUser.impersonatedByEmail ?? null;
        token.impersonatedByName = typedUser.impersonatedByName ?? null;
        token.impersonationExpiresAt = typedUser.impersonationExpiresAt ?? null;

        const supportSessionExpiresAt = typedUser.supportSessionExpiresAt ?? null;
        token.sessionExpiresAt =
          supportSessionExpiresAt ??
          Date.now() + (token.rememberMe ? LONG_SESSION_SECONDS : SHORT_SESSION_SECONDS) * 1000;
        return token;
      }

      if (!token.id) {
        return token;
      }

      if (token.sessionExpiresAt && Date.now() > token.sessionExpiresAt) {
        return null;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: {
          name: true,
          email: true,
          image: true,
          role: true,
          orgId: true,
          mustChangePassword: true,
          updatedAt: true,
          employee: {
            select: {
              id: true,
              orgId: true,
              firstName: true,
              lastName: true,
              secondLastName: true,
              updatedAt: true,
            },
          },
          lastPasswordChangeAt: true,
        },
      });

      if (dbUser) {
        if (dbUser.lastPasswordChangeAt && token.iat) {
          const tokenIssuedAt = token.iat * 1000;
          if (tokenIssuedAt < dbUser.lastPasswordChangeAt.getTime()) {
            return null;
          }
        }

        // Si el usuario tiene empleado asociado, construir el nombre desde los datos del empleado
        // Esto asegura sincronización entre Employee y User.name
        if (dbUser.employee) {
          const employeeFullName = `${dbUser.employee.firstName} ${dbUser.employee.lastName}${
            dbUser.employee.secondLastName ? ` ${dbUser.employee.secondLastName}` : ""
          }`;
          token.name = employeeFullName;
        } else {
          token.name = dbUser.name;
        }

        token.email = dbUser.email;
        // Avatar sin timestamp - se cachea por 24h
        token.image = dbUser.image ? `/api/users/${token.id}/avatar` : null;
        token.role = dbUser.role;
        token.orgId = dbUser.orgId;
        token.mustChangePassword = dbUser.mustChangePassword;
        token.employeeId = dbUser.employee?.id ?? null;
        token.employeeOrgId = dbUser.employee?.orgId ?? null;
        const orgScope = await getUserOrgScope(token.id, dbUser.orgId, dbUser.role);
        token.activeOrgId = orgScope.activeOrgId ?? dbUser.orgId;
        token.accessibleOrgIds = orgScope.accessibleOrgIds;
        token.orgMemberships = orgScope.orgMemberships;
        if (token.activeOrgId) {
          token.orgId = token.activeOrgId;
        }
        token.lastPasswordChangeAt = dbUser.lastPasswordChangeAt?.toISOString() ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.orgId = (token.activeOrgId as string | undefined) ?? token.orgId;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.employeeId = token.employeeId ?? null;
        session.user.employeeOrgId = token.employeeOrgId ?? null;
        session.user.image = token.image ?? null;
        session.user.lastPasswordChangeAt = token.lastPasswordChangeAt ?? null;
        session.user.rememberMe = token.rememberMe ?? false;
        session.user.sessionExpiresAt = token.sessionExpiresAt ?? null;
        session.user.impersonatedById = token.impersonatedById ?? null;
        session.user.impersonatedByEmail = token.impersonatedByEmail ?? null;
        session.user.impersonatedByName = token.impersonatedByName ?? null;
        session.user.impersonationExpiresAt = token.impersonationExpiresAt ?? null;
        session.user.isImpersonating = Boolean(token.impersonatedById);
        session.user.activeOrgId = session.user.orgId;
        session.user.accessibleOrgIds =
          (Array.isArray(token.accessibleOrgIds) && token.accessibleOrgIds.length > 0
            ? token.accessibleOrgIds
            : session.user.orgId
              ? [session.user.orgId]
              : []) ?? [];
        session.user.orgMemberships = token.orgMemberships ?? [];
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const ipAddress = getRequestIp(request.headers);
        const userAgent = cleanHeaderValue(request.headers.get("user-agent"));
        const rawEmail = typeof credentials?.email === "string" ? credentials.email : "";
        const normalizedEmail = normalizeEmail(rawEmail);
        const rememberHint = parseRememberFlag(credentials?.remember);

        try {
          const rateLimitCheck = await checkLoginRateLimit({
            ipAddress,
            email: normalizedEmail,
          });

          if (rateLimitCheck.blocked) {
            await logLoginFailure({
              reason: "RATE_LIMIT",
              email: rawEmail === "" ? null : rawEmail,
              normalizedEmail,
              lockedUntil: rateLimitCheck.blockedUntil,
              ipAddress,
              userAgent,
              rememberMe: rememberHint,
            });
            throw new RateLimitedError();
          }

          // Validar entrada
          const validated = loginSchema.safeParse(credentials);
          if (!validated.success || !normalizedEmail) {
            await recordLoginFailureRateLimit({
              ipAddress,
              email: normalizedEmail,
            });
            await logLoginFailure({
              reason: "INVALID_INPUT",
              email: rawEmail === "" ? null : rawEmail,
              normalizedEmail,
              ipAddress,
              userAgent,
              rememberMe: rememberHint,
            });
            return null;
          }

          const rememberMe = validated.data.remember ?? false;

          // Buscar usuario con organización activa
          const user = await prisma.user.findFirst({
            where: {
              email: {
                equals: normalizedEmail,
                mode: "insensitive",
              },
            },
            include: {
              organization: true,
              employee: {
                select: {
                  id: true,
                  orgId: true,
                },
              },
            },
          });

          if (!user) {
            await recordLoginFailureRateLimit({
              ipAddress,
              email: normalizedEmail,
            });
            await logLoginFailure({
              reason: "USER_NOT_FOUND",
              email: rawEmail === "" ? null : rawEmail,
              normalizedEmail,
              ipAddress,
              userAgent,
              rememberMe,
            });
            return null;
          }

          const userLogPayload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            orgId: user.orgId,
          };

          if (!user.active) {
            await recordLoginFailureRateLimit({
              ipAddress,
              email: normalizedEmail,
            });
            await logLoginFailure({
              reason: "USER_INACTIVE",
              email: user.email,
              normalizedEmail,
              user: userLogPayload,
              ipAddress,
              userAgent,
              rememberMe,
            });
            return null;
          }

          // Verificar que la organización esté activa
          if (!user.organization || !user.organization.active) {
            await recordLoginFailureRateLimit({
              ipAddress,
              email: normalizedEmail,
            });
            await logLoginFailure({
              reason: "ORG_INACTIVE",
              email: user.email,
              normalizedEmail,
              user: userLogPayload,
              ipAddress,
              userAgent,
              rememberMe,
            });
            return null;
          }

          const now = new Date();
          if (user.passwordLockedUntil && user.passwordLockedUntil > now) {
            await recordLoginFailureRateLimit({
              ipAddress,
              email: normalizedEmail,
            });
            await logLoginFailure({
              reason: "ACCOUNT_LOCKED",
              email: user.email,
              normalizedEmail,
              user: userLogPayload,
              attempts: user.failedPasswordAttempts ?? 0,
              lockedUntil: user.passwordLockedUntil,
              ipAddress,
              userAgent,
              rememberMe,
            });
            throw new AccountLockedError();
          }

          if (user.passwordLockedUntil && user.passwordLockedUntil <= now && (user.failedPasswordAttempts ?? 0) > 0) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedPasswordAttempts: 0,
                passwordLockedUntil: null,
              },
            });
            user.failedPasswordAttempts = 0;
            user.passwordLockedUntil = null;
          }

          // Verificar contraseña
          const passwordValid = await bcrypt.compare(validated.data.password, user.password);

          if (!passwordValid) {
            const attempts = (user.failedPasswordAttempts ?? 0) + 1;
            const shouldLock = attempts >= MAX_PASSWORD_ATTEMPTS;
            const lockedUntil = shouldLock ? new Date(Date.now() + PASSWORD_LOCK_MINUTES * 60 * 1000) : null;

            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedPasswordAttempts: attempts,
                passwordLockedUntil: lockedUntil,
              },
            });

            await recordLoginFailureRateLimit({
              ipAddress,
              email: normalizedEmail,
            });
            await logLoginFailure({
              reason: "PASSWORD_MISMATCH",
              email: user.email,
              normalizedEmail,
              user: userLogPayload,
              attempts,
              lockedUntil,
              ipAddress,
              userAgent,
              rememberMe,
            });

            if (shouldLock) {
              void sendAccountLockedEmail({
                to: {
                  email: user.email,
                  name: user.name,
                },
                orgId: user.orgId,
                userId: user.id,
                lockedUntil,
                attempts,
              }).catch((error) => {
                console.error("Error enviando aviso de bloqueo:", error);
              });

              await prisma.auditLog.create({
                data: {
                  action: "ACCOUNT_LOCKED",
                  category: "SECURITY",
                  entityId: user.id,
                  entityType: "User",
                  entityData: {
                    email: user.email,
                    attempts,
                    lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
                  },
                  description: `Cuenta bloqueada por intentos fallidos (${user.email})`,
                  performedById: user.id,
                  performedByEmail: user.email,
                  performedByName: user.name,
                  performedByRole: user.role,
                  orgId: user.orgId,
                  ipAddress,
                  userAgent,
                },
              });

              void sendAccountLockedAdminAlerts({
                orgId: user.orgId,
                lockedUserId: user.id,
                lockedUserEmail: user.email,
                lockedUserName: user.name,
                attempts,
                lockedUntil,
                ipAddress,
                userAgent,
              });
              throw new AccountLockedError();
            }
            return null;
          }

          if ((user.failedPasswordAttempts ?? 0) > 0 || user.passwordLockedUntil) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedPasswordAttempts: 0,
                passwordLockedUntil: null,
              },
            });
          }

          await clearLoginRateLimitForUser({
            ipAddress,
            email: normalizedEmail,
          });

          // Retornar datos del usuario para el token
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            orgId: user.orgId,
            image: user.image,
            mustChangePassword: user.mustChangePassword,
            employeeId: user.employee?.id ?? null,
            employeeOrgId: user.employee?.orgId ?? null,
            lastPasswordChangeAt: user.lastPasswordChangeAt?.toISOString() ?? null,
            rememberMe,
          };
        } catch (error) {
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
    Credentials({
      id: "support-token",
      name: "support-token",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        try {
          const validated = supportTokenSchema.safeParse(credentials);
          if (!validated.success) {
            return null;
          }

          const rawToken = validated.data.token.trim();
          const tokenHash = createHash("sha256").update(rawToken).digest("hex");
          const now = new Date();

          const supportToken = await prisma.supportImpersonationToken.findFirst({
            where: {
              tokenHash,
              usedAt: null,
              expiresAt: { gt: now },
            },
            include: {
              user: {
                include: {
                  organization: {
                    select: {
                      active: true,
                    },
                  },
                  employee: {
                    select: {
                      id: true,
                      orgId: true,
                    },
                  },
                },
              },
              createdBy: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                },
              },
            },
          });

          if (!supportToken) {
            return null;
          }

          if (!supportToken.user.active) {
            return null;
          }

          if (!supportToken.user.organization?.active) {
            return null;
          }

          if (supportToken.createdBy.role !== "SUPER_ADMIN") {
            return null;
          }

          if (supportToken.user.role === "SUPER_ADMIN") {
            return null;
          }

          const supportSessionExpiresAt = Date.now() + supportToken.sessionMinutes * 60 * 1000;

          await prisma.$transaction([
            prisma.supportImpersonationToken.update({
              where: { id: supportToken.id },
              data: { usedAt: now },
            }),
            prisma.auditLog.create({
              data: {
                action: "SUPPORT_IMPERSONATION_STARTED",
                category: "SECURITY",
                entityId: supportToken.userId,
                entityType: "User",
                entityData: {
                  email: supportToken.user.email,
                  reason: supportToken.reason,
                  expiresAt: supportToken.expiresAt.toISOString(),
                  sessionMinutes: supportToken.sessionMinutes,
                },
                description: `Soporte inicio sesion como ${supportToken.user.email}`,
                performedById: supportToken.createdBy.id,
                performedByEmail: supportToken.createdBy.email ?? "",
                performedByName: supportToken.createdBy.name ?? supportToken.createdBy.email ?? "Superadmin",
                performedByRole: supportToken.createdBy.role,
                orgId: supportToken.user.orgId,
              },
            }),
          ]);

          return {
            id: supportToken.user.id,
            email: supportToken.user.email,
            name: supportToken.user.name,
            role: supportToken.user.role,
            orgId: supportToken.user.orgId,
            image: supportToken.user.image,
            mustChangePassword: supportToken.user.mustChangePassword,
            employeeId: supportToken.user.employee?.id ?? null,
            employeeOrgId: supportToken.user.employee?.orgId ?? null,
            lastPasswordChangeAt: supportToken.user.lastPasswordChangeAt?.toISOString() ?? null,
            rememberMe: false,
            supportSessionExpiresAt,
            impersonatedById: supportToken.createdBy.id,
            impersonatedByEmail: supportToken.createdBy.email,
            impersonatedByName: supportToken.createdBy.name ?? supportToken.createdBy.email ?? "Superadmin",
            impersonationExpiresAt: supportSessionExpiresAt,
          };
        } catch (error) {
          console.error("Support auth error:", error);
          return null;
        }
      },
    }),
  ],
});

// Tipos TypeScript
declare module "next-auth" {
  interface User {
    role: string;
    orgId: string;
    mustChangePassword: boolean;
    employeeId: string | null;
    employeeOrgId?: string | null;
    lastPasswordChangeAt?: string | null;
    rememberMe?: boolean;
    supportSessionExpiresAt?: number | null;
    impersonatedById?: string | null;
    impersonatedByEmail?: string | null;
    impersonatedByName?: string | null;
    impersonationExpiresAt?: number | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      orgId: string;
      activeOrgId?: string;
      accessibleOrgIds?: string[];
      orgMemberships?: OrgMembershipPayload[];
      mustChangePassword: boolean;
      employeeId: string | null;
      employeeOrgId?: string | null;
      image?: string | null;
      lastPasswordChangeAt?: string | null;
      rememberMe?: boolean;
      sessionExpiresAt?: number | null;
      impersonatedById?: string | null;
      impersonatedByEmail?: string | null;
      impersonatedByName?: string | null;
      impersonationExpiresAt?: number | null;
      isImpersonating?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    lastPasswordChangeAt?: string | null;
    rememberMe?: boolean;
    sessionExpiresAt?: number | null;
    impersonatedById?: string | null;
    impersonatedByEmail?: string | null;
    impersonatedByName?: string | null;
    impersonationExpiresAt?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    orgId: string;
    activeOrgId?: string | null;
    accessibleOrgIds?: string[];
    orgMemberships?: OrgMembershipPayload[];
    name?: string | null;
    email?: string | null;
    mustChangePassword?: boolean;
    employeeId?: string | null;
    employeeOrgId?: string | null;
    image?: string | null;
    rememberMe?: boolean;
    sessionExpiresAt?: number | null;
    impersonatedById?: string | null;
    impersonatedByEmail?: string | null;
    impersonatedByName?: string | null;
    impersonationExpiresAt?: number | null;
  }
}
