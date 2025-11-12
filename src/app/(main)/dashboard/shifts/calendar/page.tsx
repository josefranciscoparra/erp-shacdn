import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ShiftCalendar } from "./_components/shift-calendar";

export const metadata = {
  title: "Calendario de Turnos | TimeNow ERP",
  description: "Planifica y gestiona turnos con calendario interactivo",
};

export default function ShiftCalendarPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <ShiftCalendar />
    </Suspense>
  );
}

function CalendarSkeleton() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-[800px]" />
    </div>
  );
}
