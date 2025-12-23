"use client";

import { Calendar, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GlobalExceptionsContent } from "./_components/global-exceptions-content";
import { ScheduleTemplatesTab } from "./_components/schedule-templates-tab";

export default function SchedulesPage() {
  return (
    <PermissionGuard
      permissions={["view_contracts", "manage_contracts"]}
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Gestión de Horarios" subtitle="Sistema de Horarios V2.0" />
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
          title="Gestión de Horarios"
          subtitle="Sistema flexible de horarios V2.0 - Plantillas, excepciones y configuración global"
        />

        {/* Tabs */}
        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">
              <Calendar className="mr-2 h-4 w-4" />
              Plantillas
            </TabsTrigger>
            <TabsTrigger value="exceptions">
              <Calendar className="mr-2 h-4 w-4" />
              Excepciones Globales
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <ScheduleTemplatesTab />
          </TabsContent>

          <TabsContent value="exceptions" className="space-y-4">
            <GlobalExceptionsContent />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
