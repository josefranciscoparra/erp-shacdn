import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema de validación para login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
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
      }
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.orgId = user.orgId
        token.name = user.name
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.orgId = token.orgId as string
        session.user.name = token.name as string
        session.user.email = token.email as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log("🔍 Intento de login:", credentials?.email);
          // Validar entrada
          const validated = loginSchema.safeParse(credentials)
          if (!validated.success) {
            console.error("❌ Validation failed:", validated.error)
            return null
          }

          // Buscar usuario con organización activa
          const user = await prisma.user.findUnique({
            where: { 
              email: validated.data.email,
              active: true,
            },
            include: {
              organization: true,
            }
          })

          if (!user) {
            console.error("User not found:", validated.data.email)
            return null
          }

          // Verificar que la organización esté activa
          if (!user.organization.active) {
            console.error("Organization inactive for user:", user.email)
            return null
          }

          // Verificar contraseña
          const passwordValid = await bcrypt.compare(
            validated.data.password,
            user.password
          )

          if (!passwordValid) {
            console.error("Invalid password for user:", user.email)
            return null
          }

          // Retornar datos del usuario para el token
          console.log("✅ Login exitoso para:", user.email, "Rol:", user.role);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            orgId: user.orgId,
            image: user.image,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
})

// Tipos TypeScript
declare module "next-auth" {
  interface User {
    role: string
    orgId: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      orgId: string
      image?: string | null
    }
  }
}
