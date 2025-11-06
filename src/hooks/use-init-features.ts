import { useEffect } from "react";

import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

/**
 * Hook para inicializar features de la organización
 *
 * Este hook debe llamarse UNA vez en el layout principal después del login.
 * Carga los features de la organización y los cachea en el store para toda la sesión.
 *
 * El store internamente verifica si ya se cargó, por lo que es seguro llamar
 * este hook múltiples veces (solo cargará la primera vez).
 */
export function useInitFeatures() {
  const fetchFeatures = useOrganizationFeaturesStore((state) => state.fetchFeatures);

  useEffect(() => {
    // Llamar a fetchFeatures - el store se encarga de evitar cargas duplicadas
    fetchFeatures();
  }, [fetchFeatures]);
}
