import { NextResponse, type NextRequest } from "next/server";

// Rutas públicas que no requieren autenticación
const publicRoutes = ["/auth/login", "/api/auth", "/"];

// Rutas por rol
const roleRoutes = {
  SUPER_ADMIN: ["/admin", "/dashboard", "/employees", "/settings"],
  ORG_ADMIN: ["/dashboard", "/employees", "/settings", "/admin/users"],
  HR_ADMIN: ["/dashboard", "/employees", "/timeclock", "/pto", "/admin/users"],
  MANAGER: ["/dashboard", "/employees", "/timeclock", "/pto"],
  EMPLOYEE: ["/dashboard", "/timeclock", "/pto"],
};

function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  if (typeof atob !== "function") {
    return null;
  }

  try {
    const json = atob(padded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas y recursos estáticos
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const secureToken = request.cookies.get("__Secure-next-auth.session-token")?.value;
  const sessionToken = secureToken ?? request.cookies.get("next-auth.session-token")?.value;

  if (!sessionToken) {
    // Redirigir al login si no está autenticado
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const session = decodeJwtPayload<{
    id?: string;
    sub?: string;
    role?: string;
    orgId?: string;
    name?: string;
    email?: string;
    exp?: number;
  }>(sessionToken);

  if (!session || !session.role || !session.orgId) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (session.exp && session.exp * 1000 < Date.now()) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Verificar permisos por rol
  const userRole = session.role as keyof typeof roleRoutes;
  const allowedRoutes = roleRoutes[userRole] || [];

  // Verificar si el usuario tiene acceso a la ruta
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!hasAccess && pathname !== "/unauthorized") {
    // Redirigir a página de no autorizado
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Añadir headers con información del usuario (para multi-tenancy)
  const response = NextResponse.next();
  const userId = session.id ?? session.sub ?? "";
  if (userId) {
    response.headers.set("X-User-Id", userId);
  }
  response.headers.set("X-User-Role", session.role);
  response.headers.set("X-Org-Id", session.orgId);

  return response;
}

export const config = {
  matcher: [
    // Excluir rutas de API del middleware para permitir que los handlers manejen auth y errores
    // y evitar redirecciones HTML en llamadas fetch.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
