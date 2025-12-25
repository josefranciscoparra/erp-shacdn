"use client";

import Link from "next/link";

import { Building2, Loader2, ShieldAlert, Users } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useGroupUserManagement } from "@/hooks/use-group-user-management";
import { ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

export default function GroupUsersLandingPage() {
  const { groups, isLoading, error } = useGroupUserManagement();

  return (
    <PermissionGuard
      permissions={["manage_users", "manage_user_organizations"]}
      mode="all"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Usuarios por grupo" subtitle="Gestiona usuarios y permisos en grupos multiempresa" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para gestionar usuarios por grupo."
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Usuarios por grupo" subtitle="Gestiona usuarios y permisos en grupos multiempresa" />

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
          <EmptyState
            icon={<Building2 className="text-muted-foreground/40 mx-auto h-12 w-12" />}
            title="No tienes grupos asignados"
            description="Necesitas pertenecer a un grupo con rol HR Admin u Org Admin."
          />
        ) : (
          <div className="grid gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id} className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">{group.name}</span>
                    <Badge variant="outline">{ROLE_DISPLAY_NAMES[group.role]}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Gestiona usuarios y permisos dentro de las empresas asociadas a este grupo.
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button asChild className="w-full">
                    <Link href={`/g/${group.id}/dashboard/admin/users`}>
                      <Users className="mr-2 h-4 w-4" />
                      Entrar al grupo
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
