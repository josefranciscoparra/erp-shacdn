"use client";

import { useState, useMemo } from "react";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileSignature,
  Calendar,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

import { SignatureUrgencyBadge } from "@/components/signatures";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MySignature } from "@/stores/signatures-store";

interface MySignaturesTableProps {
  signatures: MySignature[];
  emptyMessage?: string;
}

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];

export function MySignaturesTable({
  signatures,
  emptyMessage = "No hay firmas en este estado",
}: MySignaturesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calcular paginación
  const totalPages = Math.ceil(signatures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSignatures = useMemo(() => signatures.slice(startIndex, endIndex), [signatures, startIndex, endIndex]);

  // Resetear página cuando cambian las firmas
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [signatures.length, totalPages, currentPage]);

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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getSignerStatusIcon = (status: string) => {
    switch (status) {
      case "SIGNED":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "REJECTED":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Lista de firmas */}
      <div className="space-y-3">
        {paginatedSignatures.map((signature) => {
          const signedCount = signature.allSigners.filter((s) => s.status === "SIGNED").length;
          const totalSigners = signature.allSigners.length;

          return (
            <Card key={signature.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col @lg:flex-row">
                  {/* Sección principal */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-3">
                      {/* Icono */}
                      <div className="bg-primary/10 rounded-lg p-2.5">
                        <FileSignature className="text-primary h-5 w-5" />
                      </div>

                      {/* Contenido */}
                      <div className="min-w-0 flex-1">
                        {/* Título y descripción */}
                        <h3 className="truncate text-sm font-semibold">{signature.document.title}</h3>
                        {signature.document.description && (
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                            {signature.document.description}
                          </p>
                        )}

                        {/* Metadatos */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                          {/* Categoría */}
                          <Badge variant="outline" className="text-xs font-normal">
                            {signature.document.category}
                          </Badge>

                          {/* Fecha de creación */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {format(new Date(signature.request.createdAt), "d MMM yyyy", { locale: es })}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Fecha de creación</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Fecha de expiración */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    Vence {format(new Date(signature.request.expiresAt), "d MMM yyyy", { locale: es })}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Fecha de expiración</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* Firmantes */}
                        <div className="mt-3 border-t pt-3">
                          <div className="flex items-center gap-2">
                            <Users className="text-muted-foreground h-3.5 w-3.5" />
                            <span className="text-muted-foreground text-xs font-medium">Firmantes:</span>
                            <span className="text-xs">
                              {signedCount}/{totalSigners} completados
                            </span>
                          </div>

                          {/* Lista de firmantes con avatares */}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {signature.allSigners.map((signer, index) => (
                              <TooltipProvider key={signer.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="bg-muted/30 flex items-center gap-1.5 rounded-full border py-0.5 pr-2 pl-0.5">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                          {getInitials(signer.employee.firstName, signer.employee.lastName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="max-w-[100px] truncate text-xs">
                                        {signer.employee.firstName}
                                      </span>
                                      {getSignerStatusIcon(signer.status)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <p className="font-medium">
                                        {signer.employee.firstName} {signer.employee.lastName}
                                      </p>
                                      <p className="text-muted-foreground">
                                        {index === 0 ? "Destinatario principal" : `Validador #${index}`}
                                      </p>
                                      <p className="mt-1">
                                        Estado:{" "}
                                        {signer.status === "SIGNED"
                                          ? "Firmado"
                                          : signer.status === "REJECTED"
                                            ? "Rechazado"
                                            : "Pendiente"}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sección lateral: estado y acciones */}
                  <div className="bg-muted/20 flex flex-row items-center justify-between gap-3 border-t p-4 @lg:w-48 @lg:flex-col @lg:items-end @lg:justify-center @lg:border-t-0 @lg:border-l">
                    {signature.status === "PENDING" && (
                      <>
                        <SignatureUrgencyBadge expiresAt={signature.request.expiresAt} className="whitespace-nowrap" />
                        <Link href={`/dashboard/me/signatures/${signature.signToken}`}>
                          <Button size="sm" className="gap-2">
                            <FileSignature className="h-4 w-4" />
                            Firmar
                          </Button>
                        </Link>
                      </>
                    )}

                    {signature.status === "SIGNED" && (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">Firmado</span>
                        </div>
                        {signature.signedAt && (
                          <p className="text-muted-foreground text-xs">
                            {format(new Date(signature.signedAt), "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        )}
                        <Link href={`/dashboard/me/signatures/${signature.signToken}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </Link>
                      </>
                    )}

                    {signature.status === "REJECTED" && (
                      <>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-600">Rechazado</span>
                        </div>
                        {signature.rejectedAt && (
                          <p className="text-muted-foreground text-xs">
                            {format(new Date(signature.rejectedAt), "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                        )}
                        {signature.rejectionReason && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-xs text-red-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span className="max-w-[120px] truncate">Motivo: {signature.rejectionReason}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-[200px]">{signature.rejectionReason}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <Link href={`/dashboard/me/signatures/${signature.signToken}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Paginación */}
      {signatures.length > ITEMS_PER_PAGE_OPTIONS[0] && (
        <Card>
          <CardFooter className="flex flex-col items-center justify-between gap-4 px-4 py-3 @md:flex-row">
            {/* Info de resultados */}
            <div className="text-muted-foreground text-sm">
              Mostrando {startIndex + 1}-{Math.min(endIndex, signatures.length)} de {signatures.length}
            </div>

            {/* Controles de paginación */}
            <div className="flex items-center gap-4">
              {/* Selector de items por página */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Por página:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botones de navegación */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="text-muted-foreground flex min-w-[80px] items-center justify-center text-sm">
                  {currentPage} / {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
