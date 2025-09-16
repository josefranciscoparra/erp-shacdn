import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  "/auth/v2/login",
  "/auth/v2/register",
  "/auth/v1/login",
  "/auth/v1/register",
  "/api/auth",
  "/",
]

// Rutas por rol
const roleRoutes = {
  SUPER_ADMIN: ["/admin", "/dashboard", "/employees", "/settings"],
  ORG_ADMIN: ["/dashboard", "/employees", "/settings"],
  HR_ADMIN: ["/dashboard", "/employees", "/timeclock", "/pto"],
  MANAGER: ["/dashboard", "/employees", "/timeclock", "/pto"],
  EMPLOYEE: ["/dashboard", "/timeclock", "/pto"],
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas y recursos estáticos
  if (
    publicRoutes.some(route => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Verificar autenticación
  const session = await auth()

  if (!session) {
    // Redirigir al login si no está autenticado
    return NextResponse.redirect(new URL("/auth/v2/login", request.url))
  }

  // Verificar permisos por rol
  const userRole = session.user?.role as keyof typeof roleRoutes
  const allowedRoutes = roleRoutes[userRole] || []

  // Verificar si el usuario tiene acceso a la ruta
  const hasAccess = allowedRoutes.some(route => pathname.startsWith(route))

  if (!hasAccess && pathname !== "/unauthorized") {
    // Redirigir a página de no autorizado
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  // Añadir headers con información del usuario (para multi-tenancy)
  const response = NextResponse.next()
  response.headers.set("X-User-Id", session.user.id)
  response.headers.set("X-User-Role", session.user.role)
  response.headers.set("X-Org-Id", session.user.orgId)

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}