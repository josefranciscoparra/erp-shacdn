import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ShiftsDashboard } from "./_components/shifts-dashboard";

export const metadata = {
  title: "Gestión de Turnos | TimeNow ERP",
  description: "Dashboard de gestión de turnos para retail y hospitality",
};

export default function ShiftsPage() {
  return (
    <Suspense fallback={<ShiftsDashboardSkeleton />}>
      <ShiftsDashboard />
    </Suspense>
  );
}

function ShiftsDashboardSkeleton() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Content */}
      <Skeleton className="h-96" />
    </div>
  );
}
