"use client";

import Link from "next/link";

import type { Role } from "@prisma/client";
import { ArrowRight, Building2, Folders, Loader2, Shield, ShieldAlert, Sparkles, Users } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGroupUserManagement } from "@/hooks/use-group-user-management";
import { cn } from "@/lib/utils";
import { ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

// Colores hex sólidos para Safari - mismos que /dashboard/admin/users
const ROLE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  ORG_ADMIN: { bg: "#dbeafe", text: "#1d4ed8", darkBg: "#1e3a5f", darkText: "#93c5fd" }, // blue
  HR_ADMIN: { bg: "#dcfce7", text: "#15803d", darkBg: "#14532d", darkText: "#86efac" }, // green
  HR_ASSISTANT: { bg: "#ccfbf1", text: "#0f766e", darkBg: "#134e4a", darkText: "#5eead4" }, // teal
};

function RoleBadge({ role }: { role: Role }) {
  const colors = ROLE_COLORS[role];
  if (!colors) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
        <Shield className="h-3 w-3" />
        {ROLE_DISPLAY_NAMES[role]}
      </span>
    );
  }

  return (
    <>
      {/* Light mode */}
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium dark:hidden"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        <Shield className="h-3 w-3" />
        {ROLE_DISPLAY_NAMES[role]}
      </span>
      {/* Dark mode */}
      <span
        className="hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium dark:inline-flex"
        style={{ backgroundColor: colors.darkBg, color: colors.darkText }}
      >
        <Shield className="h-3 w-3" />
        {ROLE_DISPLAY_NAMES[role]}
      </span>
    </>
  );
}

export default function GroupUsersLandingPage() {
  const { groups, isLoading, error } = useGroupUserManagement();

  return (
    <PermissionGuard
      permissions={["manage_users", "manage_user_organizations"]}
      mode="all"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Administradores de grupo" subtitle="Gestiona accesos y permisos por grupo" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para gestionar usuarios por grupo."
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Administradores de grupo" subtitle="Administra accesos y permisos en tus grupos" />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <span className="text-muted-foreground ml-2">Cargando grupos...</span>
          </div>
        ) : error ? (
          <div className="text-destructive flex items-center justify-center py-12">
            <span>Error al cargar grupos: {error}</span>
          </div>
        ) : groups.length === 0 ? (
          <Card className="overflow-hidden border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-6 py-16">
              <div className="bg-muted rounded-2xl p-6">
                <Folders className="text-muted-foreground/60 h-12 w-12" />
              </div>
              <div className="max-w-sm text-center">
                <h3 className="text-foreground text-lg font-semibold">No tienes grupos asignados</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Para gestionar usuarios por grupo, necesitas pertenecer a un grupo con rol{" "}
                  <span className="text-foreground font-medium">HR Admin</span> u{" "}
                  <span className="text-foreground font-medium">Org Admin</span>.
                </p>
              </div>
              <div className="bg-muted/50 flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <Sparkles className="text-primary h-4 w-4" />
                <span className="text-muted-foreground">Contacta a un administrador para obtener acceso</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            {groups.map((group) => (
              <Card
                key={group.id}
                className={cn(
                  "group relative overflow-hidden transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-md",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                        <Building2 className="text-muted-foreground h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">{group.name}</CardTitle>
                        <CardDescription className="mt-0.5 text-xs">Grupo multiempresa</CardDescription>
                      </div>
                    </div>
                    <RoleBadge role={group.role} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <p className="text-muted-foreground text-sm">
                    {group.role === "ORG_ADMIN"
                      ? "Acceso completo para gestionar usuarios, permisos y configuración."
                      : "Gestiona empleados y procesos de RRHH en las empresas del grupo."}
                  </p>

                  <Button asChild className="w-full gap-2">
                    <Link href={`/g/${group.id}/dashboard/admin/users`}>
                      <Users className="h-4 w-4" />
                      <span>Gestionar administradores</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
