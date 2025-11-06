"use client";

import { useRef } from "react";

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
 * No renderiza nada visible, solo inicializa el store.
 */
export function FeaturesInitializer({ initialFeatures }: FeaturesInitializerProps) {
  const initialized = useRef(false);

  // Inicialización síncrona (se ejecuta ANTES del primer render)
  if (!initialized.current) {
    useOrganizationFeaturesStore.getState().setFeatures(initialFeatures);
    initialized.current = true;
  }

  return null;
}
