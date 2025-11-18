import { Suspense } from "react";

import { Calendar, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { getScheduleTemplates } from "@/server/actions/schedules-v2";

import { CreateTemplateDialog } from "./_components/create-template-dialog";
import { ScheduleTemplatesList } from "./_components/schedules-templates-list";

export default async function SchedulesPage() {
  return (
    <PermissionGuard
      permission="view_contracts"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Plantillas de Horarios" subtitle="Sistema de Horarios V2.0" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <SectionHeader
          title="Plantillas de Horarios"
          subtitle="Sistema flexible de horarios V2.0 - Soporta horarios fijos, turnos, rotaciones y franjas flexibles"
          action={<CreateTemplateDialog />}
        />

        {/* Content */}
        <Suspense fallback={<LoadingState />}>
          <ScheduleTemplatesContent />
        </Suspense>
      </div>
    </PermissionGuard>
  );
}

async function ScheduleTemplatesContent() {
  const templates = await getScheduleTemplates();

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="text-muted-foreground mx-auto h-12 w-12" />}
        title="No hay plantillas de horarios"
        description="Crea tu primera plantilla para empezar a gestionar los horarios de tu organización"
        action={<CreateTemplateDialog />}
      />
    );
  }

  return <ScheduleTemplatesList templates={templates} />;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-2">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">Cargando plantillas...</p>
      </div>
    </div>
  );
}
