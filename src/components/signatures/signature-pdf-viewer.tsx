"use client";

import { useState } from "react";

import { FileText, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";

interface SignaturePdfViewerProps {
  pdfUrl: string;
  title: string;
  className?: string;
}

export function SignaturePdfViewer({ pdfUrl, title, className = "" }: SignaturePdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Loading state */}
      {isLoading && (
        <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center">
          <div className="space-y-2 text-center">
            <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Cargando documento...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-background absolute inset-0 z-10 flex items-center justify-center">
          <div className="space-y-4 p-4 text-center">
            <FileText className="text-muted-foreground mx-auto h-12 w-12" />
            <div>
              <p className="font-medium">No se pudo cargar el documento</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Intenta{" "}
                <button
                  onClick={() => {
                    setError(false);
                    setIsLoading(true);
                  }}
                  className="text-primary underline"
                >
                  recargar
                </button>{" "}
                o contacta con soporte
              </p>
            </div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-block text-sm hover:underline"
            >
              Abrir en nueva pestaña →
            </a>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <iframe
        src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
        title={title}
        className="h-full min-h-[600px] w-full border-0 md:min-h-[800px]"
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Footer info */}
      <div className="from-background/90 absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent p-2">
        <p className="text-muted-foreground text-center text-xs">{title} • Documento PDF</p>
      </div>
    </Card>
  );
}
