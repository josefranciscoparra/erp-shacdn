import { Suspense } from "react";

import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { safeAnyPermission } from "@/lib/auth-guard";

import { TrashDocumentsTable } from "./_components/trash-documents-table";

export const metadata = {
  title: "Papelera Legal | Admin",
  description: "Documentos eliminados con retención legal",
};

export default async function DocumentTrashPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Papelera Legal"
        description="Documentos eliminados que se conservan por obligación legal. Puedes restaurarlos o purgarlos cuando expire la retención."
      />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );
  const authResult = await safeAnyPermission(["manage_trash", "restore_trash"]);
  if (!authResult.ok) {
    return permissionFallback;
  }
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Papelera Legal"
        description="Documentos eliminados que se conservan por obligación legal. Puedes restaurarlos o purgarlos cuando expire la retención."
      />

      <Suspense fallback={<TrashTableSkeleton />}>
        <TrashDocumentsTable />
      </Suspense>
    </div>
  );
}

function TrashTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="rounded-lg border">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
