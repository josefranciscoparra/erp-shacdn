"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Download, Eye, Search, Upload as UploadIcon, Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { documentKindLabels, documentKindColors, formatFileSize, type DocumentKind } from "@/lib/validations/document";
import { getMyDocuments, type MyDocument } from "@/server/actions/my-documents";

import { UploadDocumentDialog } from "./upload-document-dialog";

export function MyDocuments() {
  const [documents, setDocuments] = useState<MyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

  // Cargar documentos
  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const filters: any = {};

      if (filterCategory !== "all") {
        filters.documentKind = filterCategory as DocumentKind;
      }

      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      const result = await getMyDocuments(filters);
      setDocuments(result.documents);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Error al cargar documentos");
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar documentos al montar y cuando cambien los filtros
  useEffect(() => {
    loadDocuments();
  }, [filterCategory, searchQuery]);

  // Descargar documento
  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/me/documents/${documentId}/download`);

      if (!response.ok) {
        throw new Error("Error al descargar documento");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Descarga iniciada");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Error al descargar documento");
    }
  };

  // Ver documento
  const handlePreview = async (documentId: string) => {
    try {
      const response = await fetch(`/api/me/documents/${documentId}/download`);

      if (!response.ok) {
        throw new Error("Error al abrir documento");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");

      if (newWindow) {
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 5000);
      }
    } catch (error) {
      console.error("Error previewing document:", error);
      toast.error("Error al abrir documento");
    }
  };

  // Eliminar documento
  const handleDelete = async () => {
    if (!deleteDocumentId) return;

    setIsDeletingDocument(true);

    try {
      const response = await fetch(`/api/me/documents?documentId=${deleteDocumentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Error al eliminar documento");
      }

      toast.success("Documento eliminado exitosamente");
      setDeleteDocumentId(null);
      loadDocuments(); // Recargar lista
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar documento");
    } finally {
      setIsDeletingDocument(false);
    }
  };

  // Filtrar documentos
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === "all" || doc.kind === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Agrupar por categoría
  const groupedDocuments = filteredDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.kind]) {
        acc[doc.kind] = [];
      }
      acc[doc.kind].push(doc);
      return acc;
    },
    {} as Record<DocumentKind, MyDocument[]>,
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Mis Documentos" actionLabel="Subir documento" onAction={() => setUploadDialogOpen(true)} />

      {/* Filtros */}
      <Card className="@container/card flex flex-col gap-4 p-4 @md/card:flex-row @md/card:items-center @md/card:justify-between">
        <div className="relative flex-1 @md/card:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full @md/card:w-[200px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(documentKindLabels).map(([kind, label]) => (
              <SelectItem key={kind} value={kind}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Estado de carga */}
      {isLoading ? (
        <Card className="@container/card flex flex-col items-center justify-center gap-4 p-12">
          <Loader2 className="text-muted-foreground h-12 w-12 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando documentos...</p>
        </Card>
      ) : (
        <>
          {/* Documentos agrupados */}
          {Object.keys(groupedDocuments).length > 0 ? (
            <div className="flex flex-col gap-6">
              {Object.entries(groupedDocuments).map(([category, docs]) => (
                <Card key={category} className="@container/card flex flex-col gap-4 p-6">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${documentKindColors[category as DocumentKind]?.split(" ")[0] || "bg-gray-500"}`}
                    />
                    <h3 className="text-lg font-semibold">{documentKindLabels[category as DocumentKind]}</h3>
                    <Badge variant="secondary">{docs.length}</Badge>
                  </div>

                  <div className="flex flex-col gap-2">
                    {docs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                            <FileText className="text-muted-foreground h-5 w-5" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">{doc.fileName}</span>
                            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(doc.createdAt), "d 'de' MMM yyyy", {
                                  locale: es,
                                })}
                              </span>
                              {doc.description && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{doc.description}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-shrink-0 gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(doc.id)}
                            title="Ver documento"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver documento</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc.id, doc.fileName)}
                            title="Descargar documento"
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Descargar documento</span>
                          </Button>
                          {doc.canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDocumentId(doc.id)}
                              title="Eliminar documento"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Eliminar documento</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="@container/card flex flex-col items-center justify-center gap-4 p-12">
              <FileText className="text-muted-foreground h-12 w-12" />
              <div className="text-center">
                <h3 className="font-semibold">No se encontraron documentos</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery || filterCategory !== "all"
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "Sube tu primer documento usando el botón de arriba"}
                </p>
              </div>
              {!searchQuery && filterCategory === "all" && (
                <Button onClick={() => setUploadDialogOpen(true)} className="mt-4">
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Subir documento
                </Button>
              )}
            </Card>
          )}
        </>
      )}

      {/* Dialog de subida */}
      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadSuccess={loadDocuments}
      />

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={!!deleteDocumentId} onOpenChange={() => setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDocument}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeletingDocument}
            >
              {isDeletingDocument ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
