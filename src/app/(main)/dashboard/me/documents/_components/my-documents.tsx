"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Eye, Search, Upload as UploadIcon, Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/hr/section-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { UploadDocumentDialog } from "./upload-document-dialog";
import { getMyDocuments, type MyDocument } from "@/server/actions/my-documents";
import {
  documentKindLabels,
  documentKindColors,
  formatFileSize,
  type DocumentKind,
} from "@/lib/validations/document";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
        throw new Error(data.error || "Error al eliminar documento");
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

    const matchesCategory =
      filterCategory === "all" || doc.kind === filterCategory;

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
    {} as Record<DocumentKind, MyDocument[]>
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis Documentos"
        actionLabel="Subir documento"
        onAction={() => setUploadDialogOpen(true)}
      />

      {/* Filtros */}
      <Card className="@container/card flex flex-col gap-4 p-4 @md/card:flex-row @md/card:items-center @md/card:justify-between">
        <div className="relative flex-1 @md/card:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando documentos...</p>
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
                    <h3 className="text-lg font-semibold">
                      {documentKindLabels[category as DocumentKind]}
                    </h3>
                    <Badge variant="secondary">{docs.length}</Badge>
                  </div>

                  <div className="flex flex-col gap-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-4 rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium truncate">{doc.fileName}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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

                        <div className="flex gap-2 flex-shrink-0">
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
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-semibold">No se encontraron documentos</h3>
                <p className="text-sm text-muted-foreground">
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
      <AlertDialog
        open={!!deleteDocumentId}
        onOpenChange={() => setDeleteDocumentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado
              permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDocument}>
              Cancelar
            </AlertDialogCancel>
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
