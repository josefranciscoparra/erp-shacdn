import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ShiftTemplatesManager } from "./_components/shift-templates-manager";

export const metadata = {
  title: "Plantillas de Turnos | TimeNow ERP",
  description: "Gestión de plantillas reutilizables de turnos",
};

export default function ShiftTemplatesPage() {
  return (
    <Suspense fallback={<TemplatesSkeleton />}>
      <ShiftTemplatesManager />
    </Suspense>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-[600px]" />
    </div>
  );
}
