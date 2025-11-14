"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2, SlidersHorizontal } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeCombobox } from "@/components/ui/employee-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { signatureRequestStatusLabels, signableDocumentCategoryLabels } from "@/lib/validations/signature";
import { useSignaturesStore } from "@/stores/signatures-store";

import { CreateSignatureDialog } from "./_components/create-signature-dialog";
import { SignaturesDataTable } from "./_components/signatures-data-table";
import { SimplePagination } from "./_components/simple-pagination";

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

  const searchFilter = filters.search ?? "";
  const [searchTerm, setSearchTerm] = useState(searchFilter);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  useEffect(() => {
    setSearchTerm(searchFilter);
  }, [searchFilter]);

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

  const statusSummaryBadges = useMemo(
    () => [
      { key: "PENDING", label: signatureRequestStatusLabels.PENDING, count: summary.byStatus.PENDING },
      { key: "IN_PROGRESS", label: signatureRequestStatusLabels.IN_PROGRESS, count: summary.byStatus.IN_PROGRESS },
      { key: "COMPLETED", label: signatureRequestStatusLabels.COMPLETED, count: summary.byStatus.COMPLETED },
      { key: "REJECTED", label: signatureRequestStatusLabels.REJECTED, count: summary.byStatus.REJECTED },
      { key: "EXPIRED", label: signatureRequestStatusLabels.EXPIRED, count: summary.byStatus.EXPIRED },
    ],
    [summary.byStatus],
  );

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

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Gestión de Firmas"
        description="Administra las solicitudes de firma electrónica por estado, trabajador o categoría."
        action={<CreateSignatureDialog onSuccess={() => fetchAllRequests({ refresh: true })} />}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros activos
            </Badge>
            <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
              <span>{summary.total} solicitudes totales</span>
              {statusSummaryBadges.map((item) => (
                <Badge key={item.key} variant="secondary" className="pointer-events-none">
                  {item.label}: {item.count}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[2fr,1fr,1fr]">
            <div className="space-y-1">
              <Label htmlFor="signatures-search">Buscar</Label>
              <Input
                id="signatures-search"
                placeholder="Busca por título de documento, descripción o trabajador"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={filters.status ?? "all"} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
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
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={filters.category ?? "all"} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
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
          </div>

          <div className="grid gap-3 md:grid-cols-[2fr,auto]">
            <div className="space-y-1">
              <Label>Trabajador</Label>
              <EmployeeCombobox
                value={filters.employeeId ?? "__none__"}
                onValueChange={handleEmployeeChange}
                placeholder="Filtrar por trabajador"
                minChars={2}
              />
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardContent className="p-0">
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
        </CardContent>
      </Card>
    </div>
  );
}
