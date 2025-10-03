"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Loader2, FileText } from "lucide-react";
import { useDocumentsStore, useGlobalDocumentsByKind, useGlobalDocumentStats } from "@/stores/documents-store";
import { useEmployeesStore } from "@/stores/employees-store";
import { documentKindLabels, type DocumentKind } from "@/lib/validations/document";
import { DocumentStatsCards } from "./_components/document-stats-cards";
import { GlobalDocumentsTable } from "./_components/global-documents-table";
import { SimplePagination } from "./_components/simple-pagination";
import { SectionHeader } from "@/components/hr/section-header";

// Tipos de documentos para tabs
const documentTabs: { key: DocumentKind | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "CONTRACT", label: "Contratos" },
  { key: "PAYSLIP", label: "Nóminas" },
  { key: "ID_DOCUMENT", label: "DNI/NIE" },
  { key: "SS_DOCUMENT", label: "Seg. Social" },
  { key: "CERTIFICATE", label: "Certificados" },
  { key: "MEDICAL", label: "Médicos" },
  { key: "OTHER", label: "Otros" },
];

export default function GlobalDocumentsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();

  // Stores
  const {
    globalDocuments,
    isLoadingGlobal,
    fetchAllDocuments,
    setGlobalFilters,
    clearGlobalFilters,
    globalFilters,
    globalPagination,
    setGlobalPage,
  } = useDocumentsStore();

  const { employees, fetchEmployees } = useEmployeesStore();
  const documentsByKind = useGlobalDocumentsByKind();
  const stats = useGlobalDocumentStats();

  // Cargar datos al montar
  useEffect(() => {
    fetchAllDocuments();
    if (employees.length === 0) {
      fetchEmployees();
    }
  }, [fetchAllDocuments, employees.length, fetchEmployees]);

  // Filtrar documentos según tab activo
  const filteredDocuments = activeTab === "all"
    ? globalDocuments
    : documentsByKind[activeTab as DocumentKind] || [];

  // Manejar cambio de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "all") {
      setGlobalFilters({ documentKind: undefined });
    } else {
      setGlobalFilters({ documentKind: value as DocumentKind });
    }
  };

  // Manejar búsqueda
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setGlobalFilters({ search: value || undefined });
  };

  // Manejar filtro por empleado
  const handleEmployeeFilter = (value: string) => {
    const employeeId = value === "all" ? undefined : value;
    setSelectedEmployeeId(employeeId);
    setGlobalFilters({ employeeId });
  };

  // Obtener conteo para cada tab
  const getTabCount = (tabKey: string) => {
    if (tabKey === "all") return stats.total;
    return stats.byKind[tabKey as DocumentKind] || 0;
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader
        title="Documentos"
        subtitle="Gestiona todos los documentos de tu organización"
      />

      {/* Estadísticas */}
      <DocumentStatsCards />

      {/* Filtros avanzados */}
      <Card className="bg-card rounded-lg border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 @md/main:flex-row @md/main:items-center @md/main:justify-between">
            <div className="flex flex-1 flex-col gap-4 @md/main:flex-row @md/main:items-center">
              {/* Búsqueda */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos o empleados..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="bg-white pl-9 placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Filtro por empleado */}
              <Select
                value={selectedEmployeeId || "all"}
                onValueChange={handleEmployeeFilter}
              >
                <SelectTrigger className="w-full @md/main:w-[250px]">
                  <SelectValue placeholder="Filtrar por empleado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                      {emp.employeeNumber && ` (#${emp.employeeNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botón limpiar filtros */}
            {(globalFilters.search || globalFilters.employeeId || globalFilters.documentKind) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearGlobalFilters}
                className="whitespace-nowrap"
              >
                <Filter className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs de documentos */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between">
          {/* Selector móvil */}
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-48 @4xl/main:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTabs.map((tab) => (
                <SelectItem key={tab.key} value={tab.key}>
                  <div className="flex items-center gap-2">
                    {tab.label}
                    <Badge variant="secondary">
                      {getTabCount(tab.key)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tabs desktop */}
          <TabsList className="hidden @4xl/main:flex">
            {documentTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                {tab.label}
                <Badge variant="secondary">
                  {getTabCount(tab.key)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Contenido de tabs */}
        {documentTabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <Card className="bg-card rounded-lg border">
              <CardContent className="p-0">
                {isLoadingGlobal ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">
                      Cargando documentos...
                    </span>
                  </div>
                ) : filteredDocuments.length > 0 ? (
                  <>
                    <GlobalDocumentsTable documents={filteredDocuments} />
                    <div className="border-t">
                      <SimplePagination
                        currentPage={globalPagination.page}
                        totalPages={globalPagination.totalPages}
                        pageSize={globalPagination.limit}
                        totalItems={globalPagination.total}
                        onPageChange={setGlobalPage}
                        onPageSizeChange={(size) => {
                          useDocumentsStore.getState().setGlobalLimit(size);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No hay documentos
                    </h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                      {tab.key === "all"
                        ? "No se han subido documentos en tu organización"
                        : `No hay documentos de tipo "${tab.label}" en tu organización`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
