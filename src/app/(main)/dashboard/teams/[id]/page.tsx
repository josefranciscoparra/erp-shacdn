import { Suspense } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Building2, ShieldAlert, Users, UserCog } from "lucide-react";

import { ResponsiblesTab } from "@/components/area-responsibilities/responsibles-tab";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTeamById } from "@/server/actions/teams";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const resolvedParams = await params;

  return (
    <PermissionGuard
      permission="view_teams"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Detalle del Equipo" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <Suspense fallback={<LoadingState />}>
          <TeamContent teamId={resolvedParams.id} />
        </Suspense>
      </div>
    </PermissionGuard>
  );
}

async function TeamContent({ teamId }: { teamId: string }) {
  const { success, team } = await getTeamById(teamId);

  if (!success || !team) {
    notFound();
  }

  const employeeCount = team._count.employees; // Empleados asignados directamente al equipo
  const responsibleCount = team._count.areaResponsibles;

  return (
    <>
      {/* Header con navegación */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard/teams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Equipos
          </Link>
        </Button>

        <div className="flex flex-col gap-2 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
              {team.code && (
                <Badge variant="outline" className="font-mono">
                  {team.code}
                </Badge>
              )}
              {team.isActive ? (
                <Badge variant="default">Activo</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Inactivo
                </Badge>
              )}
            </div>
            {team.description && <p className="text-muted-foreground mt-2 text-sm">{team.description}</p>}
            {team.costCenter && (
              <div className="mt-2 flex items-center gap-2">
                <Building2 className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground text-sm">
                  Centro: <span className="font-medium">{team.costCenter.name}</span>
                  {team.costCenter.code && <span className="font-mono text-xs"> ({team.costCenter.code})</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 @xl/main:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Asignados</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
            <p className="text-muted-foreground text-xs">
              {employeeCount === 0 && "Sin empleados asignados"}
              {employeeCount === 1 && "empleado activo"}
              {employeeCount > 1 && "empleados activos"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responsables Activos</CardTitle>
            <UserCog className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responsibleCount}</div>
            <p className="text-muted-foreground text-xs">
              {responsibleCount === 0 && "Sin responsables asignados"}
              {responsibleCount === 1 && "responsable activo"}
              {responsibleCount > 1 && "responsables activos"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Equipo</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.isActive ? "Activo" : "Inactivo"}</div>
            <p className="text-muted-foreground text-xs">{team.isActive ? "Equipo operativo" : "Equipo desactivado"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de configuración */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="mr-2 h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="responsibles">
            <UserCog className="mr-2 h-4 w-4" />
            Responsables ({responsibleCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Equipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 @lg/main:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Nombre</p>
                  <p className="text-sm">{team.name}</p>
                </div>

                {team.code && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Código</p>
                    <p className="font-mono text-sm">{team.code}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Estado</p>
                  <Badge variant={team.isActive ? "default" : "outline"}>{team.isActive ? "Activo" : "Inactivo"}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Empleados</p>
                  <p className="text-sm">{employeeCount} empleados asignados</p>
                </div>

                {team.costCenter && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Centro de Coste</p>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/cost-centers/${team.costCenter.id}`}
                        className="text-primary text-sm hover:underline"
                      >
                        {team.costCenter.name}
                      </Link>
                      {team.costCenter.code && (
                        <span className="text-muted-foreground font-mono text-xs">({team.costCenter.code})</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {team.description && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Descripción</p>
                  <p className="text-sm">{team.description}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid gap-4 @lg/main:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Fecha de creación</p>
                    <p className="text-sm">{new Date(team.createdAt).toLocaleDateString("es-ES")}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Última actualización</p>
                    <p className="text-sm">{new Date(team.updatedAt).toLocaleDateString("es-ES")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responsibles" className="space-y-4">
          <ResponsiblesTab scope="TEAM" scopeId={team.id} scopeName={team.name} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 @xl/main:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
