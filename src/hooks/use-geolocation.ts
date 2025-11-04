"use client";

import { useState, useCallback } from "react";

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface UseGeolocationResult {
  data: GeolocationData | null;
  error: string | null;
  loading: boolean;
  isSupported: boolean;
  getCurrentPosition: () => Promise<GeolocationData | null>;
  clearError: () => void;
}

/**
 * Hook para capturar la ubicación GPS del usuario
 *
 * @param options - Opciones de geolocalización
 * @returns Resultado con datos de ubicación, estado de carga y función para obtener posición
 */
export function useGeolocation(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  },
): UseGeolocationResult {
  const [data, setData] = useState<GeolocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Verificar si la API de geolocalización está disponible
  const isSupported = typeof window !== "undefined" && "geolocation" in navigator;

  const getCurrentPosition = useCallback(async (): Promise<GeolocationData | null> => {
    if (!isSupported) {
      const errorMsg = "La geolocalización no está soportada en este navegador";
      setError(errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          setData(locationData);
          setLoading(false);
          resolve(locationData);
        },
        (err) => {
          let errorMessage = "Error al obtener ubicación";

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage =
                "Permiso de ubicación denegado. Por favor, habilita el acceso a la ubicación en tu navegador.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Información de ubicación no disponible. Verifica tu conexión GPS.";
              break;
            case err.TIMEOUT:
              errorMessage = "Se agotó el tiempo de espera para obtener la ubicación. Por favor, intenta de nuevo.";
              break;
            default:
              errorMessage = `Error desconocido: ${err.message}`;
          }

          setError(errorMessage);
          setLoading(false);
          resolve(null);
        },
        options,
      );
    });
  }, [isSupported, options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    error,
    loading,
    isSupported,
    getCurrentPosition,
    clearError,
  };
}
