import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function PositionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Puestos de trabajo</h1>
          <p className="text-muted-foreground">
            Gestiona los puestos de trabajo de tu organización
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo puesto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de puestos</CardTitle>
          <CardDescription>
            Todos los puestos registrados en el sistema
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
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2h2a2 2 0 002-2V6zM8 6H6a2 2 0 00-2 2v6a2 2 0 002 2h2m0-10v10m0-10h8v10H8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay puestos registrados</h3>
            <p className="mb-4">Comienza agregando tu primer puesto de trabajo</p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar primer puesto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}