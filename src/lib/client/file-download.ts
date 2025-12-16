"use client";

interface SignedDownloadResponse {
  url: string;
  fileName?: string;
  mimeType?: string;
}

async function fetchSignedDownload(endpoint: string): Promise<SignedDownloadResponse> {
  const response = await fetch(endpoint, { method: "GET" });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!response.ok) {
    const error = data?.error ?? "No se pudo obtener la URL de descarga";
    throw new Error(error);
  }

  const url = data?.downloadUrl ?? data?.url;
  if (!url) {
    throw new Error("La respuesta no contiene URL de descarga");
  }

  return {
    url,
    fileName: data?.fileName ?? undefined,
    mimeType: data?.mimeType ?? undefined,
  };
}

export async function openFilePreviewFromApi(endpoint: string): Promise<void> {
  const { url } = await fetchSignedDownload(endpoint);
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function downloadFileFromApi(endpoint: string, fallbackName?: string): Promise<void> {
  const { url, fileName } = await fetchSignedDownload(endpoint);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fallbackName ?? fileName ?? "documento";
  anchor.target = "_blank";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
