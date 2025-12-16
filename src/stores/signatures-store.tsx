"use client";

import { differenceInDays } from "date-fns";
import { toast } from "sonner";
import { create } from "zustand";

import { features } from "@/config/features";
import { downloadFileFromApi } from "@/lib/client/file-download";

// ==================== TIPOS ====================

export interface SignableDocument {
  id: string;
  title: string;
  description?: string;
  category: string;
  originalFileUrl: string;
  originalHash: string;
  fileSize: number;
  version: number;
  createdAt: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeNumber?: string;
}

export interface Signer {
  id: string;
  order: number;
  status: "PENDING" | "SIGNED" | "REJECTED";
  employee: Employee;
  signedAt?: string;
  rejectedAt?: string;
  consentGivenAt?: string;
  rejectionReason?: string | null;
}

export interface SignatureRequest {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "EXPIRED";
  policy: string;
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
  document: SignableDocument;
  signers: Signer[];
  _count?: {
    signers: number;
  };
}

export interface MySignature {
  id: string;
  requestId: string;
  status: "PENDING" | "SIGNED" | "REJECTED";
  signToken: string;
  signedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  consentGivenAt?: string;
  document: SignableDocument;
  request: {
    id: string;
    status: string;
    policy: string;
    expiresAt: string;
    createdAt: string;
  };
  allSigners: Signer[];
}

export interface SignSession {
  signerId: string;
  status: "PENDING" | "SIGNED" | "REJECTED";
  consentGiven: boolean;
  consentGivenAt?: string;
  signedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  order: number;
  employee: Employee;
  request: {
    id: string;
    status: string;
    policy: string;
    expiresAt: string;
    createdAt: string;
  };
  document: SignableDocument;
  allSigners: Signer[];
}

// ==================== STATE ====================

interface SignaturesState {
  // HR/Admin - Todas las solicitudes
  allRequests: SignatureRequest[];
  isLoadingRequests: boolean;

  // Empleado - Mis firmas
  myPendingSignatures: MySignature[];
  mySignedSignatures: MySignature[];
  myRejectedSignatures: MySignature[];
  myExpiredSignatures: MySignature[];
  urgentCount: number;
  isLoadingMySignatures: boolean;

  // Visor de firma
  currentSession: SignSession | null;
  isLoadingSession: boolean;
  isSigning: boolean;

  // Filtros y paginación
  filters: {
    status?: string;
    category?: string;
    search?: string;
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    byStatus: Record<string, number>;
  };
}

interface SignaturesActions {
  // HR/Admin
  fetchAllRequests: (options?: { refresh?: boolean }) => Promise<void>;
  setFilters: (filters: Partial<SignaturesState["filters"]>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;

  // Empleado
  fetchMyPendingSignatures: (options?: { refresh?: boolean }) => Promise<void>;

  // Visor
  fetchSessionByToken: (token: string) => Promise<void>;
  giveConsent: (token: string, data: { ipAddress?: string; userAgent?: string }) => Promise<boolean>;
  confirmSignature: (token: string, data: { ipAddress?: string; userAgent?: string }) => Promise<boolean>;
  rejectSignature: (token: string, reason: string) => Promise<boolean>;

  // Descargas
  downloadSignedDocument: (id: string) => Promise<void>;
  downloadEvidence: (signerId: string) => Promise<void>;

  // Limpieza
  clearSession: () => void;
}

type SignaturesStore = SignaturesState & SignaturesActions;

// ==================== HELPERS ====================

const ensureSignaturesEnabled = (): boolean => {
  if (features.signatures) {
    return true;
  }

  toast.info("El módulo de firmas está deshabilitado.");
  return false;
};

const initialState: SignaturesState = {
  allRequests: [],
  isLoadingRequests: false,

  myPendingSignatures: [],
  mySignedSignatures: [],
  myRejectedSignatures: [],
  myExpiredSignatures: [],
  urgentCount: 0,
  isLoadingMySignatures: false,

  currentSession: null,
  isLoadingSession: false,
  isSigning: false,

  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  summary: {
    total: 0,
    byStatus: {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      REJECTED: 0,
      EXPIRED: 0,
    },
  },
};

// ==================== STORE ====================

export const useSignaturesStore = create<SignaturesStore>((set, get) => ({
  ...initialState,

  // ==================== HR/ADMIN ====================

  fetchAllRequests: async (options = {}) => {
    const { refresh = false } = options;
    if (!ensureSignaturesEnabled()) {
      return;
    }

    const state = get();

    // Si ya hay datos y no es refresh, no hacer nada
    if (!refresh && state.allRequests.length > 0) {
      return;
    }

    set({ isLoadingRequests: true });

    try {
      const params = new URLSearchParams({
        page: state.pagination.page.toString(),
        limit: state.pagination.limit.toString(),
      });

      // Añadir filtros
      if (state.filters.status) {
        params.append("status", state.filters.status);
      }
      if (state.filters.category) {
        params.append("category", state.filters.category);
      }
      if (state.filters.search) {
        params.append("search", state.filters.search);
      }
      if (state.filters.employeeId && state.filters.employeeId !== "__none__") {
        params.append("employeeId", state.filters.employeeId);
      }
      if (state.filters.dateFrom) {
        params.append("dateFrom", state.filters.dateFrom);
      }
      if (state.filters.dateTo) {
        params.append("dateTo", state.filters.dateTo);
      }

      const response = await fetch(`/api/signatures/requests?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error response:", errorData);
        throw new Error(errorData.details ?? errorData.error ?? "Error al cargar solicitudes");
      }

      const data = await response.json();

      set({
        allRequests: data.requests,
        pagination: data.pagination,
        summary: data.summary ?? initialState.summary,
        isLoadingRequests: false,
      });
    } catch (error) {
      console.error("Error fetching signature requests:", error);
      toast.error("Error al cargar solicitudes de firma");
      set({ isLoadingRequests: false, summary: initialState.summary });
    }
  },

  setFilters: (newFilters) => {
    const state = get();
    const updatedFilters = { ...state.filters, ...newFilters };

    if (typeof updatedFilters.search === "string") {
      const trimmed = updatedFilters.search.trim();
      updatedFilters.search = trimmed.length > 0 ? trimmed : undefined;
    }

    if (updatedFilters.employeeId === "__none__") {
      updatedFilters.employeeId = undefined;
    }

    set({
      filters: updatedFilters,
      pagination: { ...state.pagination, page: 1 },
    });

    // Refetch con nuevos filtros
    get().fetchAllRequests({ refresh: true });
  },

  clearFilters: () => {
    set({
      filters: {},
      pagination: { ...get().pagination, page: 1 },
    });

    // Refetch sin filtros
    get().fetchAllRequests({ refresh: true });
  },

  setPage: (page) => {
    const state = get();
    const totalPages = state.pagination.totalPages || 1;
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    set({ pagination: { ...state.pagination, page: nextPage } });

    // Refetch con nueva página
    get().fetchAllRequests({ refresh: true });
  },

  setLimit: (limit) => {
    const state = get();
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    set({ pagination: { ...state.pagination, limit: normalizedLimit, page: 1 } });

    get().fetchAllRequests({ refresh: true });
  },

  // ==================== EMPLEADO ====================

  fetchMyPendingSignatures: async (options = {}) => {
    const { refresh = false } = options;
    if (!ensureSignaturesEnabled()) {
      return;
    }

    const state = get();

    // Si ya hay datos y no es refresh, no hacer nada
    if (!refresh && state.myPendingSignatures.length > 0) {
      return;
    }

    set({ isLoadingMySignatures: true });

    try {
      const response = await fetch("/api/signatures/me/pending");

      if (!response.ok) {
        throw new Error("Error al cargar mis firmas");
      }

      const data = await response.json();

      // Calcular urgentes en cliente
      const urgent = data.pending.filter((sig: MySignature) => {
        const days = differenceInDays(new Date(sig.request.expiresAt), new Date());
        return days >= 0 && days <= 3;
      });

      set({
        myPendingSignatures: data.pending,
        mySignedSignatures: data.signed,
        myRejectedSignatures: data.rejected,
        myExpiredSignatures: data.expired,
        urgentCount: urgent.length,
        isLoadingMySignatures: false,
      });
    } catch (error) {
      console.error("Error fetching my signatures:", error);
      toast.error("Error al cargar mis firmas pendientes");
      set({ isLoadingMySignatures: false });
    }
  },

  // ==================== VISOR ====================

  fetchSessionByToken: async (token: string) => {
    if (!ensureSignaturesEnabled()) {
      return;
    }

    set({ isLoadingSession: true });

    try {
      const response = await fetch(`/api/signatures/sessions/${token}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Error al cargar sesión de firma");
      }

      const data = await response.json();

      set({
        currentSession: data,
        isLoadingSession: false,
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error(error instanceof Error ? error.message : "Error al cargar sesión");
      set({ isLoadingSession: false, currentSession: null });
    }
  },

  giveConsent: async (token: string, data: { ipAddress?: string; userAgent?: string }) => {
    if (!ensureSignaturesEnabled()) {
      return false;
    }

    try {
      const response = await fetch(`/api/signatures/sessions/${token}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Error al dar consentimiento");
      }

      const result = await response.json();

      // Actualizar sesión con consentimiento
      const state = get();
      if (state.currentSession) {
        set({
          currentSession: {
            ...state.currentSession,
            consentGiven: true,
            consentGivenAt: result.consentGivenAt,
          },
        });
      }

      toast.success("Consentimiento registrado");
      return true;
    } catch (error) {
      console.error("Error giving consent:", error);
      toast.error(error instanceof Error ? error.message : "Error al dar consentimiento");
      return false;
    }
  },

  confirmSignature: async (token: string, data: { ipAddress?: string; userAgent?: string }) => {
    if (!ensureSignaturesEnabled()) {
      return false;
    }

    set({ isSigning: true });

    try {
      const response = await fetch(`/api/signatures/sessions/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Error al confirmar firma");
      }

      const result = await response.json();

      const state = get();
      const session = state.currentSession;

      if (session) {
        const updatedSigners = session.allSigners.map((signer) =>
          signer.id === session.signerId
            ? {
                ...signer,
                status: "SIGNED",
                signedAt: result.signedAt ?? signer.signedAt,
                rejectedAt: undefined,
                rejectionReason: null,
              }
            : signer,
        );

        set({
          currentSession: {
            ...session,
            status: "SIGNED",
            consentGiven: true,
            signedAt: result.signedAt ?? session.signedAt ?? null,
            rejectedAt: null,
            rejectionReason: null,
            request: {
              ...session.request,
              status: result.allCompleted ? "COMPLETED" : "IN_PROGRESS",
            },
            allSigners: updatedSigners,
          },
          isSigning: false,
        });
      } else {
        set({ isSigning: false });
      }

      await get().fetchMyPendingSignatures({ refresh: true });

      toast.success("Documento firmado exitosamente");
      return true;
    } catch (error) {
      console.error("Error confirming signature:", error);
      toast.error(error instanceof Error ? error.message : "Error al firmar documento");
      set({ isSigning: false });
      return false;
    }
  },

  rejectSignature: async (token: string, reason: string) => {
    if (!ensureSignaturesEnabled()) {
      return false;
    }

    set({ isSigning: true });

    try {
      const response = await fetch(`/api/signatures/sessions/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Error al rechazar firma");
      }

      const result = await response.json();

      const state = get();
      const session = state.currentSession;

      if (session) {
        const updatedSigners = session.allSigners.map((signer) =>
          signer.id === session.signerId
            ? {
                ...signer,
                status: "REJECTED",
                rejectedAt: result.rejectedAt ?? signer.rejectedAt,
                rejectionReason: result.reason ?? signer.rejectionReason,
              }
            : signer,
        );

        set({
          currentSession: {
            ...session,
            status: "REJECTED",
            rejectedAt: result.rejectedAt ?? session.rejectedAt ?? null,
            rejectionReason: result.reason ?? session.rejectionReason ?? null,
            request: {
              ...session.request,
              status: "REJECTED",
            },
            allSigners: updatedSigners,
          },
          isSigning: false,
        });
      } else {
        set({ isSigning: false });
      }

      await get().fetchMyPendingSignatures({ refresh: true });

      toast.success("Documento rechazado");
      return true;
    } catch (error) {
      console.error("Error rejecting signature:", error);
      toast.error(error instanceof Error ? error.message : "Error al rechazar firma");
      set({ isSigning: false });
      return false;
    }
  },

  // ==================== DESCARGAS ====================

  downloadSignedDocument: async (id: string) => {
    if (!ensureSignaturesEnabled()) {
      return;
    }

    try {
      await downloadFileFromApi(`/api/signatures/documents/${id}/download`, `documento-firmado-${id}.pdf`);
      toast.success("Documento descargado");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error(error instanceof Error ? error.message : "Error al descargar documento");
    }
  },

  downloadEvidence: async (signerId: string) => {
    if (!ensureSignaturesEnabled()) {
      return;
    }

    try {
      const response = await fetch(`/api/signatures/evidence/by-signer/${signerId}/download`);

      if (!response.ok) {
        throw new Error("Error al descargar evidencia");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Crear link temporal y descargar
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidencia-${signerId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Evidencia descargada");
    } catch (error) {
      console.error("Error downloading evidence:", error);
      toast.error("Error al descargar evidencia");
    }
  },

  // ==================== LIMPIEZA ====================

  clearSession: () => {
    set({ currentSession: null, isLoadingSession: false, isSigning: false });
  },
}));
