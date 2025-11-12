import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { CoverageAnalysis } from "./_components/coverage-analysis";

export const metadata = {
  title: "Análisis de Cobertura | TimeNow ERP",
  description: "Análisis de cobertura de turnos y heatmap semanal",
};

export default function CoveragePage() {
  return (
    <Suspense fallback={<CoverageSkeleton />}>
      <CoverageAnalysis />
    </Suspense>
  );
}

function CoverageSkeleton() {
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
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[600px]" />
    </div>
  );
}
