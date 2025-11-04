"use client";

import dynamic from "next/dynamic";

// Import dinámico del mapa con ssr: false para evitar errores de SSR con Leaflet
const TimeEntriesMapDynamic = dynamic(() => import("./time-entries-map"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-[600px] items-center justify-center rounded-lg border">
      <p className="text-muted-foreground text-sm">Cargando mapa...</p>
    </div>
  ),
});

export { TimeEntriesMapDynamic as TimeEntriesMap };
export default TimeEntriesMapDynamic;
