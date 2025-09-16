# 📚 ERP Implementation Guide - Part 1: Arquitectura y Seguridad

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico Definitivo

```typescript
// Frontend
- Next.js 15.5.2 (App Router)
- React 19.1.1
- TypeScript 5.9.2
- TanStack Query 5.87.1 (data fetching)
- Zustand 5.0.8 (estado global)
- React Hook Form 7.62.0 + Zod 3.25.76
- shadcn/ui + Tailwind CSS v4

// Backend
- tRPC (type-safe API)
- Prisma ORM
- PostgreSQL (local → Azure)
- Redis (sesiones y caché)
- BullMQ (colas de trabajo)

// Auth & Security
- NextAuth v5 (Auth.js)
- bcryptjs (hashing)
- JWT sessions
- Iron Session (cookies seguros)

// Storage
- Local: sistema de archivos
- Producción: Azure Blob Storage

// Observabilidad
- Pino (logging estructurado)
- Sentry (error tracking)
- OpenTelemetry (tracing)
```

### Estructura de Carpetas

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Layout público
│   │   ├── login/
│   │   ├── register/
│   │   └── onboarding/
│   ├── (app)/                    # Layout autenticado
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── timeclock/
│   │   ├── pto/
│   │   ├── shifts/
│   │   ├── payroll/
│   │   └── settings/
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── trpc/[trpc]/
│       └── webhooks/
├── server/
│   ├── api/
│   │   ├── root.ts               # tRPC root router
│   │   ├── trpc.ts               # tRPC context & middleware
│   │   └── routers/
│   ├── db/
│   │   ├── client.ts             # Prisma client singleton
│   │   └── redis.ts              # Redis client
│   ├── services/                 # Lógica de negocio
│   ├── jobs/                     # Background jobs
│   └── utils/
├── lib/
│   ├── auth/                     # NextAuth config
│   ├── permissions/              # RBAC/ABAC
│   ├── validations/              # Zod schemas
│   └── utils/
└── components/
    ├── ui/                       # shadcn/ui
    └── features/                 # Componentes de dominio
```

## 🔐 Arquitectura de Seguridad Multi-Capa

### 1. Capa de Autenticación

```typescript
// src/lib/auth/auth.config.ts
import { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { loginSchema } from "@/lib/validations/auth"
import { verifyPassword } from "@/lib/auth/password"
import { prisma } from "@/server/db/client"

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        // 1. Validación de entrada
        const validated = loginSchema.safeParse(credentials)
        if (!validated.success) return null
        
        // 2. Rate limiting check
        const rateLimitOk = await checkRateLimit(validated.data.email)
        if (!rateLimitOk) {
          throw new Error("Too many attempts")
        }
        
        // 3. Buscar usuario con organización activa
        const user = await prisma.user.findUnique({
          where: { 
            email: validated.data.email,
            active: true,
            organization: { active: true }
          },
          include: { 
            organization: true,
            employee: true
          }
        })
        
        if (!user) {
          await logFailedAttempt(validated.data.email)
          return null
        }
        
        // 4. Verificar contraseña
        const valid = await verifyPassword(
          validated.data.password,
          user.password
        )
        
        if (!valid) {
          await logFailedAttempt(validated.data.email)
          return null
        }
        
        // 5. Audit log
        await prisma.auditLog.create({
          data: {
            action: "USER_LOGIN",
            userId: user.id,
            orgId: user.orgId,
            ip: credentials.ip,
            userAgent: credentials.userAgent,
            timestamp: new Date()
          }
        })
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          image: user.image
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.orgId = user.orgId
        token.role = user.role
        token.employeeId = user.employee?.id
      }
      
      // Refresh token rotation
      if (trigger === "update") {
        return { ...token, ...session.user }
      }
      
      return token
    },
    
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.orgId = token.orgId as string
      session.user.role = token.role as string
      session.user.employeeId = token.employeeId as string
      
      // Verificar que el usuario sigue activo
      const stillActive = await prisma.user.findFirst({
        where: { 
          id: token.id,
          active: true,
          organization: { active: true }
        }
      })
      
      if (!stillActive) {
        throw new Error("User deactivated")
      }
      
      return session
    }
  },
  
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/onboarding"
  },
  
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  
  events: {
    signOut: async ({ token }) => {
      await prisma.auditLog.create({
        data: {
          action: "USER_LOGOUT",
          userId: token?.sub,
          orgId: token?.orgId,
          timestamp: new Date()
        }
      })
    }
  }
}
```

### 2. Capa de Autorización (RBAC + ABAC)

```typescript
// src/lib/permissions/rbac.ts
export const PERMISSIONS = {
  // Empleados
  EMPLOYEE_VIEW_OWN: "employee:view:own",
  EMPLOYEE_VIEW_ALL: "employee:view:all",
  EMPLOYEE_CREATE: "employee:create",
  EMPLOYEE_UPDATE_OWN: "employee:update:own",
  EMPLOYEE_UPDATE_ALL: "employee:update:all",
  EMPLOYEE_DELETE: "employee:delete",
  
  // Fichajes
  TIMECLOCK_VIEW_OWN: "timeclock:view:own",
  TIMECLOCK_VIEW_TEAM: "timeclock:view:team",
  TIMECLOCK_VIEW_ALL: "timeclock:view:all",
  TIMECLOCK_APPROVE: "timeclock:approve",
  TIMECLOCK_EDIT: "timeclock:edit",
  
  // PTO
  PTO_REQUEST: "pto:request",
  PTO_VIEW_OWN: "pto:view:own",
  PTO_VIEW_TEAM: "pto:view:team",
  PTO_VIEW_ALL: "pto:view:all",
  PTO_APPROVE_TEAM: "pto:approve:team",
  PTO_APPROVE_ALL: "pto:approve:all",
  
  // Nómina
  PAYROLL_VIEW: "payroll:view",
  PAYROLL_EXPORT: "payroll:export",
  PAYROLL_CONFIGURE: "payroll:configure",
  
  // Admin
  ORG_MANAGE: "org:manage",
  SETTINGS_MANAGE: "settings:manage",
} as const

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  
  ORG_ADMIN: Object.values(PERMISSIONS),
  
  HR_ADMIN: [
    PERMISSIONS.EMPLOYEE_VIEW_ALL,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE_ALL,
    PERMISSIONS.EMPLOYEE_DELETE,
    PERMISSIONS.TIMECLOCK_VIEW_ALL,
    PERMISSIONS.TIMECLOCK_APPROVE,
    PERMISSIONS.TIMECLOCK_EDIT,
    PERMISSIONS.PTO_VIEW_ALL,
    PERMISSIONS.PTO_APPROVE_ALL,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_EXPORT,
    PERMISSIONS.PAYROLL_CONFIGURE,
  ],
  
  MANAGER: [
    PERMISSIONS.EMPLOYEE_VIEW_ALL,
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.TIMECLOCK_VIEW_TEAM,
    PERMISSIONS.TIMECLOCK_VIEW_OWN,
    PERMISSIONS.PTO_REQUEST,
    PERMISSIONS.PTO_VIEW_OWN,
    PERMISSIONS.PTO_VIEW_TEAM,
    PERMISSIONS.PTO_APPROVE_TEAM,
  ],
  
  EMPLOYEE: [
    PERMISSIONS.EMPLOYEE_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_UPDATE_OWN,
    PERMISSIONS.TIMECLOCK_VIEW_OWN,
    PERMISSIONS.PTO_REQUEST,
    PERMISSIONS.PTO_VIEW_OWN,
  ]
} as const

// Función de verificación con contexto
export async function can(
  user: { role: Role; id: string; orgId: string },
  permission: Permission,
  resource?: { 
    ownerId?: string; 
    orgId?: string; 
    teamId?: string 
  }
): Promise<boolean> {
  // 1. Verificar permisos del rol
  const rolePerms = ROLE_PERMISSIONS[user.role]
  if (!rolePerms.includes(permission)) {
    return false
  }
  
  // 2. Verificar contexto (ABAC)
  if (resource) {
    // Multi-tenancy check
    if (resource.orgId && resource.orgId !== user.orgId) {
      return false
    }
    
    // Ownership check
    if (permission.includes(":own") && resource.ownerId !== user.id) {
      return false
    }
    
    // Team check para managers
    if (permission.includes(":team")) {
      const isTeamManager = await checkTeamManager(user.id, resource.teamId)
      if (!isTeamManager) return false
    }
  }
  
  return true
}
```

### 3. Middleware de Seguridad

```typescript
// src/middleware.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/security/rate-limit"
import { validateCSRF } from "@/lib/security/csrf"

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  
  // 1. Rate Limiting Global
  const identifier = session?.user?.id || req.ip || "anonymous"
  const rateLimitResult = await rateLimit(identifier, {
    requests: 100,
    window: "1m"
  })
  
  if (!rateLimitResult.success) {
    return new NextResponse("Too Many Requests", { status: 429 })
  }
  
  // 2. CSRF Protection para mutaciones
  if (req.method !== "GET" && req.method !== "HEAD") {
    const csrfValid = await validateCSRF(req)
    if (!csrfValid) {
      return new NextResponse("Invalid CSRF Token", { status: 403 })
    }
  }
  
  // 3. Security Headers
  const headers = new Headers(req.headers)
  headers.set("X-Frame-Options", "DENY")
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("X-XSS-Protection", "1; mode=block")
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  )
  
  // 4. Rutas públicas
  const publicRoutes = ["/", "/auth/login", "/auth/register", "/api/health"]
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next({ headers })
  }
  
  // 5. Verificar autenticación
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }
  
  // 6. Verificar organización activa
  if (!session.user.orgId) {
    return NextResponse.redirect(new URL("/onboarding", req.url))
  }
  
  // 7. Rutas protegidas por rol
  const roleRoutes = {
    "/admin": ["ORG_ADMIN", "SUPER_ADMIN"],
    "/payroll": ["HR_ADMIN", "ORG_ADMIN"],
    "/settings": ["HR_ADMIN", "ORG_ADMIN"],
  }
  
  for (const [route, roles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route) && !roles.includes(session.user.role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
  }
  
  // 8. Audit log para acciones sensibles
  const sensitiveRoutes = ["/payroll", "/settings", "/admin"]
  if (sensitiveRoutes.some(route => pathname.startsWith(route))) {
    await logAccess(session.user.id, pathname, req.method)
  }
  
  return NextResponse.next({ headers })
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
```

### 4. Validación y Sanitización de Datos

```typescript
// src/lib/validations/employee.ts
import { z } from "zod"

// Validación NIF/NIE español
const nifNieRegex = /^[XYZ]?\d{7,8}[A-Z]$/i

export const createEmployeeSchema = z.object({
  // Datos personales
  firstName: z.string()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras y espacios")
    .transform(val => val.trim()),
    
  lastName: z.string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras y espacios")
    .transform(val => val.trim()),
    
  email: z.string()
    .email("Email inválido")
    .toLowerCase()
    .transform(val => val.trim()),
    
  nifNie: z.string()
    .regex(nifNieRegex, "NIF/NIE inválido")
    .transform(val => val.toUpperCase().trim())
    .refine(validateNifNie, "NIF/NIE inválido"),
    
  phone: z.string()
    .regex(/^[6789]\d{8}$/, "Teléfono inválido")
    .optional()
    .nullable(),
    
  birthDate: z.date()
    .refine(date => {
      const age = Math.floor((Date.now() - date.getTime()) / 31557600000)
      return age >= 16 && age <= 70
    }, "Edad debe estar entre 16 y 70 años"),
    
  // Datos bancarios
  iban: z.string()
    .regex(/^ES\d{22}$/, "IBAN español inválido")
    .optional()
    .nullable()
    .refine(validateIBAN, "IBAN inválido"),
    
  // Dirección
  address: z.string()
    .max(200)
    .transform(val => sanitizeHtml(val))
    .optional(),
    
  postalCode: z.string()
    .regex(/^\d{5}$/, "Código postal inválido")
    .optional(),
    
  // Contrato
  contractType: z.enum(["PERMANENT", "TEMPORARY", "INTERNSHIP", "FREELANCE"]),
  
  weeklyHours: z.number()
    .min(1, "Mínimo 1 hora")
    .max(40, "Máximo 40 horas"),
    
  salary: z.number()
    .min(0)
    .max(1000000)
    .optional(),
    
  // Relaciones
  departmentId: z.string().cuid().optional(),
  costCenterId: z.string().cuid().optional(),
  managerId: z.string().cuid().optional(),
})

// Función de validación NIF/NIE
function validateNifNie(value: string): boolean {
  const nifLetters = "TRWAGMYFPDXBNJZSQVHLCKE"
  const nieLetters = "XYZ"
  
  const firstChar = value.charAt(0)
  let number: number
  
  if (nieLetters.includes(firstChar)) {
    number = parseInt(value.substr(1, 7), 10)
    if (firstChar === "Y") number += 10000000
    if (firstChar === "Z") number += 20000000
  } else {
    number = parseInt(value.substr(0, 8), 10)
  }
  
  const letter = value.charAt(value.length - 1)
  const expectedLetter = nifLetters.charAt(number % 23)
  
  return letter === expectedLetter
}

// Sanitización HTML
function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}
```

### 5. Protección de API con tRPC

```typescript
// src/server/api/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server"
import { type CreateNextContextOptions } from "@trpc/server/adapters/next"
import superjson from "superjson"
import { ZodError } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/server/db/client"
import { rateLimit } from "@/lib/security/rate-limit"

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const session = await auth()
  
  return {
    session,
    prisma,
    req: opts.req,
    res: opts.res,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// Middleware: Logging
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start
  
  console.log({
    path,
    type,
    duration,
    ok: result.ok,
  })
  
  return result
})

// Middleware: Rate Limiting
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const identifier = ctx.session?.user?.id || ctx.req.headers["x-forwarded-for"] || "anonymous"
  
  const { success } = await rateLimit(identifier, {
    requests: 50,
    window: "1m",
  })
  
  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Demasiadas solicitudes",
    })
  }
  
  return next()
})

// Middleware: Autenticación requerida
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

// Middleware: Multi-tenancy
const enforceOrgContext = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.orgId) {
    throw new TRPCError({ 
      code: "FORBIDDEN",
      message: "Organización no configurada" 
    })
  }
  
  return next({
    ctx: {
      orgId: ctx.session.user.orgId,
    },
  })
})

// Middleware: Permisos
export const withPermission = (permission: string) => {
  return t.middleware(async ({ ctx, next }) => {
    const hasPermission = await can(ctx.session.user, permission)
    
    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Sin permisos suficientes",
      })
    }
    
    return next()
  })
}

// Exportar routers
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure.use(loggerMiddleware).use(rateLimitMiddleware)
export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(rateLimitMiddleware)
  .use(enforceUserIsAuthed)
  .use(enforceOrgContext)
```

### 6. Encriptación de Datos Sensibles

```typescript
// src/lib/security/encryption.ts
import crypto from "crypto"

const algorithm = "aes-256-gcm"
const keyLength = 32
const ivLength = 16
const tagLength = 16
const saltLength = 64

// Derivar clave desde password
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, keyLength, "sha256")
}

// Encriptar datos sensibles
export function encrypt(text: string): string {
  const password = process.env.ENCRYPTION_KEY!
  const salt = crypto.randomBytes(saltLength)
  const key = deriveKey(password, salt)
  const iv = crypto.randomBytes(ivLength)
  
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ])
  
  const tag = cipher.getAuthTag()
  
  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64")
}

// Desencriptar datos
export function decrypt(encryptedData: string): string {
  const password = process.env.ENCRYPTION_KEY!
  const buffer = Buffer.from(encryptedData, "base64")
  
  const salt = buffer.slice(0, saltLength)
  const iv = buffer.slice(saltLength, saltLength + ivLength)
  const tag = buffer.slice(saltLength + ivLength, saltLength + ivLength + tagLength)
  const encrypted = buffer.slice(saltLength + ivLength + tagLength)
  
  const key = deriveKey(password, salt)
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(tag)
  
  return decipher.update(encrypted) + decipher.final("utf8")
}

// Hook para campos encriptados en Prisma
export const encryptedField = {
  set(value: string): string {
    return encrypt(value)
  },
  get(value: string): string {
    return decrypt(value)
  }
}
```

### 7. Audit Logging

```typescript
// src/lib/security/audit.ts
import { prisma } from "@/server/db/client"

interface AuditLogEntry {
  action: string
  entityType?: string
  entityId?: string
  userId: string
  orgId: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ...entry,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        timestamp: new Date(),
      }
    })
  } catch (error) {
    // Log to external service if DB fails
    console.error("Audit log failed:", error)
    // Send to Sentry/CloudWatch/etc
  }
}

// Middleware para audit automático
export function withAudit(action: string) {
  return async (ctx: any, input: any, next: any) => {
    const result = await next()
    
    if (result.ok) {
      await auditLog({
        action,
        userId: ctx.session.user.id,
        orgId: ctx.session.user.orgId,
        metadata: { input, result: result.data },
        ip: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      })
    }
    
    return result
  }
}
```

## 🚀 Instalación y Configuración Inicial

### 1. Instalar Dependencias

```bash
# Core
npm install next@latest react@latest react-dom@latest
npm install @prisma/client prisma
npm install next-auth@beta @auth/prisma-adapter

# tRPC
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next superjson

# Validación y Forms
npm install zod react-hook-form @hookform/resolvers

# Seguridad
npm install bcryptjs iron-session csrf
npm install @upstash/ratelimit @upstash/redis

# Utilidades
npm install date-fns uuid nanoid
npm install pino pino-pretty

# Tipos
npm install -D @types/node @types/bcryptjs
```

### 2. Variables de Entorno

```bash
# .env.local
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/erp_dev"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-change-in-production"

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key-here"

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Monitoring
SENTRY_DSN=""
```

### 3. Configuración de Prisma

```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

## 📝 Checklist de Seguridad

- [x] Autenticación con NextAuth v5
- [x] Sesiones JWT seguras
- [x] RBAC + ABAC para autorización
- [x] Rate limiting en todas las rutas
- [x] CSRF protection
- [x] XSS protection (sanitización)
- [x] SQL injection prevention (Prisma)
- [x] Validación con Zod
- [x] Encriptación de datos sensibles
- [x] Audit logging completo
- [x] Security headers
- [x] Password hashing con bcrypt
- [x] Multi-tenancy isolation
- [x] Input sanitization
- [x] Error handling seguro

---

**Continúa en PART 2: Modelos y API →**