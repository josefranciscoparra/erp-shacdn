"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ArrowLeft, Upload, Search, Filter, FileText, Loader2 } from "lucide-react";

import { DocumentListTable } from "@/components/employees/document-list-table";
import { DocumentUploadDialog } from "@/components/employees/document-upload-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { features } from "@/config/features";
import { documentKindLabels, type DocumentKind } from "@/lib/validations/document";
import { useDocumentsStore, useDocumentsByKind, useDocumentStats } from "@/stores/documents-store";
import { useEmployeesStore } from "@/stores/employees-store";

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

export default function EmployeeDocumentsPage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [activeTab, setActiveTab] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const documentsEnabled = features.documents;

  // Stores
  const { documents, isLoading, fetchDocuments, setFilters, clearFilters, filters } = useDocumentsStore();

  const { employees, fetchEmployees } = useEmployeesStore();
  const documentsByKind = useDocumentsByKind();
  const stats = useDocumentStats();

  // Obtener empleado actual
  const currentEmployee = employees.find((emp) => emp.id === employeeId);

  // Cargar datos al montar
  useEffect(() => {
    if (!documentsEnabled || !employeeId) {
      return;
    }

    fetchDocuments(employeeId);
    if (employees.length === 0) {
      fetchEmployees();
    }
  }, [documentsEnabled, employeeId, fetchDocuments, employees.length, fetchEmployees]);

  // Filtrar documentos según tab activo
  const filteredDocuments = activeTab === "all" ? documents : documentsByKind[activeTab as DocumentKind] || [];

  // Manejar cambio de tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "all") {
      clearFilters();
    } else {
      setFilters({ documentKind: value as DocumentKind });
    }
  };

  // Manejar búsqueda
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ search: value || undefined });
  };

  // Obtener conteo para cada tab
  const getTabCount = (tabKey: string) => {
    if (tabKey === "all") return stats.total;
    return stats.byKind[tabKey as DocumentKind] || 0;
  };

  if (!currentEmployee && !isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/employees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Empleado no encontrado</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!documentsEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="bg-card rounded-lg border">
          <CardContent className="flex flex-col gap-4 p-6">
            <div>
              <h2 className="text-lg font-semibold">Documentos deshabilitados</h2>
              <p className="text-muted-foreground text-sm">
                El módulo de documentos no está disponible actualmente. Activa la variable de entorno
                <code className="bg-muted ml-1 rounded px-1 py-0.5">NEXT_PUBLIC_FEATURE_DOCUMENTS_ENABLED=true</code>
                para volver a habilitarlo.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dashboard/employees/${employeeId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al perfil del empleado
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/employees/${employeeId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Documentos</h1>
          <p className="text-muted-foreground text-sm">
            {currentEmployee
              ? `Documentos de ${currentEmployee.firstName} ${currentEmployee.lastName}`
              : "Cargando información del empleado..."}
          </p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="bg-card rounded-lg border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 @md/main:flex-row @md/main:items-center @md/main:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative max-w-sm flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="placeholder:text-muted-foreground/50 bg-white pl-9"
                />
              </div>
              {(filters.search ?? filters.documentKind) && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="whitespace-nowrap">
                  <Filter className="mr-2 h-4 w-4" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            <Button onClick={() => setUploadDialogOpen(true)} className="whitespace-nowrap">
              <Upload className="mr-2 h-4 w-4" />
              Subir documento
            </Button>
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
                    <Badge variant="secondary">{getTabCount(tab.key)}</Badge>
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
                <Badge variant="secondary">{getTabCount(tab.key)}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Contenido de tabs */}
        {documentTabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <Card className="bg-card rounded-lg border">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                    <span className="text-muted-foreground ml-2">Cargando documentos...</span>
                  </div>
                ) : filteredDocuments.length > 0 ? (
                  <DocumentListTable documents={filteredDocuments} employeeId={employeeId} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="text-muted-foreground mb-4 h-12 w-12" />
                    <h3 className="mb-2 text-lg font-medium">No hay documentos</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                      {tab.key === "all"
                        ? "No se han subido documentos para este empleado"
                        : `No hay documentos de tipo "${tab.label}" para este empleado`}
                    </p>
                    <Button onClick={() => setUploadDialogOpen(true)} variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Subir primer documento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog de subida */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        employeeId={employeeId}
        employeeName={currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : "Empleado"}
      />
    </div>
  );
}
