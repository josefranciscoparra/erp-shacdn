import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { BriefcaseBusiness, Plus } from "lucide-react";

export default function PositionsPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Puestos de trabajo"
        subtitle="Gestiona los puestos de trabajo de tu organización"
        actionLabel="Nuevo puesto"
        actionIcon={<Plus className="h-4 w-4" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de puestos</CardTitle>
          <CardDescription>
            Todos los puestos registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<BriefcaseBusiness className="mx-auto h-12 w-12" />}
            title="No hay puestos registrados"
            description="Comienza agregando tu primer puesto de trabajo"
            actionLabel="Agregar primer puesto"
          />
        </CardContent>
      </Card>
    </div>
  );
}
