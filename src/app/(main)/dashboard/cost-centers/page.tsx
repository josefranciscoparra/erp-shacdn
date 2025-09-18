import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { Landmark, Plus } from "lucide-react";

export default function CostCentersPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Centros de coste"
        subtitle="Gestiona los centros de coste de tu organización"
        actionLabel="Nuevo centro"
        actionIcon={<Plus className="h-4 w-4" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de centros de coste</CardTitle>
          <CardDescription>Todos los centros de coste registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Landmark className="mx-auto h-12 w-12" />}
            title="No hay centros de coste registrados"
            description="Comienza agregando tu primer centro de coste"
            actionLabel="Agregar primer centro"
          />
        </CardContent>
      </Card>
    </div>
  );
}
