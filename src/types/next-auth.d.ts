import type { DefaultSession } from "next-auth";
import type { JWT as NextAuthJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: string;
    orgId: string;
    mustChangePassword: boolean;
    employeeId: string | null;
    supportSessionExpiresAt?: number | null;
    impersonatedById?: string | null;
    impersonatedByEmail?: string | null;
    impersonatedByName?: string | null;
    impersonationExpiresAt?: number | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      orgId: string;
      mustChangePassword: boolean;
      employeeId: string | null;
      impersonatedById?: string | null;
      impersonatedByEmail?: string | null;
      impersonatedByName?: string | null;
      impersonationExpiresAt?: number | null;
      isImpersonating?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id: string;
    role: string;
    orgId: string;
    mustChangePassword?: boolean;
    employeeId?: string | null;
    impersonatedById?: string | null;
    impersonatedByEmail?: string | null;
    impersonatedByName?: string | null;
    impersonationExpiresAt?: number | null;
  }
}

export {};
