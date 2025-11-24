"use client";

import { useRef, useEffect } from "react";

import { useOrganizationFeaturesStore, type OrganizationFeatures } from "@/stores/organization-features-store";

interface FeaturesInitializerProps {
  initialFeatures: OrganizationFeatures;
}

/**
 * Componente que inicializa los features de la organización
 *
 * Este componente recibe los features desde el servidor (cero delay)
 * y los carga SÍNCRÓNAMENTE en el store antes del primer render.
 *
 * También se sincroniza cuando los props cambian (ej: después de router.refresh())
 *
 * No renderiza nada visible, solo inicializa el store.
 */
export function FeaturesInitializer({ initialFeatures }: FeaturesInitializerProps) {
  const initialized = useRef(false);

  // Inicialización síncrona (se ejecuta ANTES del primer render)
  if (!initialized.current) {
    useOrganizationFeaturesStore.getState().setFeatures(initialFeatures);
    initialized.current = true;
  }

  // Sincronizar cuando los props cambien (después de router.refresh())
  useEffect(() => {
    // Solo sincronizar si ya estamos inicializados (evita doble ejecución en el primer render)
    if (initialized.current) {
      useOrganizationFeaturesStore.getState().setFeatures(initialFeatures);
    }
  }, [initialFeatures]);

  return null;
}
