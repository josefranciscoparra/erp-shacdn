"use client";

import { Building2, Users } from "lucide-react";
import { Tree, TreeNode } from "react-organizational-chart";

import { EmployeeNodeData, OrgChartNode } from "./org-chart-node";

interface DepartmentNode {
  id: string;
  name: string;
  manager: EmployeeNodeData | null;
  employees: EmployeeNodeData[];
}

interface OrgChartDepartmentalProps {
  departments: DepartmentNode[];
  searchQuery?: string;
}

export function OrgChartDepartmental({ departments, searchQuery = "" }: OrgChartDepartmentalProps) {
  // Filtrar departamentos por búsqueda
  const filteredDepartments = departments
    .map((dept) => {
      const query = searchQuery.toLowerCase();

      const matchesManager = dept.manager
        ? `${dept.manager.firstName} ${dept.manager.lastName}`.toLowerCase().includes(query) ||
          (dept.manager.position?.toLowerCase() ?? "").includes(query) ||
          (dept.manager.email?.toLowerCase() ?? "").includes(query)
        : false;

      const matchingEmployees = dept.employees.filter((emp) => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        return (
          fullName.includes(query) ||
          (emp.position?.toLowerCase() ?? "").includes(query) ||
          (emp.email?.toLowerCase() ?? "").includes(query)
        );
      });

      const matchesDept = dept.name.toLowerCase().includes(query);

      // Incluir departamento si coincide su nombre, su manager, o tiene empleados coincidentes
      if (matchesDept || matchesManager || matchingEmployees.length > 0) {
        return {
          ...dept,
          employees: query ? matchingEmployees : dept.employees,
        };
      }

      return null;
    })
    .filter(Boolean) as DepartmentNode[];

  if (filteredDepartments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Building2 className="text-muted-foreground h-12 w-12" />
        <p className="text-muted-foreground">
          {searchQuery ? "No se encontraron departamentos con esa búsqueda" : "No hay departamentos para mostrar"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {filteredDepartments.map((dept) => (
        <div key={dept.id} className="bg-card rounded-lg border p-6 shadow-xs">
          {/* Header del departamento */}
          <div className="mb-6 flex items-center gap-3 border-b pb-4">
            <Building2 className="text-primary h-5 w-5" />
            <h3 className="text-foreground text-lg font-semibold">{dept.name}</h3>
            <span className="text-muted-foreground ml-auto text-sm">
              {dept.manager ? 1 + dept.employees.length : dept.employees.length} miembro
              {dept.manager || dept.employees.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Organigrama del departamento */}
          <div className="overflow-x-auto">
            <Tree
              lineWidth="2px"
              lineColor="#e5e7eb"
              lineBorderRadius="8px"
              label={
                dept.manager ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-primary/10 text-primary mb-2 rounded-full px-3 py-1 text-xs font-medium">
                      Manager
                    </div>
                    <OrgChartNode employee={dept.manager} isHighlighted />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <Users className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">Sin manager asignado</p>
                  </div>
                )
              }
            >
              {dept.employees.length > 0 &&
                dept.employees.map((employee) => (
                  <TreeNode key={employee.id} label={<OrgChartNode employee={employee} />} />
                ))}
            </Tree>
          </div>

          {/* Si no hay empleados además del manager */}
          {dept.employees.length === 0 && dept.manager && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-md border border-dashed p-4">
              <Users className="text-muted-foreground h-4 w-4" />
              <p className="text-muted-foreground text-sm">Sin empleados asignados</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
