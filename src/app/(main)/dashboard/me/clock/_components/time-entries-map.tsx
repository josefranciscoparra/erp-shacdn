"use client";

import { useEffect, useState } from "react";

interface TimeEntry {
  id: string;
  entryType: string;
  timestamp: Date;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isWithinAllowedArea: boolean | null;
  requiresReview: boolean;
}

interface TimeEntriesMapProps {
  entries: TimeEntry[];
}

const entryTypeLabels: Record<string, string> = {
  CLOCK_IN: "Entrada",
  CLOCK_OUT: "Salida",
  BREAK_START: "Inicio de pausa",
  BREAK_END: "Fin de pausa",
};

function TimeEntriesMap({ entries }: TimeEntriesMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapComponents, setMapComponents] = useState<any>(null);
  const [leaflet, setLeaflet] = useState<any>(null);

  // Cargar Leaflet y React-Leaflet solo en el cliente
  useEffect(() => {
    setIsClient(true);

    // Importar dinámicamente leaflet y react-leaflet
    Promise.all([import("leaflet"), import("react-leaflet"), import("leaflet/dist/leaflet.css")]).then(
      ([L, reactLeaflet]) => {
        setLeaflet(L.default);
        setMapComponents(reactLeaflet);
      },
    );
  }, []);

  // Filtrar solo entries con GPS
  const entriesWithGPS = entries.filter((e) => e.latitude && e.longitude);

  if (!isClient || !mapComponents || !leaflet) {
    return (
      <div className="bg-muted flex h-[600px] items-center justify-center rounded-lg border">
        <p className="text-muted-foreground text-sm">Cargando mapa...</p>
      </div>
    );
  }

  if (entriesWithGPS.length === 0) {
    return (
      <div className="bg-muted flex h-[600px] items-center justify-center rounded-lg border">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No hay fichajes con ubicación GPS para mostrar</p>
          <p className="text-muted-foreground mt-1 text-xs">Los fichajes con GPS aparecerán aquí</p>
        </div>
      </div>
    );
  }

  // Crear iconos para marcadores (solo en cliente)
  const createIcon = (color: string) => {
    return leaflet.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const icons = {
    CLOCK_IN: createIcon("#22c55e"), // verde
    CLOCK_OUT: createIcon("#ef4444"), // rojo
    BREAK_START: createIcon("#eab308"), // amarillo
    BREAK_END: createIcon("#22c55e"), // verde
  };

  // Calcular centro del mapa basado en los fichajes
  const centerLat = entriesWithGPS.reduce((sum, e) => sum + (e.latitude ?? 0), 0) / entriesWithGPS.length;
  const centerLng = entriesWithGPS.reduce((sum, e) => sum + (e.longitude ?? 0), 0) / entriesWithGPS.length;

  const { MapContainer, TileLayer, Marker, Popup, Circle } = mapComponents;

  return (
    <div className="overflow-hidden rounded-lg border">
      <MapContainer center={[centerLat, centerLng]} zoom={15} style={{ height: "600px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {entriesWithGPS.map((entry) => {
          if (!entry.latitude || !entry.longitude) return null;

          return (
            <div key={entry.id}>
              {/* Marcador del fichaje */}
              <Marker
                position={[entry.latitude, entry.longitude]}
                icon={icons[entry.entryType as keyof typeof icons] ?? icons.CLOCK_IN}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold">{entryTypeLabels[entry.entryType]}</p>
                    <p className="text-xs">
                      {new Date(entry.timestamp).toLocaleString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                    {entry.accuracy && (
                      <p className="text-xs text-gray-600">Precisión: {Math.round(entry.accuracy)}m</p>
                    )}
                    {entry.requiresReview && <p className="text-xs font-semibold text-red-600">⚠️ Requiere revisión</p>}
                    {entry.isWithinAllowedArea === true && (
                      <p className="text-xs font-semibold text-green-600">✓ Dentro del área</p>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Círculo de precisión GPS */}
              {entry.accuracy && (
                <Circle
                  center={[entry.latitude, entry.longitude]}
                  radius={entry.accuracy}
                  pathOptions={{
                    color: entry.requiresReview ? "#ef4444" : "#22c55e",
                    fillColor: entry.requiresReview ? "#ef4444" : "#22c55e",
                    fillOpacity: 0.1,
                    weight: 1,
                  }}
                />
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}

// Export default para dynamic import con ssr: false
export default TimeEntriesMap;

// Named export para compatibilidad con imports existentes
export { TimeEntriesMap };
