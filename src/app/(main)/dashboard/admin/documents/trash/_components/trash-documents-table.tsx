"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Archive, FileText, Lock, RefreshCw, RotateCcw, Search, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/validations/document";
import {
  getTrashDocuments,
  purgeAllExpired,
  purgeDocument,
  restoreDocument,
  type GetTrashResult,
  type TrashDocument,
} from "@/server/actions/document-trash";

export function TrashDocumentsTable() {
  const [data, setData] = useState<GetTrashResult | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedDoc, setSelectedDoc] = useState<TrashDocument | null>(null);
  const [dialogAction, setDialogAction] = useState<"restore" | "purge" | "purgeAll" | null>(null);

  const loadData = useCallback(() => {
    startTransition(async () => {
      const result = await getTrashDocuments({ search: search || undefined });
      setData(result);
    });
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRestore = async () => {
    if (!selectedDoc) return;
    const result = await restoreDocument(selectedDoc.id);
    if (result.success) {
      toast.success("Documento restaurado correctamente");
      loadData();
    } else {
      toast.error(result.error ?? "Error al restaurar");
    }
    setDialogAction(null);
    setSelectedDoc(null);
  };

  const handlePurge = async () => {
    if (!selectedDoc) return;
    const result = await purgeDocument(selectedDoc.id);
    if (result.success) {
      toast.success("Documento eliminado permanentemente");
      loadData();
    } else {
      toast.error(result.error ?? "Error al purgar");
    }
    setDialogAction(null);
    setSelectedDoc(null);
  };

  const handlePurgeAll = async () => {
    const result = await purgeAllExpired();
    if (result.success) {
      toast.success(`${result.purgedCount} documentos eliminados permanentemente`);
      loadData();
    } else {
      toast.error(result.error ?? "Error al purgar");
    }
    setDialogAction(null);
  };

  if (!data) {
    return null;
  }

  if (!data.success) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={<AlertTriangle className="size-12" />}
            title="Error"
            description={data.error ?? "Error al cargar la papelera"}
          />
        </CardContent>
      </Card>
    );
  }

  const { documents, stats, pagination } = data;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Archive className="size-4" />
                En papelera
              </CardDescription>
              <CardTitle className="text-2xl">{stats?.totalCount ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{formatFileSize(stats?.totalSize ?? 0)} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-green-600">
                <Trash2 className="size-4" />
                Listos para purgar
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats?.canPurgeCount ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{formatFileSize(stats?.canPurgeSize ?? 0)} recuperables</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-amber-600">
                <Shield className="size-4" />
                Con retención
              </CardDescription>
              <CardTitle className="text-2xl text-amber-600">{stats?.retainedCount ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Obligación legal vigente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-red-600">
                <Lock className="size-4" />
                Legal Hold
              </CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats?.legalHoldCount ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Bloqueados manualmente</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nombre o empleado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={isPending}>
              <RefreshCw className={cn("mr-2 size-4", isPending && "animate-spin")} />
              Actualizar
            </Button>
            {(stats?.canPurgeCount ?? 0) > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setDialogAction("purgeAll")}>
                <Trash2 className="mr-2 size-4" />
                Purgar expirados ({stats?.canPurgeCount})
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {documents && documents.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Eliminado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                          <FileText className="text-muted-foreground size-5" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-muted-foreground text-sm">
                            {doc.kind} - {formatFileSize(doc.fileSize)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {doc.employee.firstName} {doc.employee.lastName}
                      </p>
                      {doc.employee.employeeNumber && (
                        <p className="text-muted-foreground text-sm">#{doc.employee.employeeNumber}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{format(new Date(doc.deletedAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                      {doc.deletedBy && <p className="text-muted-foreground text-sm">por {doc.deletedBy.name}</p>}
                    </TableCell>
                    <TableCell>
                      {doc.purgeStatus.canPurge ? (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          Listo para purgar
                        </Badge>
                      ) : doc.purgeStatus.legalHold ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive">
                              <Lock className="mr-1 size-3" />
                              Legal Hold
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Bloqueado por obligación legal activa</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary">
                              <Shield className="mr-1 size-3" />
                              Retención hasta{" "}
                              {doc.purgeStatus.retainUntil
                                ? format(new Date(doc.purgeStatus.retainUntil), "dd/MM/yyyy")
                                : "N/A"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{doc.purgeStatus.reason}</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setDialogAction("restore");
                              }}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Restaurar documento</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={!doc.purgeStatus.canPurge}
                              onClick={() => {
                                setSelectedDoc(doc);
                                setDialogAction("purge");
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {doc.purgeStatus.canPurge
                              ? "Eliminar permanentemente"
                              : (doc.purgeStatus.reason ?? "No se puede purgar")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={<Archive className="size-12" />}
                title="Papelera vacía"
                description="No hay documentos eliminados en la papelera."
              />
            </CardContent>
          </Card>
        )}

        {/* Pagination info */}
        {pagination && pagination.totalPages > 1 && (
          <p className="text-muted-foreground text-center text-sm">
            Mostrando {documents?.length ?? 0} de {pagination.totalCount} documentos
          </p>
        )}

        {/* Restore Dialog */}
        <AlertDialog open={dialogAction === "restore"} onOpenChange={() => setDialogAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar documento</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres restaurar &quot;{selectedDoc?.fileName}&quot;? El documento volverá a estar
                visible para el empleado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore}>Restaurar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Purge Dialog */}
        <AlertDialog open={dialogAction === "purge"} onOpenChange={() => setDialogAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="size-5" />
                Eliminar permanentemente
              </AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres eliminar permanentemente &quot;{selectedDoc?.fileName}&quot;? Esta acción
                no se puede deshacer y el archivo se borrará del almacenamiento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurge} className="bg-destructive text-destructive-foreground">
                Eliminar permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Purge All Dialog */}
        <AlertDialog open={dialogAction === "purgeAll"} onOpenChange={() => setDialogAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="size-5" />
                Purgar todos los documentos expirados
              </AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán permanentemente {stats?.canPurgeCount} documentos (
                {formatFileSize(stats?.canPurgeSize ?? 0)}
                ). Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurgeAll} className="bg-destructive text-destructive-foreground">
                Purgar {stats?.canPurgeCount} documentos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
