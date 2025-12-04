import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

// Schema de validación para login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

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
        token.id = user.id;
        token.role = user.role;
        token.orgId = user.orgId;
        token.name = user.name;
        token.email = user.email;
        token.mustChangePassword = user.mustChangePassword;
        token.employeeId = (user as typeof user & { employeeId?: string | null }).employeeId ?? null;
        // Avatar sin timestamp - se cachea por 24h
        token.image = user.image ? `/api/users/${user.id}/avatar` : null;
        return token;
      }

      if (!token.id) {
        return token;
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
              firstName: true,
              lastName: true,
              secondLastName: true,
              updatedAt: true,
            },
          },
        },
      });

      if (dbUser) {
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
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.orgId = token.orgId;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.employeeId = token.employeeId ?? null;
        session.user.image = token.image ?? null;
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
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      orgId: string;
      mustChangePassword: boolean;
      employeeId: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    orgId: string;
    name?: string | null;
    email?: string | null;
    mustChangePassword?: boolean;
    employeeId?: string | null;
    image?: string | null;
  }
}
