"use client";

import { useEffect, useState } from "react";

import { Calendar } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { getScheduleTemplates } from "@/server/actions/schedules-v2";

import { CreateTemplateDialog } from "./create-template-dialog";
import { ScheduleTemplatesList } from "./schedules-templates-list";

export function ScheduleTemplatesTab() {
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof getScheduleTemplates>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      setIsLoading(true);
      try {
        const data = await getScheduleTemplates();
        setTemplates(data);
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplates();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

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
