"use client";

import { useState } from "react";

import { FileCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { openFilePreviewFromApi } from "@/lib/client/file-download";

interface SignedDocumentButtonProps {
  requestId: string;
}

export function SignedDocumentButton({ requestId }: SignedDocumentButtonProps) {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = async () => {
    setIsOpening(true);
    try {
      await openFilePreviewFromApi(`/api/signatures/documents/${requestId}/download`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo abrir el documento firmado";
      toast.error(message);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void handleOpen()} disabled={isOpening}>
      {isOpening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
      Ver PDF firmado
    </Button>
  );
}
