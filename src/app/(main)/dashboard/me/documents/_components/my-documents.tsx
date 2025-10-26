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

import { DocumentItem } from "./document-item";
import { FolderItem } from "./folder-item";
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

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => setCurrentFolder(null)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Carpetas</span>
        </button>
        {currentFolder && (
          <>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{documentKindLabels[currentFolder]}</span>
          </>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar documentos..."
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

      {/* Grid de carpetas o documentos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="text-muted-foreground h-12 w-12 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando documentos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 @5xl/main:grid-cols-5">
          {!currentFolder
            ? Object.entries(groupedDocuments).map(([category, docs]) => (
                <FolderItem
                  key={category}
                  category={category as DocumentKind}
                  count={docs.length}
                  onClick={() => setCurrentFolder(category as DocumentKind)}
                />
              ))
            : groupedDocuments[currentFolder]?.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={setDeleteDocumentId}
                />
              ))}
        </div>
      )}

      {/* Estado vacío */}
      {!isLoading && Object.keys(groupedDocuments).length === 0 && (
        <div className="flex flex-col items-center justify-center gap-6 rounded-lg border-2 border-dashed py-24">
          <div className="bg-primary/5 flex h-24 w-24 items-center justify-center rounded-full">
            <FileText className="text-primary h-12 w-12" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold">No tienes documentos</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {searchQuery
                ? "No se encontraron documentos con tu búsqueda."
                : "Sube tu primer documento para empezar a organizarlos."}
            </p>
          </div>
          {!searchQuery && (
            <Button onClick={() => setUploadDialogOpen(true)} size="lg">
              <UploadIcon className="mr-2 h-5 w-5" />
              Subir documento
            </Button>
          )}
        </div>
      )}

      {/* Carpeta vacía */}
      {!isLoading &&
        currentFolder &&
        (!groupedDocuments[currentFolder] || groupedDocuments[currentFolder].length === 0) && (
          <div className="flex flex-col items-center justify-center gap-6 rounded-lg border-2 border-dashed py-24">
            <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-full">
              <Folder className="text-muted-foreground h-12 w-12" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">Carpeta vacía</h3>
              <p className="text-muted-foreground mt-1 text-sm">No hay documentos en esta categoría.</p>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} size="lg">
              <UploadIcon className="mr-2 h-5 w-5" />
              Subir documento
            </Button>
          </div>
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
