import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { Building2, Plus } from "lucide-react";

export default function DepartmentsPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Departamentos"
        subtitle="Gestiona los departamentos de tu organización"
        actionLabel="Nuevo departamento"
        actionIcon={<Plus className="h-4 w-4" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de departamentos</CardTitle>
          <CardDescription>Todos los departamentos registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Building2 className="mx-auto h-12 w-12" />}
            title="No hay departamentos registrados"
            description="Comienza agregando tu primer departamento"
            actionLabel="Agregar primer departamento"
          />
        </CardContent>
      </Card>
    </div>
  );
}
