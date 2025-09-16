import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empleados</h1>
          <p className="text-muted-foreground">
            Gestiona los empleados de tu organización
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/employees/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo empleado
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de búsqueda</CardTitle>
          <CardDescription>
            Encuentra empleados específicos usando los filtros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Buscar por nombre, email o NIF..."
                className="w-full"
              />
            </div>
            <Button variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de empleados</CardTitle>
          <CardDescription>
            Todos los empleados registrados en el sistema
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay empleados registrados</h3>
            <p className="mb-4">Comienza agregando tu primer empleado al sistema</p>
            <Button asChild>
              <Link href="/dashboard/employees/new">
                <Plus className="mr-2 h-4 w-4" />
                Agregar primer empleado
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}