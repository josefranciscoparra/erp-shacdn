/**
 * Helper para exportar datos a formato CSV
 */

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columnMapping?: Record<keyof T, string>,
): void {
  if (data.length === 0) {
    console.warn("No hay datos para exportar");
    return;
  }

  // Determinar las columnas a exportar
  const keys = Object.keys(data[0]) as (keyof T)[];

  // Crear headers (usar mapping si está disponible, sino usar las keys)
  const headers = keys.map((key) => columnMapping?.[key] ?? String(key));

  // Crear filas
  const rows = data.map((item) =>
    keys.map((key) => {
      const value = item[key];

      // Formatear valores según tipo
      if (value === null || value === undefined) {
        return "";
      }

      // Si es fecha, formatear
      if (value instanceof Date) {
        return value.toLocaleDateString("es-ES");
      }

      // Si es número, formatear con punto decimal español
      if (typeof value === "number") {
        return value.toString().replace(".", ",");
      }

      // Si es string con comas o saltos de línea, entrecomillar
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    }),
  );

  // Combinar todo en CSV
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  // Crear blob y descargar
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
