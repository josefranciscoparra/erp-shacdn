"use client";

import { ShieldAlert, Sparkles } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";

import { GroupSyncWizard } from "./_components/group-sync-wizard";

export default function GroupSyncPage() {
  return (
    <PermissionGuard
      permission="manage_group_configuration"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Configuración de Grupo" subtitle="Centro de mando corporativo" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para desplegar políticas a nivel de grupo."
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Configuración de Grupo"
          subtitle="Asistente de Sincronización: despliega políticas y configuraciones a empresas del mismo grupo"
          badge={
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Asistente de Sincronización
            </span>
          }
        />
        <GroupSyncWizard />
      </div>
    </PermissionGuard>
  );
}
