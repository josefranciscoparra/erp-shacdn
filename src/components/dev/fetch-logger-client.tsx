"use client";

import { useEffect } from "react";

/**
 * Fetch Logger Component - Detecta bucles y llamadas repetidas
 *
 * Solo se ejecuta en desarrollo y en el cliente
 */
export function FetchLoggerClient() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    // Contador de llamadas por endpoint
    const callCounts = new Map<string, number>();
    const callTimestamps = new Map<string, number[]>();

    // Guardar el fetch original
    const originalFetch = window.fetch;

    // Sobrescribir fetch
    window.fetch = function (...args) {
      const [url] = args;
      const urlString = typeof url === "string" ? url : url.toString();

      // Solo trackear llamadas a /api/*
      if (urlString.includes("/api/")) {
        // Incrementar contador
        const count = (callCounts.get(urlString) ?? 0) + 1;
        callCounts.set(urlString, count);

        // Guardar timestamp
        const timestamps = callTimestamps.get(urlString) ?? [];
        const now = Date.now();
        timestamps.push(now);

        // Mantener solo los últimos 60 segundos
        const recentTimestamps = timestamps.filter((t) => now - t < 60000);
        callTimestamps.set(urlString, recentTimestamps);

        // Calcular llamadas por minuto
        const rpm = recentTimestamps.length;

        // Detectar posibles bucles y determinar estilo
        const isLoop = rpm > 10;
        const isWarning = rpm > 5;

        let style: string;
        let icon: string;

        if (isLoop) {
          style = "background: #ff0000; color: white; font-weight: bold; padding: 2px 5px; border-radius: 3px;";
          icon = "🔴 LOOP!";
        } else if (isWarning) {
          style = "background: #ff9800; color: white; padding: 2px 5px; border-radius: 3px;";
          icon = "⚠️";
        } else {
          style = "background: #4caf50; color: white; padding: 2px 5px; border-radius: 3px;";
          icon = "✅";
        }

        console.log(`%c FETCH ${icon} `, style, urlString, `| Count: ${count} | RPM: ${rpm}`);

        // Alerta si hay un bucle
        if (isLoop && count === 11) {
          console.error(
            `🔴 POSIBLE BUCLE DETECTADO en ${urlString}`,
            `\n- Llamadas totales: ${count}`,
            `\n- Llamadas en el último minuto: ${rpm}`,
            `\n- Revisa el stack trace arriba para ver dónde se origina`,
          );
          console.trace("Stack trace del bucle:");
        }
      }

      // Llamar al fetch original
      return originalFetch.apply(this, args);
    };

    console.log(
      "%c🔍 FETCH LOGGER ACTIVADO",
      "background: #2196f3; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 12px;",
      "\n- Se están trackeando todas las llamadas a /api/*",
      "\n- 🟢 Verde = Normal (< 5 RPM)",
      "\n- 🟠 Naranja = Sospechoso (5-10 RPM)",
      "\n- 🔴 Rojo = BUCLE (> 10 RPM)",
    );

    // Cleanup: restaurar fetch original al desmontar
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
