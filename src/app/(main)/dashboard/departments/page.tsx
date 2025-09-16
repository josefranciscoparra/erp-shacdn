import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">
            Gestiona los departamentos de tu organización
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo departamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de departamentos</CardTitle>
          <CardDescription>
            Todos los departamentos registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay departamentos registrados</h3>
            <p className="mb-4">Comienza agregando tu primer departamento</p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar primer departamento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}