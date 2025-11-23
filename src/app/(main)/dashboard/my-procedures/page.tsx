import { PlusCircle } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { ProceduresDataTable } from "@/components/procedures/procedures-data-table";
import { getProcedures } from "@/server/actions/expense-procedures";

import { ProceduresStats } from "./_components/procedures-stats";

export default async function MyProceduresPage() {
  const { procedures } = await getProcedures({ mine: true });

  // Transformar datos para evitar problemas de serialización con Decimal en Client Components
  const formattedProcedures = (procedures ?? []).map((p) => ({
    ...p,
    estimatedAmount: p.estimatedAmount ? Number(p.estimatedAmount) : null,
    approvedAmount: p.approvedAmount ? Number(p.approvedAmount) : null,
  }));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Expedientes de Gasto"
        description="Consulta y crea tus solicitudes de gasto o comisiones de servicio."
        actionLabel="Nuevo Expediente"
        actionHref="/dashboard/procedures/new?context=mine"
        actionIcon={<PlusCircle className="h-4 w-4" />}
      />

      {/* Cards de resumen */}
      <ProceduresStats procedures={procedures || []} />

      {/* Tabla de expedientes */}
      <ProceduresDataTable data={formattedProcedures} isManagerView={false} />
    </div>
  );
}
