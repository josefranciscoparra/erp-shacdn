import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { PublishShifts } from "./_components/publish-shifts";

export const metadata = {
  title: "Publicar Turnos | TimeNow ERP",
  description: "Publica turnos para que sean visibles por los empleados",
};

export default function PublishShiftsPage() {
  return (
    <Suspense fallback={<PublishSkeleton />}>
      <PublishShifts />
    </Suspense>
  );
}

function PublishSkeleton() {
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
