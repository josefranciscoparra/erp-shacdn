import { Users } from "lucide-react";

import { EmployeeNodeData, OrgChartNode } from "./org-chart-node";

interface OrgChartFlatProps {
  employees: EmployeeNodeData[];
  searchQuery?: string;
}

export function OrgChartFlat({ employees, searchQuery = "" }: OrgChartFlatProps) {
  // Filtrar empleados por búsqueda
  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return (
      fullName.includes(query) ||
      (emp.position?.toLowerCase().includes(query) ?? false) ||
      (emp.department?.toLowerCase().includes(query) ?? false) ||
      (emp.email?.toLowerCase().includes(query) ?? false)
    );
  });

  if (filteredEmployees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Users className="text-muted-foreground h-12 w-12" />
        <p className="text-muted-foreground">
          {searchQuery ? "No se encontraron empleados con esa búsqueda" : "No hay empleados para mostrar"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {filteredEmployees.length} empleado{filteredEmployees.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredEmployees.map((employee) => (
          <OrgChartNode key={employee.id} employee={employee} />
        ))}
      </div>
    </div>
  );
}
