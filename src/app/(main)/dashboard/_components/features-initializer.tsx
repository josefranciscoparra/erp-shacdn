"use client";

import { useEffect, useRef } from "react";

import { useOrganizationFeaturesStore, type OrganizationFeatures } from "@/stores/organization-features-store";

interface FeaturesInitializerProps {
  initialFeatures: OrganizationFeatures;
}

/**
 * Componente que inicializa los features de la organización
 *
 * Este componente recibe los features desde el servidor (cero delay)
 * y los carga en el store al montar el componente.
 *
 * También se sincroniza cuando los props cambian (ej: después de router.refresh())
 *
 * No renderiza nada visible, solo inicializa el store.
 */
export function FeaturesInitializer({ initialFeatures }: FeaturesInitializerProps) {
  const initialized = useRef(false);

  // Inicializar y sincronizar cuando los props cambien (después de router.refresh())
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    }

    useOrganizationFeaturesStore.getState().setFeatures(initialFeatures);
  }, [initialFeatures]);

  return null;
}
