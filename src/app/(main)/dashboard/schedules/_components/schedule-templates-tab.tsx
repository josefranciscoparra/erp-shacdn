"use client";

import { useEffect, useState } from "react";

import { Calendar, Plus } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Gestionando <strong>{templates.length}</strong> plantillas activas
        </p>
        <CreateTemplateDialog />
      </div>
      <ScheduleTemplatesList templates={templates} />
    </div>
  );
}
