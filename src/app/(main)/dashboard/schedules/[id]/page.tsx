import { Suspense } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Calendar, Clock, ShieldAlert, Users } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getScheduleTemplateById } from "@/server/actions/schedules-v2";

import { AssignEmployeesDialog } from "./_components/assign-employees-dialog";
import { AssignedEmployeesList } from "./_components/assigned-employees-list";
import { CreatePeriodDialog } from "./_components/create-period-dialog";
import { WeekScheduleEditor } from "./_components/week-schedule-editor";

interface PageProps {
  params: Promise<{ id: string }>;
}

const templateTypeLabels = {
  FIXED: { label: "Horario Fijo", color: "default" as const },
  SHIFT: { label: "Turnos", color: "secondary" as const },
  ROTATION: { label: "Rotación", color: "outline" as const },
  FLEXIBLE: { label: "Flexible", color: "secondary" as const },
};

export default async function ScheduleTemplatePage({ params }: PageProps) {
  const resolvedParams = await params;

  return (
    <PermissionGuard
      permission="view_contracts"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Editar Plantilla de Horario" subtitle="Sistema de Horarios V2.0" />
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
          <ScheduleTemplateContent templateId={resolvedParams.id} />
        </Suspense>
      </div>
    </PermissionGuard>
  );
}

async function ScheduleTemplateContent({ templateId }: { templateId: string }) {
  const template = await getScheduleTemplateById(templateId);

  if (!template) {
    notFound();
  }

  const typeInfo = templateTypeLabels[template.templateType];
  const employeeCount = template._count?.employeeAssignments ?? 0;
  const periodCount = template._count?.periods ?? 0;

  return (
    <>
      {/* Header con navegación */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard/schedules">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Plantillas
          </Link>
        </Button>

        <div className="flex flex-col gap-2 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
              <Badge variant={typeInfo.color}>{typeInfo.label}</Badge>
              {!template.isActive && (
                <Badge variant="outline" className="text-muted-foreground">
                  Inactivo
                </Badge>
              )}
            </div>
            {template.description && <p className="text-muted-foreground mt-2 text-sm">{template.description}</p>}
          </div>

          <div className="flex gap-2">
            <AssignEmployeesDialog templateId={template.id} templateName={template.name} />
            <Button variant="outline" size="sm">
              Configuración
            </Button>
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
            <CardTitle className="text-sm font-medium">Períodos</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodCount}</div>
            <p className="text-muted-foreground text-xs">
              {periodCount === 0 && "Sin períodos configurados"}
              {periodCount === 1 && "período configurado"}
              {periodCount > 1 && "períodos configurados"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipo</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeInfo.label}</div>
            <p className="text-muted-foreground text-xs">
              {template.templateType === "FIXED" && "Mismo horario todos los días"}
              {template.templateType === "SHIFT" && "Turnos asignados"}
              {template.templateType === "ROTATION" && "Rotaciones programadas"}
              {template.templateType === "FLEXIBLE" && "Horario con franjas flexibles"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de configuración */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">
            <Calendar className="mr-2 h-4 w-4" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="mr-2 h-4 w-4" />
            Empleados ({employeeCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          {periodCount === 0 ? (
            <EmptyState
              icon={<Calendar className="text-muted-foreground mx-auto h-12 w-12" />}
              title="Sin períodos configurados"
              description="Crea tu primer período (Regular, Intensivo o Especial) para comenzar a configurar los horarios de esta plantilla"
              action={<CreatePeriodDialog templateId={template.id} />}
            />
          ) : (
            <WeekScheduleEditor template={template} periods={template.periods ?? []} />
          )}
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <div className="flex items-center justify-end">
            <AssignEmployeesDialog templateId={template.id} templateName={template.name} />
          </div>
          <AssignedEmployeesList templateId={template.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-2">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">Cargando plantilla de horario...</p>
      </div>
    </div>
  );
}
