"use client";

import { useState } from "react";

import { Download, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadFileFromApi, openFilePreviewFromApi } from "@/lib/client/file-download";

interface SignatureDocumentActionsProps {
  requestId: string;
  documentTitle: string;
}

export function SignatureDocumentActions({ requestId, documentTitle }: SignatureDocumentActionsProps) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const endpoint = `/api/signatures/documents/${requestId}/download`;
  const downloadEndpoint = `${endpoint}?disposition=attachment`;

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      await openFilePreviewFromApi(endpoint);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo abrir el documento";
      toast.error(message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadFileFromApi(downloadEndpoint, `${documentTitle}.pdf`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo descargar el documento";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => void handlePreview()} disabled={isPreviewing || isDownloading}>
        {isPreviewing ? <Eye className="mr-2 h-4 w-4 animate-pulse" /> : <Eye className="mr-2 h-4 w-4" />}
        Ver documento
      </Button>
      <Button size="sm" onClick={() => void handleDownload()} disabled={isDownloading}>
        {isDownloading ? <Download className="mr-2 h-4 w-4 animate-pulse" /> : <Download className="mr-2 h-4 w-4" />}
        Descargar PDF
      </Button>
    </div>
  );
}
