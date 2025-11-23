import Link from "next/link";

import { PlusCircle } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { ProceduresDataTable } from "@/components/procedures/procedures-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProcedures } from "@/server/actions/expense-procedures";

import { ProceduresManagementStats } from "./_components/procedures-management-stats";

export default async function ProceduresPage({ searchParams }: { searchParams: { filter?: string } }) {
  const showMineOnly = searchParams.filter === "mine";
  const { procedures } = await getProcedures({ mine: showMineOnly });

  // Transformar datos para evitar problemas de serialización con Decimal
  const formattedProcedures = (procedures ?? []).map((p) => ({
    ...p,
    estimatedAmount: p.estimatedAmount ? Number(p.estimatedAmount) : null,
    approvedAmount: p.approvedAmount ? Number(p.approvedAmount) : null,
  }));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SectionHeader
          title={showMineOnly ? "Mis Expedientes" : "Gestión de Expedientes"}
          description={
            showMineOnly
              ? "Consulta y crea tus solicitudes de gasto o comisiones de servicio."
              : "Supervisión y autorización de expedientes de gasto de la organización."
          }
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={showMineOnly ? "/dashboard/procedures" : "/dashboard/procedures?filter=mine"}>
              {showMineOnly ? "Ver Todos" : "Ver Mis Expedientes"}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/procedures/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Expediente
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de resumen (Gestión) */}
      <ProceduresManagementStats procedures={formattedProcedures} isMine={showMineOnly} />

      <Card>
        <CardHeader>
          <CardTitle>{showMineOnly ? "Mis Solicitudes" : "Todos los Expedientes"}</CardTitle>
          <CardDescription>
            {showMineOnly
              ? "Histórico de tus expedientes activos y cerrados."
              : "Listado global para control y aprobación."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProceduresDataTable data={formattedProcedures} isManagerView={!showMineOnly} />
        </CardContent>
      </Card>
    </div>
  );
}
