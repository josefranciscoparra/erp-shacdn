"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, ExternalLink, FileCheck, FileSignature, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type EmployeeSignedDocument, getEmployeeSignedDocuments } from "@/server/actions/employee-signatures";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

interface EmployeeSignedDocumentsProps {
  employeeId: string;
}

export function EmployeeSignedDocuments({ employeeId }: EmployeeSignedDocumentsProps) {
  const signaturesAvailable = useOrganizationFeaturesStore((state) => state.features.moduleAvailability.signatures);
  const [documents, setDocuments] = useState<EmployeeSignedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signaturesAvailable) {
      setIsLoading(false);
      setDocuments([]);
      setError(null);
      return;
    }
    async function loadDocuments() {
      setIsLoading(true);
      setError(null);

      const result = await getEmployeeSignedDocuments(employeeId);

      if (result.success) {
        setDocuments(result.data);
      } else {
        setError(result.error);
      }

      setIsLoading(false);
    }

    loadDocuments();
  }, [employeeId, signaturesAvailable]);

  if (!signaturesAvailable) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="rounded-lg border shadow-xs">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando documentos firmados...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-lg border shadow-xs">
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="rounded-lg border shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSignature className="h-5 w-5" />
            Documentos Firmados
          </CardTitle>
          <CardDescription>Documentos firmados electrónicamente por el empleado</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <FileCheck className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-lg font-medium">No hay documentos firmados</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Este empleado no ha firmado ningún documento electrónicamente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border shadow-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSignature className="h-5 w-5" />
              Documentos Firmados
              <Badge variant="secondary">{documents.length}</Badge>
            </CardTitle>
            <CardDescription>Documentos firmados electrónicamente por el empleado</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Fecha de firma</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.signatureRequestId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">{doc.documentTitle}</p>
                        <p className="text-muted-foreground text-xs">Versión {doc.documentVersion}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.documentCategory}</Badge>
                  </TableCell>
                  <TableCell>
                    {doc.batchName ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/dashboard/signatures/batches/${doc.batchId}`}
                            className="text-primary hover:underline"
                          >
                            {doc.batchName}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Ver lote de firma</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(doc.signedAt), "dd/MM/yyyy", { locale: es })}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(doc.signedAt), "HH:mm", { locale: es })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/signatures/${doc.signatureRequestId}`}>
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Ver solicitud</span>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver solicitud de firma</TooltipContent>
                      </Tooltip>

                      {doc.downloadUrl && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Descargar PDF firmado</span>
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Descargar PDF firmado</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
