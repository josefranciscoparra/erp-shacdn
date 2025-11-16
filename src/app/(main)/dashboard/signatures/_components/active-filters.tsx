"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { signableDocumentCategoryLabels, signatureRequestStatusLabels } from "@/lib/validations/signature";

interface ActiveFiltersProps {
  filters: {
    search?: string;
    status?: string;
    category?: string;
    employeeId?: string;
  };
  employeeName?: string;
  onRemoveFilter: (filterKey: "search" | "status" | "category" | "employeeId") => void;
}

export function ActiveFilters({ filters, employeeName, onRemoveFilter }: ActiveFiltersProps) {
  const activeFilters = [];

  if (filters.search) {
    activeFilters.push({
      key: "search" as const,
      label: `Búsqueda: "${filters.search}"`,
    });
  }

  if (filters.status) {
    activeFilters.push({
      key: "status" as const,
      label: `Estado: ${signatureRequestStatusLabels[filters.status as keyof typeof signatureRequestStatusLabels] ?? filters.status}`,
    });
  }

  if (filters.category) {
    activeFilters.push({
      key: "category" as const,
      label: `Categoría: ${signableDocumentCategoryLabels[filters.category as keyof typeof signableDocumentCategoryLabels] ?? filters.category}`,
    });
  }

  if (filters.employeeId && employeeName) {
    activeFilters.push({
      key: "employeeId" as const,
      label: `Trabajador: ${employeeName}`,
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium">Filtros activos:</span>
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="group hover:bg-destructive/10 cursor-pointer gap-1.5 transition-colors"
          onClick={() => onRemoveFilter(filter.key)}
        >
          <span>{filter.label}</span>
          <X className="h-3 w-3 transition-transform group-hover:scale-110" />
        </Badge>
      ))}
    </div>
  );
}
