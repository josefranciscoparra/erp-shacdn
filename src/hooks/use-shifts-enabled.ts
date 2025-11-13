import { useEffect, useState } from "react";

/**
 * Hook para verificar si el módulo de turnos está habilitado para la organización
 */
export function useShiftsEnabled() {
  const [shiftsEnabled, setShiftsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchShiftsConfig() {
      try {
        const response = await fetch("/api/shifts/config");
        const data = (await response.json()) as { shiftsEnabled: boolean };
        setShiftsEnabled(data.shiftsEnabled);
      } catch (error) {
        console.error("Error al obtener configuración de turnos:", error);
        setShiftsEnabled(false);
      } finally {
        setLoading(false);
      }
    }

    void fetchShiftsConfig();
  }, []);

  return { shiftsEnabled, loading };
}
