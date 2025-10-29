"use client";

import { Crown, Users } from "lucide-react";
import { Tree, TreeNode } from "react-organizational-chart";

import { OrgChartNode } from "./org-chart-node";

interface HierarchicalEmployeeNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  photoUrl: string | null;
  position: string | null;
  department: string | null;
  subordinates: HierarchicalEmployeeNode[];
}

interface OrgChartUnifiedProps {
  rootNode?: HierarchicalEmployeeNode | null;
  searchQuery?: string;
}

// Función recursiva para filtrar el árbol según la búsqueda
function filterHierarchy(node: HierarchicalEmployeeNode, query: string): HierarchicalEmployeeNode | null {
  const lowerQuery = query.toLowerCase();

  // Verificar si este nodo coincide con la búsqueda
  const matchesNode =
    `${node.firstName} ${node.lastName}`.toLowerCase().includes(lowerQuery) ||
    (node.position?.toLowerCase() ?? "").includes(lowerQuery) ||
    (node.department?.toLowerCase() ?? "").includes(lowerQuery) ||
    (node.email?.toLowerCase() ?? "").includes(lowerQuery);

  // Filtrar subordinados recursivamente
  const filteredSubordinates = node.subordinates
    .map((sub) => filterHierarchy(sub, query))
    .filter(Boolean) as HierarchicalEmployeeNode[];

  // Incluir este nodo si coincide o tiene subordinados que coinciden
  if (matchesNode || filteredSubordinates.length > 0) {
    return {
      ...node,
      subordinates: filteredSubordinates,
    };
  }

  return null;
}

// Función recursiva para renderizar nodos subordinados
function renderSubordinates(subordinates: HierarchicalEmployeeNode[]): JSX.Element[] {
  return subordinates.map((subordinate) => (
    <TreeNode key={subordinate.id} label={<OrgChartNode employee={subordinate} />}>
      {subordinate.subordinates.length > 0 && renderSubordinates(subordinate.subordinates)}
    </TreeNode>
  ));
}

export function OrgChartUnified({ rootNode, searchQuery = "" }: OrgChartUnifiedProps) {
  // Si no hay nodo raíz (CEO), mostrar mensaje
  if (!rootNode) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Crown className="text-muted-foreground h-12 w-12" />
        <p className="text-muted-foreground text-center">
          Sin CEO asignado
          <br />
          <span className="text-sm">Asigna un empleado sin manager para que aparezca como CEO</span>
        </p>
      </div>
    );
  }

  // Filtrar el árbol si hay búsqueda
  const filteredRoot = searchQuery ? filterHierarchy(rootNode, searchQuery) : rootNode;

  if (!filteredRoot) {
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
          <div className="flex flex-col items-center gap-2">
            <div className="bg-primary text-primary-foreground mb-1 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold">
              <Crown className="h-3.5 w-3.5" />
              Director / CEO
            </div>
            <OrgChartNode employee={filteredRoot} isHighlighted />
          </div>
        }
      >
        {filteredRoot.subordinates.length > 0 && renderSubordinates(filteredRoot.subordinates)}
      </Tree>
    </div>
  );
}
