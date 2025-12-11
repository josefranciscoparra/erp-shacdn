import { create } from "zustand";

/**
 * Store para features/módulos habilitados de la organización
 *
 * Este store se carga UNA sola vez después del login y persiste durante toda la sesión.
 * No realiza más llamadas a la API hasta el próximo inicio de sesión.
 *
 * Preparado para venta por módulos: añadir nuevos features es solo añadir campos.
 */

export interface OrganizationFeatures {
  chatEnabled: boolean;
  shiftsEnabled: boolean;
  expenseMode: "PRIVATE" | "PUBLIC" | "MIXED";
  whistleblowingEnabled: boolean;
  // Futuros módulos aquí (ej: documentsEnabled, signaturesEnabled, etc.)
}

interface OrganizationFeaturesState {
  // Features de la organización
  features: OrganizationFeatures;

  // Estado de carga
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // Acciones
  setFeatures: (features: OrganizationFeatures) => void;
  fetchFeatures: () => Promise<void>;
  reset: () => void;
}

const initialFeatures: OrganizationFeatures = {
  chatEnabled: false,
  shiftsEnabled: false,
  expenseMode: "PRIVATE",
  whistleblowingEnabled: false,
};

export const useOrganizationFeaturesStore = create<OrganizationFeaturesState>()((set, get) => ({
  // Estado inicial
  features: initialFeatures,
  isLoaded: false,
  isLoading: false,
  error: null,

  // Establecer features manualmente
  setFeatures: (features) => set({ features, isLoaded: true }),

  // Cargar features desde la API (solo si aún no se ha cargado)
  fetchFeatures: async () => {
    const state = get();

    // Si ya se cargó o está cargando, no hacer nada
    if (state.isLoaded || state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/organization/features");

      if (!response.ok) {
        throw new Error("Error al cargar features de la organización");
      }

      const data = await response.json();

      set({
        features: {
          chatEnabled: data.chatEnabled ?? false,
          shiftsEnabled: data.shiftsEnabled ?? false,
          expenseMode: data.expenseMode ?? "PRIVATE",
          whistleblowingEnabled: data.whistleblowingEnabled ?? false,
        },
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error cargando features de organización:", error);
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
        // Mantener valores por defecto en caso de error
        features: initialFeatures,
        isLoaded: true, // Marcar como cargado para no reintentar constantemente
      });
    }
  },

  // Reset (útil para logout)
  reset: () =>
    set({
      features: initialFeatures,
      isLoaded: false,
      isLoading: false,
      error: null,
    }),
}));
