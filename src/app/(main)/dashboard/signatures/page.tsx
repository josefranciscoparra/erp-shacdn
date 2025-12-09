"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeCombobox } from "@/components/ui/employee-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { signatureRequestStatusLabels, signableDocumentCategoryLabels } from "@/lib/validations/signature";
import { useSignaturesStore } from "@/stores/signatures-store";

import { ActiveFilters } from "./_components/active-filters";
import { CreateSignatureDialog } from "./_components/create-signature-dialog";
import { SignaturesDataTable } from "./_components/signatures-data-table";
import { SimplePagination } from "./_components/simple-pagination";
import { SummaryCards } from "./_components/summary-cards";

export default function SignaturesPage() {
  const {
    allRequests,
    isLoadingRequests,
    fetchAllRequests,
    filters,
    setFilters,
    clearFilters,
    pagination,
    setPage,
    setLimit,
    summary,
  } = useSignaturesStore();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasInitializedRef = useRef(false);

  const searchFilter = filters.search ?? "";
  const [searchTerm, setSearchTerm] = useState(searchFilter);
  const [employeeName, setEmployeeName] = useState<string>("");

  // Detectar navegación a la página o query param "refresh=true"
  useEffect(() => {
    const shouldRefresh = searchParams.get("refresh") === "true";

    if (!hasInitializedRef.current || shouldRefresh) {
      hasInitializedRef.current = true;
      fetchAllRequests({ refresh: true });
    }
  }, [pathname, searchParams, fetchAllRequests]);

  useEffect(() => {
    setSearchTerm(searchFilter);
  }, [searchFilter]);

  // Cargar nombre del empleado cuando cambia el filtro
  useEffect(() => {
    if (filters.employeeId && filters.employeeId !== "__none__") {
      fetch(`/api/employees/${filters.employeeId}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Empleado no encontrado");
          return res.json();
        })
        .then((employee) => {
          const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;
          setEmployeeName(fullName);
        })
        .catch(() => {
          setEmployeeName("");
        });
    } else {
      setEmployeeName("");
    }
  }, [filters.employeeId]);

  useEffect(() => {
    const debounced = setTimeout(() => {
      const normalizedSearch = searchTerm.trim();
      const shouldClear = normalizedSearch.length === 0 && searchFilter.length > 0;
      const canApply = normalizedSearch.length >= 2 && normalizedSearch !== searchFilter;

      if (shouldClear) {
        setFilters({ search: "" });
      } else if (canApply) {
        setFilters({ search: normalizedSearch });
      }
    }, 400);

    return () => clearTimeout(debounced);
  }, [searchTerm, searchFilter, setFilters]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Todos los estados" },
      ...Object.entries(signatureRequestStatusLabels).map(([value, label]) => ({ value, label })),
    ],
    [],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "Todas las categorías" },
      ...Object.entries(signableDocumentCategoryLabels).map(([value, label]) => ({ value, label })),
    ],
    [],
  );

  const handleStatusChange = (value: string) => {
    setFilters({ status: value === "all" ? undefined : value });
  };

  const handleCategoryChange = (value: string) => {
    setFilters({ category: value === "all" ? undefined : value });
  };

  const handleEmployeeChange = (value: string) => {
    setFilters({ employeeId: value === "__none__" ? undefined : value });
  };

  const handleRemoveFilter = (filterKey: "search" | "status" | "category" | "employeeId") => {
    setFilters({ [filterKey]: undefined });
  };

  const isInitialLoading = isLoadingRequests && summary.total === 0 && allRequests.length === 0;

  if (isInitialLoading) {
    return (
      <div className="@container/main flex min-h-[400px] items-center justify-center">
        <div className="space-y-2 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  const handleRefresh = () => fetchAllRequests({ refresh: true });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader
        title="Gestión de Firmas"
        description="Gestiona y realiza el seguimiento de solicitudes de firma electrónica de documentos"
        action={<CreateSignatureDialog onSuccess={handleRefresh} />}
      />

      {/* Summary cards premium */}
      <SummaryCards summary={summary} />

      {/* Filtros compactos */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="signatures-search" className="text-xs">
                Buscar documento
              </Label>
              <Input
                id="signatures-search"
                placeholder="Título, descripción o trabajador..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={filters.status ?? "all"} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select value={filters.category ?? "all"} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Trabajador</Label>
              <EmployeeCombobox
                value={filters.employeeId ?? "__none__"}
                onValueChange={handleEmployeeChange}
                placeholder="Todos los trabajadores"
                minChars={2}
                className="h-9"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 w-full">
                Limpiar filtros
              </Button>
            </div>
          </div>

          {/* Filtros activos como chips */}
          <ActiveFilters filters={filters} employeeName={employeeName} onRemoveFilter={handleRemoveFilter} />
        </CardContent>
      </Card>

      {/* Tabla mejorada */}
      <div className="overflow-hidden rounded-lg">
        {isLoadingRequests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <span className="text-muted-foreground ml-2 text-sm">Actualizando listado...</span>
          </div>
        ) : allRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium">No hay solicitudes que coincidan con los filtros actuales</p>
            <p className="text-muted-foreground mt-1 text-sm">Ajusta los filtros o crea una nueva solicitud</p>
          </div>
        ) : (
          <>
            <SignaturesDataTable data={allRequests} />
            <div className="border-t">
              <SimplePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages || 1}
                pageSize={pagination.limit}
                totalItems={pagination.total}
                onPageChange={setPage}
                onPageSizeChange={setLimit}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
