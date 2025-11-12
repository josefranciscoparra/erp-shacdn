import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAuthenticatedEmployee } from "@/server/actions/shared/get-authenticated-employee";

import { EmployeeShiftCalendar } from "./_components/employee-shift-calendar";

export const metadata = {
  title: "Mis Turnos | TimeNow ERP",
  description: "Consulta tus turnos asignados",
};

export default async function EmployeeShiftsPage() {
  const auth = await getAuthenticatedEmployee();

  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <EmployeeShiftCalendar employeeId={auth.employeeId} />
    </Suspense>
  );
}

function CalendarSkeleton() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      <Skeleton className="h-[600px]" />
    </div>
  );
}
