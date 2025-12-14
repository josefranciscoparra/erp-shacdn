import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

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

const SHORT_SESSION_SECONDS = 12 * 60 * 60; // 12 horas para sesiones estándar
const LONG_SESSION_SECONDS = 30 * 24 * 60 * 60; // 30 días para "Recordarme"

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
        token.sessionExpiresAt = Date.now() + (token.rememberMe ? LONG_SESSION_SECONDS : SHORT_SESSION_SECONDS) * 1000;
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
      async authorize(credentials) {
        try {
          // Validar entrada
          const validated = loginSchema.safeParse(credentials);
          if (!validated.success) {
            return null;
          }

          const rememberMe = validated.data.remember ?? false;

          // Buscar usuario con organización activa
          const user = await prisma.user.findFirst({
            where: {
              email: validated.data.email,
              active: true,
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
            return null;
          }

          // Verificar que la organización esté activa
          if (!user.organization || !user.organization.active) {
            return null;
          }

          // Verificar contraseña
          const passwordValid = await bcrypt.compare(validated.data.password, user.password);

          if (!passwordValid) {
            return null;
          }

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
          console.error("Auth error:", error);
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
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    lastPasswordChangeAt?: string | null;
    rememberMe?: boolean;
    sessionExpiresAt?: number | null;
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
  }
}
