"use client";

interface SignedDownloadResponse {
  url: string;
  fileName?: string;
  mimeType?: string;
}

class DownloadError extends Error {
  constructor(
    message: string,
    public code: "NETWORK_ERROR" | "PERMISSION_DENIED" | "FILE_NOT_FOUND" | "UNKNOWN" = "UNKNOWN",
  ) {
    super(message);
    this.name = "DownloadError";
  }
}

function sanitizeFileName(name: string): string {
  // Reemplazar caracteres inválidos y asegurar que no sea demasiado largo
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Reemplaza caracteres no alfanuméricos (excepto . _ -) con guion bajo
    .replace(/_{2,}/g, "_") // Evita guiones bajos consecutivos
    .substring(0, 255); // Límite seguro para sistemas de archivos
}

async function fetchSignedDownload(endpoint: string): Promise<SignedDownloadResponse> {
  let response: Response;
  try {
    response = await fetch(endpoint, { method: "GET" });
  } catch {
    throw new DownloadError("Error de conexión al intentar descargar el archivo", "NETWORK_ERROR");
  }

  let data: any = null;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      // ignore JSON parse errors
    }
  }

  if (!response.ok) {
    const errorMessage = data?.error ?? "No se pudo obtener la URL de descarga";

    if (response.status === 403) {
      throw new DownloadError("No tienes permisos para descargar este archivo", "PERMISSION_DENIED");
    }
    if (response.status === 404) {
      throw new DownloadError("El archivo solicitado no existe o ha sido eliminado", "FILE_NOT_FOUND");
    }

    throw new DownloadError(errorMessage, "UNKNOWN");
  }

  const url = data?.downloadUrl ?? data?.url;
  if (!url) {
    throw new DownloadError("La respuesta del servidor no contiene una URL válida", "UNKNOWN");
  }

  return {
    url,
    fileName: data?.fileName ? sanitizeFileName(data.fileName) : undefined,
    mimeType: data?.mimeType ?? undefined,
  };
}

export async function openFilePreviewFromApi(endpoint: string): Promise<void> {
  try {
    const { url } = await fetchSignedDownload(endpoint);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Error opening file preview:", error);
    throw error; // Re-throw para que el componente UI lo maneje (toast, alert, etc.)
  }
}

export async function downloadFileFromApi(endpoint: string, fallbackName?: string): Promise<void> {
  try {
    const { url, fileName } = await fetchSignedDownload(endpoint);
    const finalName = fileName ?? (fallbackName ? sanitizeFileName(fallbackName) : "documento");

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = finalName;
    anchor.target = "_blank";
    anchor.rel = "noopener";

    document.body.appendChild(anchor);
    anchor.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(anchor);
    }, 100);
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}
