"use client";

import { toast } from "sonner";
import { create } from "zustand";

import { features } from "@/config/features";
import { downloadFileFromApi, openFilePreviewFromApi } from "@/lib/client/file-download";
import type { DocumentKind } from "@/lib/validations/document";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

// Tipos para el store
export interface EmployeeDocument {
  id: string;
  kind: DocumentKind;
  fileName: string;
  storageUrl: string;
  fileSize: number;
  mimeType: string;
  version: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  employeeId: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber?: string;
  };
}

interface DocumentsState {
  documents: EmployeeDocument[];
  isLoading: boolean;
  isUploading: boolean;
  currentEmployeeId: string | null;
  filters: {
    employeeId?: string;
    documentKind?: DocumentKind;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  // Estado para vista global
  globalDocuments: EmployeeDocument[];
  isLoadingGlobal: boolean;
  globalFilters: {
    employeeId?: string;
    documentKind?: DocumentKind;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  globalPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  storage: {
    limit: number;
    used: number;
    reserved: number;
  };
}

interface DocumentsActions {
  // Acciones de datos
  fetchDocuments: (employeeId: string, options?: { refresh?: boolean }) => Promise<void>;
  uploadDocument: (employeeId: string, formData: FormData) => Promise<boolean>;
  deleteDocument: (employeeId: string, documentId: string) => Promise<boolean>;
  downloadDocument: (employeeId: string, documentId: string, fileName?: string) => Promise<boolean>;
  previewDocument: (employeeId: string, documentId: string) => Promise<void>;

  // Acciones para vista global
  fetchAllDocuments: (options?: { refresh?: boolean }) => Promise<void>;
  setGlobalFilters: (filters: Partial<DocumentsState["globalFilters"]>) => void;
  clearGlobalFilters: () => void;
  setGlobalPage: (page: number) => void;
  setGlobalLimit: (limit: number) => void;

  // Acciones de filtros
  setFilters: (filters: Partial<DocumentsState["filters"]>) => void;
  clearFilters: () => void;

  // Acciones de paginación
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Acciones de estado
  setCurrentEmployee: (employeeId: string | null) => void;
  clearDocuments: () => void;
}

type DocumentsStore = DocumentsState & DocumentsActions;

const ensureDocumentsEnabled = (): boolean => {
  const isAvailable = useOrganizationFeaturesStore.getState().features.moduleAvailability.documents;
  if (features.documents && isAvailable) {
    return true;
  }

  toast.info("El módulo de documentos está deshabilitado.");
  return false;
};

const initialState: DocumentsState = {
  documents: [],
  isLoading: false,
  isUploading: false,
  currentEmployeeId: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  globalDocuments: [],
  isLoadingGlobal: false,
  globalFilters: {},
  globalPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  storage: {
    limit: 0,
    used: 0,
    reserved: 0,
  },
};

export const useDocumentsStore = create<DocumentsStore>((set, get) => ({
  ...initialState,

  // Obtener documentos
  fetchDocuments: async (employeeId: string, options = {}) => {
    const { refresh = false } = options;
    if (!ensureDocumentsEnabled()) {
      return;
    }
    const state = get();

    // Si es el mismo empleado y no es refresh, no hacer nada
    if (state.currentEmployeeId === employeeId && !refresh && state.documents.length > 0) {
      return;
    }

    set({ isLoading: true, currentEmployeeId: employeeId });

    try {
      const params = new URLSearchParams({
        page: state.pagination.page.toString(),
        limit: state.pagination.limit.toString(),
      });

      // Añadir filtros si existen
      if (state.filters.documentKind) {
        params.append("documentKind", state.filters.documentKind);
      }
      if (state.filters.search) {
        params.append("search", state.filters.search);
      }
      if (state.filters.dateFrom) {
        params.append("dateFrom", state.filters.dateFrom);
      }
      if (state.filters.dateTo) {
        params.append("dateTo", state.filters.dateTo);
      }

      const response = await fetch(`/api/employees/${employeeId}/documents?${params}`);

      if (!response.ok) {
        throw new Error("Error al cargar documentos");
      }

      const data = await response.json();

      set({
        documents: data.documents,
        pagination: data.pagination,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Error al cargar documentos");
      set({ isLoading: false });
    }
  },

  // Subir documento
  uploadDocument: async (employeeId: string, formData: FormData) => {
    if (!ensureDocumentsEnabled()) {
      return false;
    }

    set({ isUploading: true });

    try {
      const response = await fetch(`/api/employees/${employeeId}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error al subir documento");
      }

      // Añadir el nuevo documento al estado
      const state = get();
      set({
        documents: [data.document, ...state.documents],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
        isUploading: false,
      });

      toast.success("Documento subido exitosamente");
      return true;
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(error instanceof Error ? error.message : "Error al subir documento");
      set({ isUploading: false });
      return false;
    }
  },

  // Eliminar documento
  deleteDocument: async (employeeId: string, documentId: string) => {
    if (!ensureDocumentsEnabled()) {
      return false;
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}/documents?documentId=${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Error al eliminar documento");
      }

      // Remover del estado
      const state = get();
      set({
        documents: state.documents.filter((doc) => doc.id !== documentId),
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
      });

      toast.success("Documento eliminado exitosamente");
      return true;
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar documento");
      return false;
    }
  },

  // Descargar documento
  downloadDocument: async (employeeId: string, documentId: string, fileName?: string) => {
    if (!ensureDocumentsEnabled()) {
      return false;
    }

    try {
      // Usar el helper centralizado con la estrategia de URL firmada (Enterprise pattern)
      await downloadFileFromApi(
        `/api/employees/${employeeId}/documents/${documentId}/download?action=url&disposition=attachment`,
        fileName,
      );
      toast.success("Descarga iniciada");
      return true;
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error(error instanceof Error ? error.message : "Error al descargar documento");
      return false;
    }
  },

  // Vista previa de documento
  previewDocument: async (employeeId: string, documentId: string) => {
    if (!ensureDocumentsEnabled()) {
      return;
    }

    try {
      await openFilePreviewFromApi(`/api/employees/${employeeId}/documents/${documentId}/download?action=url`);
    } catch (error) {
      console.error("Error previewing document:", error);
      toast.error(error instanceof Error ? error.message : "Error al abrir documento");
    }
  },

  // Filtros
  setFilters: (newFilters) => {
    const state = get();
    const updatedFilters = { ...state.filters, ...newFilters };

    set({
      filters: updatedFilters,
      pagination: { ...state.pagination, page: 1 }, // Resetear a página 1
    });

    // Refetch con nuevos filtros
    if (state.currentEmployeeId) {
      get().fetchDocuments(state.currentEmployeeId, { refresh: true });
    }
  },

  clearFilters: () => {
    const state = get();
    set({
      filters: {},
      pagination: { ...state.pagination, page: 1 },
    });

    // Refetch sin filtros
    if (state.currentEmployeeId) {
      get().fetchDocuments(state.currentEmployeeId, { refresh: true });
    }
  },

  // Paginación
  setPage: (page) => {
    const state = get();
    set({ pagination: { ...state.pagination, page } });

    // Refetch con nueva página
    if (state.currentEmployeeId) {
      get().fetchDocuments(state.currentEmployeeId, { refresh: true });
    }
  },

  setLimit: (limit) => {
    const state = get();
    set({
      pagination: { ...state.pagination, limit, page: 1 }, // Resetear a página 1
    });

    // Refetch con nuevo límite
    if (state.currentEmployeeId) {
      get().fetchDocuments(state.currentEmployeeId, { refresh: true });
    }
  },

  // Estado
  setCurrentEmployee: (employeeId) => {
    set({ currentEmployeeId: employeeId });
  },

  clearDocuments: () => {
    set({
      documents: [],
      currentEmployeeId: null,
      filters: {},
      pagination: initialState.pagination,
    });
  },

  // ==================== FUNCIONES PARA VISTA GLOBAL ====================

  // Obtener todos los documentos de la organización
  fetchAllDocuments: async (options = {}) => {
    const { refresh = false } = options;
    if (!ensureDocumentsEnabled()) {
      return;
    }
    const state = get();

    // Si ya hay datos y no es refresh, no hacer nada
    if (!refresh && state.globalDocuments.length > 0) {
      return;
    }

    set({ isLoadingGlobal: true });

    try {
      const params = new URLSearchParams({
        page: state.globalPagination.page.toString(),
        limit: state.globalPagination.limit.toString(),
      });

      // Añadir filtros si existen
      if (state.globalFilters.employeeId) {
        params.append("employeeId", state.globalFilters.employeeId);
      }
      if (state.globalFilters.documentKind) {
        params.append("documentKind", state.globalFilters.documentKind);
      }
      if (state.globalFilters.search) {
        params.append("search", state.globalFilters.search);
      }
      if (state.globalFilters.dateFrom) {
        params.append("dateFrom", state.globalFilters.dateFrom);
      }
      if (state.globalFilters.dateTo) {
        params.append("dateTo", state.globalFilters.dateTo);
      }

      const response = await fetch(`/api/documents?${params}`);

      if (!response.ok) {
        throw new Error("Error al cargar documentos");
      }

      const data = await response.json();

      set({
        globalDocuments: data.documents,
        globalPagination: data.pagination,
        storage: data.storage ?? { limit: 0, used: 0, reserved: 0 },
        isLoadingGlobal: false,
      });
    } catch (error) {
      console.error("Error fetching all documents:", error);
      toast.error("Error al cargar documentos");
      set({ isLoadingGlobal: false });
    }
  },

  // Filtros globales
  setGlobalFilters: (newFilters) => {
    const state = get();
    const updatedFilters = { ...state.globalFilters, ...newFilters };

    set({
      globalFilters: updatedFilters,
      globalPagination: { ...state.globalPagination, page: 1 }, // Resetear a página 1
    });

    // Refetch con nuevos filtros
    get().fetchAllDocuments({ refresh: true });
  },

  clearGlobalFilters: () => {
    set({
      globalFilters: {},
      globalPagination: { ...get().globalPagination, page: 1 },
    });

    // Refetch sin filtros
    get().fetchAllDocuments({ refresh: true });
  },

  // Paginación global
  setGlobalPage: (page) => {
    const state = get();
    set({ globalPagination: { ...state.globalPagination, page } });

    // Refetch con nueva página
    get().fetchAllDocuments({ refresh: true });
  },

  setGlobalLimit: (limit) => {
    const state = get();
    set({
      globalPagination: { ...state.globalPagination, limit, page: 1 }, // Resetear a página 1
    });

    // Refetch con nuevo límite
    get().fetchAllDocuments({ refresh: true });
  },
}));

// Hook personalizado para obtener documentos agrupados por tipo
export const useDocumentsByKind = () => {
  const documents = useDocumentsStore((state) => state.documents);

  const groupedDocuments = documents.reduce(
    (acc, doc) => {
      if (!acc[doc.kind]) {
        acc[doc.kind] = [];
      }
      acc[doc.kind].push(doc);
      return acc;
    },
    {} as Record<DocumentKind, EmployeeDocument[]>,
  );

  return groupedDocuments;
};

// Hook para obtener estadísticas de documentos
export const useDocumentStats = () => {
  const documents = useDocumentsStore((state) => state.documents);

  const stats = {
    total: documents.length,
    byKind: documents.reduce(
      (acc, doc) => {
        acc[doc.kind] = (acc[doc.kind] || 0) + 1;
        return acc;
      },
      {} as Record<DocumentKind, number>,
    ),
    totalSize: documents.reduce((acc, doc) => acc + doc.fileSize, 0),
    lastUploaded:
      documents.length > 0
        ? documents.reduce((latest, doc) => (new Date(doc.createdAt) > new Date(latest.createdAt) ? doc : latest))
        : null,
  };

  return stats;
};

// Hook para obtener documentos globales agrupados por tipo
export const useGlobalDocumentsByKind = () => {
  const documents = useDocumentsStore((state) => state.globalDocuments);

  const groupedDocuments = documents.reduce(
    (acc, doc) => {
      if (!acc[doc.kind]) {
        acc[doc.kind] = [];
      }
      acc[doc.kind].push(doc);
      return acc;
    },
    {} as Record<DocumentKind, EmployeeDocument[]>,
  );

  return groupedDocuments;
};

// Hook para obtener estadísticas globales de documentos
export const useGlobalDocumentStats = () => {
  const globalDocuments = useDocumentsStore((state) => state.globalDocuments);
  const pagination = useDocumentsStore((state) => state.globalPagination);
  const storage = useDocumentsStore((state) => state.storage);

  const stats = {
    total: pagination.total, // Usar el total de la paginación
    currentPage: globalDocuments.length,
    byKind: globalDocuments.reduce(
      (acc, doc) => {
        acc[doc.kind] = (acc[doc.kind] || 0) + 1;
        return acc;
      },
      {} as Record<DocumentKind, number>,
    ),
    // Usar datos reales del servidor si existen, fallback al cálculo local (que es parcial por paginación)
    totalSize: storage.used > 0 ? storage.used : globalDocuments.reduce((acc, doc) => acc + doc.fileSize, 0),
    storageLimit: storage.limit,
    storageReserved: storage.reserved,
    lastUploaded:
      globalDocuments.length > 0
        ? globalDocuments.reduce((latest, doc) => (new Date(doc.createdAt) > new Date(latest.createdAt) ? doc : latest))
        : null,
    uniqueEmployees: new Set(globalDocuments.map((doc) => doc.employeeId)).size,
  };

  return stats;
};
