"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSignaturesStore } from "@/stores/signatures-store";

interface DownloadEvidenceButtonProps {
  signerId: string;
}

export function DownloadEvidenceButton({ signerId }: DownloadEvidenceButtonProps) {
  const { downloadEvidence } = useSignaturesStore();

  return (
    <Button variant="outline" size="sm" onClick={() => downloadEvidence(signerId)}>
      <Download className="mr-2 h-4 w-4" />
      Descargar Evidencia
    </Button>
  );
}
