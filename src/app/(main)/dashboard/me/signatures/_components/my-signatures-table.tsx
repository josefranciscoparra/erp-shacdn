"use client";

import Link from "next/link";

import { FileSignature } from "lucide-react";

import { SignatureUrgencyBadge } from "@/components/signatures";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSignaturesStore, type MySignature } from "@/stores/signatures-store";

interface MySignaturesTableProps {
  signatures: MySignature[];
  emptyMessage?: string;
}

export function MySignaturesTable({
  signatures,
  emptyMessage = "No hay firmas en este estado",
}: MySignaturesTableProps) {
  if (signatures.length === 0) {
    return (
      <Card className="p-12">
        <div className="space-y-2 text-center">
          <FileSignature className="text-muted-foreground mx-auto h-12 w-12" />
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {signatures.map((signature) => (
        <Card key={signature.id} className="p-4">
          <div className="flex flex-col gap-4 @lg:flex-row @lg:items-center @lg:justify-between">
            {/* Info del documento */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-lg p-2">
                  <FileSignature className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{signature.document.title}</h3>
                  {signature.document.description && (
                    <p className="text-muted-foreground mt-0.5 text-sm">{signature.document.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">Categoría: {signature.document.category}</span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs">
                      {signature.allSigners.length} firmante{signature.allSigners.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Badge de urgencia y acción */}
            <div className="flex items-center gap-3 @lg:flex-col @lg:items-end">
              {signature.status === "PENDING" && (
                <>
                  <SignatureUrgencyBadge expiresAt={signature.request.expiresAt} className="whitespace-nowrap" />
                  <Link href={`/dashboard/me/signatures/${signature.signToken}`}>
                    <Button size="sm" className="whitespace-nowrap">
                      Firmar ahora
                    </Button>
                  </Link>
                </>
              )}

              {signature.status === "SIGNED" && signature.signedAt && (
                <div className="text-muted-foreground text-right text-xs">
                  <p className="font-medium text-green-600">Firmado</p>
                  <p>
                    {new Date(signature.signedAt).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}

              {signature.status === "REJECTED" && signature.rejectedAt && (
                <div className="text-muted-foreground text-right text-xs">
                  <p className="font-medium text-red-600">Rechazado</p>
                  <p>
                    {new Date(signature.rejectedAt).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {signature.rejectionReason && (
                    <p className="mt-1 max-w-[200px] text-xs">Motivo: {signature.rejectionReason}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
