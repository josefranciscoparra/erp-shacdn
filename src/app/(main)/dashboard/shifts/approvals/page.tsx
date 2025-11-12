import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { PendingApprovals } from "./_components/pending-approvals";

export const metadata = {
  title: "Aprobaciones de Turnos | TimeNow ERP",
  description: "Aprueba o rechaza turnos pendientes de publicación",
};

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<ApprovalsSkeleton />}>
      <PendingApprovals />
    </Suspense>
  );
}

function ApprovalsSkeleton() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[600px]" />
    </div>
  );
}
