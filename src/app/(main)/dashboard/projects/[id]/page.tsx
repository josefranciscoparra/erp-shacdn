import { Suspense } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, BarChart3, Clock, FolderKanban, Globe, Lock, ShieldAlert, Users } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProjectById } from "@/server/actions/projects";

import { ProjectEmployeesTab } from "../_components/project-employees-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const resolvedParams = await params;

  return (
    <PermissionGuard
      permissions={["view_projects", "manage_projects"]}
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Detalle del Proyecto" />
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
          <ProjectContent projectId={resolvedParams.id} />
        </Suspense>
      </div>
    </PermissionGuard>
  );
}

async function ProjectContent({ projectId }: { projectId: string }) {
  const { success, project } = await getProjectById(projectId);

  if (!success || !project) {
    notFound();
  }

  const assignmentCount = project._count.assignments;
  const timeEntryCount = project._count.timeEntries;

  return (
    <>
      {/* Header con navegación */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Proyectos
          </Link>
        </Button>

        <div className="flex flex-col gap-2 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {project.color && <div className="h-5 w-5 rounded-full" style={{ backgroundColor: project.color }} />}
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              {project.code && (
                <Badge variant="outline" className="font-mono">
                  {project.code}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  project.accessType === "OPEN"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    : "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                }
              >
                {project.accessType === "OPEN" ? (
                  <>
                    <Globe className="mr-1 h-3 w-3" />
                    Abierto
                  </>
                ) : (
                  <>
                    <Lock className="mr-1 h-3 w-3" />
                    Asignado
                  </>
                )}
              </Badge>
              {project.isActive ? (
                <Badge variant="default">Activo</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Inactivo
                </Badge>
              )}
            </div>
            {project.description && <p className="text-muted-foreground mt-2 text-sm">{project.description}</p>}
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 @xl/main:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {project.accessType === "OPEN" ? "Acceso" : "Empleados Asignados"}
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {project.accessType === "OPEN" ? (
              <>
                <div className="text-2xl font-bold">Todos</div>
                <p className="text-muted-foreground text-xs">Todos los empleados pueden fichar</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{assignmentCount}</div>
                <p className="text-muted-foreground text-xs">
                  {assignmentCount === 0 && "Sin empleados asignados"}
                  {assignmentCount === 1 && "empleado asignado"}
                  {assignmentCount > 1 && "empleados asignados"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fichajes</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeEntryCount}</div>
            <p className="text-muted-foreground text-xs">
              {timeEntryCount === 0 && "Sin fichajes registrados"}
              {timeEntryCount === 1 && "fichaje registrado"}
              {timeEntryCount > 1 && "fichajes registrados"}
            </p>
            {timeEntryCount > 0 && (
              <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs" asChild>
                <Link href={`/dashboard/projects/${project.id}/reports`}>
                  <BarChart3 className="mr-1 h-3 w-3" />
                  Ver informes
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Proyecto</CardTitle>
            <FolderKanban className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.isActive ? "Activo" : "Inactivo"}</div>
            <p className="text-muted-foreground text-xs">
              {project.isActive ? "Proyecto operativo" : "No permite nuevos fichajes"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de configuración */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">
            <FolderKanban className="mr-2 h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="mr-2 h-4 w-4" />
            Empleados
            {project.accessType === "ASSIGNED" && ` (${assignmentCount})`}
          </TabsTrigger>
          <TabsTrigger value="reports" asChild>
            <Link href={`/dashboard/projects/${project.id}/reports`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Informes
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Proyecto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 @lg/main:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Nombre</p>
                  <p className="text-sm">{project.name}</p>
                </div>

                {project.code && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Código</p>
                    <p className="font-mono text-sm">{project.code}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Tipo de Acceso</p>
                  <Badge
                    variant="outline"
                    className={
                      project.accessType === "OPEN"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        : "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                    }
                  >
                    {project.accessType === "OPEN" ? (
                      <>
                        <Globe className="mr-1 h-3 w-3" />
                        Abierto - Todos los empleados
                      </>
                    ) : (
                      <>
                        <Lock className="mr-1 h-3 w-3" />
                        Asignado - Solo empleados asignados
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Estado</p>
                  <Badge variant={project.isActive ? "default" : "outline"}>
                    {project.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                {project.color && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Color</p>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: project.color }} />
                      <span className="font-mono text-sm">{project.color}</span>
                    </div>
                  </div>
                )}
              </div>

              {project.description && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Descripción</p>
                  <p className="text-sm">{project.description}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid gap-4 @lg/main:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Fecha de creación</p>
                    <p className="text-sm">{new Date(project.createdAt).toLocaleDateString("es-ES")}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Última actualización</p>
                    <p className="text-sm">{new Date(project.updatedAt).toLocaleDateString("es-ES")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <ProjectEmployeesTab projectId={project.id} projectName={project.name} accessType={project.accessType} />
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
