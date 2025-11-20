import { Suspense } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Building2, ShieldAlert, Users, UserCog } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCostCenterById } from "@/server/actions/cost-centers";

import { ResponsiblesTab } from "./_components/responsibles-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CostCenterDetailPage({ params }: PageProps) {
  const resolvedParams = await params;

  return (
    <PermissionGuard
      permission="view_cost_centers"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Detalle del Centro" />
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
          <CostCenterContent centerId={resolvedParams.id} />
        </Suspense>
      </div>
    </PermissionGuard>
  );
}

async function CostCenterContent({ centerId }: { centerId: string }) {
  const { success, costCenter } = await getCostCenterById(centerId);

  if (!success || !costCenter) {
    notFound();
  }

  const employeeCount = costCenter._count.employmentContracts; // Contratos activos = empleados asignados
  const responsibleCount = costCenter._count.areaResponsibles;

  return (
    <>
      {/* Header con navegación */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard/cost-centers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Centros de Coste
          </Link>
        </Button>

        <div className="flex flex-col gap-2 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{costCenter.name}</h1>
              {costCenter.code && (
                <Badge variant="outline" className="font-mono">
                  {costCenter.code}
                </Badge>
              )}
              {costCenter.active ? (
                <Badge variant="default">Activo</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Inactivo
                </Badge>
              )}
            </div>
            {costCenter.description && <p className="text-muted-foreground mt-2 text-sm">{costCenter.description}</p>}
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
            <CardTitle className="text-sm font-medium">Estado del Centro</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costCenter.active ? "Activo" : "Inactivo"}</div>
            <p className="text-muted-foreground text-xs">
              {costCenter.active ? "Centro operativo" : "Centro desactivado"}
            </p>
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
              <CardTitle>Información del Centro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 @lg/main:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Nombre</p>
                  <p className="text-sm">{costCenter.name}</p>
                </div>

                {costCenter.code && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Código</p>
                    <p className="font-mono text-sm">{costCenter.code}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Estado</p>
                  <Badge variant={costCenter.active ? "default" : "outline"}>
                    {costCenter.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Empleados</p>
                  <p className="text-sm">{employeeCount} empleados asignados</p>
                </div>
              </div>

              {costCenter.description && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">Descripción</p>
                  <p className="text-sm">{costCenter.description}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid gap-4 @lg/main:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Fecha de creación</p>
                    <p className="text-sm">{new Date(costCenter.createdAt).toLocaleDateString("es-ES")}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Última actualización</p>
                    <p className="text-sm">{new Date(costCenter.updatedAt).toLocaleDateString("es-ES")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responsibles" className="space-y-4">
          <ResponsiblesTab costCenterId={costCenter.id} />
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
