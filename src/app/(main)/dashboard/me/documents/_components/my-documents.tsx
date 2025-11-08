"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText,
  Download,
  Eye,
  Search,
  Upload as UploadIcon,
  Trash,
  Loader2,
  Folder,
  ChevronRight,
  Home,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [currentFolder, setCurrentFolder] = useState<DocumentKind | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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

  // Filtrar documentos - siempre busca en la carpeta actual si estás en una
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === "all" || doc.kind === filterCategory;

    // Si estamos en una carpeta, solo mostrar documentos de esa carpeta
    const matchesFolder = !currentFolder || doc.kind === currentFolder;

    return matchesSearch && matchesCategory && matchesFolder;
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

  // Handlers para drag & drop visual
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    toast.info("Función de arrastrar y soltar próximamente");
  };

  return (
    <div
      className="@container/main flex flex-col gap-4 md:gap-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SectionHeader title="Mis Documentos" actionLabel="Subir documento" onAction={() => setUploadDialogOpen(true)} />

      {/* Navegación: Botón Volver + Breadcrumb */}
      <div className="flex items-center gap-3">
        {currentFolder && (
          <Button variant="outline" size="sm" onClick={() => setCurrentFolder(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Home className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground">Carpetas</span>
          {currentFolder && (
            <>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
              <span className="text-foreground font-semibold">{documentKindLabels[currentFolder]}</span>
            </>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={currentFolder ? `Buscar en ${documentKindLabels[currentFolder]}...` : "Buscar documentos..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      {/* Zona de drop con feedback visual */}
      {isDraggingOver && (
        <div className="border-primary bg-primary/5 fixed inset-8 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed">
          <div className="flex flex-col items-center gap-3">
            <UploadIcon className="text-primary h-12 w-12" />
            <p className="text-primary text-lg font-semibold">Suelta el archivo aquí</p>
          </div>
        </div>
      )}

      {/* Estado de carga */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="text-muted-foreground h-12 w-12 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando documentos...</p>
        </div>
      ) : (
        <>
          {/* Vista de carpetas */}
          {!currentFolder && Object.keys(groupedDocuments).length > 0 && (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {Object.entries(groupedDocuments).map(([category, docs]) => (
                <button
                  key={category}
                  onClick={() => setCurrentFolder(category as DocumentKind)}
                  className="group relative flex h-24 items-center gap-4 rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-white/5"
                >
                  <div className="bg-primary/10 text-primary group-hover:bg-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-lg transition-colors">
                    <Folder className="h-7 w-7" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="truncate font-semibold">{documentKindLabels[category as DocumentKind]}</span>
                    <span className="text-muted-foreground text-sm">
                      {docs.length} {docs.length === 1 ? "documento" : "documentos"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Vista de archivos dentro de carpeta */}
          {currentFolder && groupedDocuments[currentFolder] && (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {groupedDocuments[currentFolder].map((doc) => (
                <div
                  key={doc.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-white/5"
                >
                  {/* Miniatura del documento */}
                  <div className="bg-muted flex h-32 items-center justify-center">
                    <FileText className="text-muted-foreground h-12 w-12" />
                  </div>

                  {/* Información del documento */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h4 className="truncate font-medium" title={doc.fileName}>
                      {doc.fileName}
                    </h4>
                    <div className="text-muted-foreground flex flex-col gap-1 text-xs">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{format(new Date(doc.createdAt), "d MMM yyyy", { locale: es })}</span>
                    </div>
                  </div>

                  {/* Botón de acciones siempre visible */}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-gray-200 bg-white shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                          title="Más opciones"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Más opciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(doc.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver documento
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc.id, doc.fileName)}>
                          <Download className="mr-2 h-4 w-4" />
                          Descargar
                        </DropdownMenuItem>
                        {doc.canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteDocumentId(doc.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estado vacío */}
          {Object.keys(groupedDocuments).length === 0 && (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <div className="bg-primary/5 flex h-24 w-24 items-center justify-center rounded-full">
                <FileText className="text-primary h-12 w-12" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">No tienes documentos aún</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {searchQuery
                    ? "No se encontraron documentos con ese criterio"
                    : "Comienza subiendo tu primer documento"}
                </p>
              </div>
              {!searchQuery && (
                <Button onClick={() => setUploadDialogOpen(true)} size="lg">
                  <UploadIcon className="mr-2 h-5 w-5" />
                  Subir primer documento
                </Button>
              )}
            </div>
          )}

          {/* Carpeta vacía */}
          {currentFolder && (!groupedDocuments[currentFolder] || groupedDocuments[currentFolder].length === 0) && (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-full">
                <Folder className="text-muted-foreground h-12 w-12" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Esta carpeta está vacía</h3>
                <p className="text-muted-foreground mt-1 text-sm">No hay documentos en esta categoría</p>
              </div>
              <Button onClick={() => setUploadDialogOpen(true)} size="lg">
                <UploadIcon className="mr-2 h-5 w-5" />
                Subir documento
              </Button>
            </div>
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
