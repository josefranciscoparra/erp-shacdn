"use client";

import { Crown, Users } from "lucide-react";
import { Tree, TreeNode } from "react-organizational-chart";

import { EmployeeNodeData, OrgChartNode } from "./org-chart-node";

interface DepartmentNode {
  id: string;
  name: string;
  manager: EmployeeNodeData | null;
  employees: EmployeeNodeData[];
}

interface OrgChartHierarchicalProps {
  ceo?: EmployeeNodeData | null;
  departments: DepartmentNode[];
  searchQuery?: string;
}

export function OrgChartHierarchical({ ceo, departments, searchQuery = "" }: OrgChartHierarchicalProps) {
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

      if (matchesDept || matchesManager || matchingEmployees.length > 0) {
        return {
          ...dept,
          employees: query ? matchingEmployees : dept.employees,
        };
      }

      return null;
    })
    .filter(Boolean) as DepartmentNode[];

  // Filtrar CEO si no coincide con búsqueda
  const showCEO =
    !searchQuery || (ceo && `${ceo.firstName} ${ceo.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!showCEO && filteredDepartments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Users className="text-muted-foreground h-12 w-12" />
        <p className="text-muted-foreground">No se encontraron resultados con esa búsqueda</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-8">
      <Tree
        lineWidth="2px"
        lineColor="#e5e7eb"
        lineBorderRadius="8px"
        label={
          showCEO && ceo ? (
            <div className="flex flex-col items-center gap-2">
              <div className="bg-primary text-primary-foreground flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold">
                <Crown className="h-3.5 w-3.5" />
                CEO / Director General
              </div>
              <OrgChartNode employee={ceo} isHighlighted />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Crown className="text-muted-foreground mx-auto mb-2 h-10 w-10" />
              <p className="text-muted-foreground text-sm font-medium">Sin CEO asignado</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Asigna un empleado sin manager para que aparezca como CEO
              </p>
            </div>
          )
        }
      >
        {filteredDepartments.map((dept) => (
          <TreeNode
            key={dept.id}
            label={
              <div className="flex flex-col gap-4">
                {/* Manager del departamento */}
                {dept.manager && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                      {dept.name}
                    </div>
                    <OrgChartNode employee={dept.manager} />
                  </div>
                )}

                {/* Si no hay manager pero sí empleados, mostrar el nombre del depto */}
                {!dept.manager && dept.employees.length > 0 && (
                  <div className="rounded-lg border border-dashed p-3 text-center">
                    <p className="text-muted-foreground text-xs font-medium">{dept.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">Sin manager</p>
                  </div>
                )}
              </div>
            }
          >
            {/* Empleados del departamento */}
            {dept.employees.map((employee) => (
              <TreeNode key={employee.id} label={<OrgChartNode employee={employee} />} />
            ))}
          </TreeNode>
        ))}
      </Tree>
    </div>
  );
}
