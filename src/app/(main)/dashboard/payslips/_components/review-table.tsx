"use client";

import { useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  RefreshCw,
  SkipForward,
  UserPlus,
  X,
  Loader2,
  CheckSquare,
  Send,
  UserX,
  Undo2,
  Hourglass,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assignPayslipItem, skipPayslipItem, type PayslipUploadItemDetail } from "@/server/actions/payslips";

import { EmployeeSelectorDialog } from "./employee-selector-dialog";
import { ItemPreviewDialog } from "./item-preview-dialog";
import { RevokeItemDialog } from "./revoke-dialog";

interface ReviewTableProps {
  items: PayslipUploadItemDetail[];
  total: number;
  page: number;
  statusFilter?: string;
  onStatusFilterChange: (status: string | undefined) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function getStatusBadge(status: string) {
  switch (status) {
    // Nuevos estados V2
    case "PENDING_OCR":
      return (
        <Badge variant="outline" className="gap-1">
          <Hourglass className="h-3 w-3" />
          En cola OCR
        </Badge>
      );
    case "PENDING_REVIEW":
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
          <AlertCircle className="h-3 w-3" />
          Revisar
        </Badge>
      );
    case "READY":
      return (
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
          <Send className="h-3 w-3" />
          Listo
        </Badge>
      );
    case "PUBLISHED":
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Publicado
        </Badge>
      );
    case "BLOCKED_INACTIVE":
      return (
        <Badge variant="destructive" className="gap-1">
          <UserX className="h-3 w-3" />
          Empleado inactivo
        </Badge>
      );
    case "REVOKED":
      return (
        <Badge variant="secondary" className="gap-1 line-through">
          <Undo2 className="h-3 w-3" />
          Revocado
        </Badge>
      );
    // Estados legacy (mantener para compatibilidad)
    case "PENDING":
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pendiente
        </Badge>
      );
    case "ASSIGNED":
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Asignado
        </Badge>
      );
    case "SKIPPED":
      return (
        <Badge variant="secondary" className="gap-1">
          <SkipForward className="h-3 w-3" />
          Saltado
        </Badge>
      );
    case "ERROR":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getConfidenceBadge(score: number) {
  if (score >= 0.8) {
    return (
      <Badge variant="outline" className="border-green-500 text-green-600">
        {Math.round(score * 100)}%
      </Badge>
    );
  }
  if (score >= 0.5) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        {Math.round(score * 100)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-red-500 text-red-600">
      {Math.round(score * 100)}%
    </Badge>
  );
}

export function ReviewTable({
  items,
  total,
  page,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  onRefresh,
  isLoading,
}: ReviewTableProps) {
  const [selectedItem, setSelectedItem] = useState<PayslipUploadItemDetail | null>(null);
  const [previewItem, setPreviewItem] = useState<PayslipUploadItemDetail | null>(null);
  const [revokeItem, setRevokeItem] = useState<PayslipUploadItemDetail | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSkipping, setIsSkipping] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSkipping, setIsBulkSkipping] = useState(false);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  // Manejo de selección
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      // Solo seleccionar los que se pueden saltar (PENDING o ERROR)
      const selectableIds = items.filter((i) => i.status === "PENDING" || i.status === "ERROR").map((i) => i.id);
      setSelectedIds(new Set(selectableIds));
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAssign = async (employeeId: string) => {
    if (!selectedItem) return;

    setIsAssigning(true);
    try {
      const result = await assignPayslipItem(selectedItem.id, employeeId);
      if (result.success) {
        toast.success("Nómina asignada correctamente");
        setSelectedItem(null);
        onRefresh();
      } else {
        toast.error(result.error ?? "Error al asignar");
      }
    } catch {
      toast.error("Error al asignar la nómina");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSkip = async (itemId: string) => {
    setIsSkipping(itemId);
    try {
      const result = await skipPayslipItem(itemId);
      if (result.success) {
        toast.success("Item saltado");
        onRefresh();
      } else {
        toast.error(result.error ?? "Error al saltar");
      }
    } catch {
      toast.error("Error al saltar el item");
    } finally {
      setIsSkipping(null);
    }
  };

  const handleBulkSkip = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`¿Estás seguro de saltar ${selectedIds.size} items seleccionados?`)) return;

    setIsBulkSkipping(true);
    try {
      // Ejecutar en paralelo (idealmente debería haber un endpoint bulk en el backend)
      const promises = Array.from(selectedIds).map((id) => skipPayslipItem(id));
      await Promise.all(promises);

      toast.success(`${selectedIds.size} items saltados correctamente`);
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      toast.error("Error al procesar saltos masivos");
    } finally {
      setIsBulkSkipping(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Items del Lote</CardTitle>
            <CardDescription>
              {total} items en total • Página {page} de {totalPages || 1}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros por estado */}
          <div className="flex items-center gap-4">
            {/* Tabs para desktop */}
            <Tabs
              value={statusFilter ?? "all"}
              onValueChange={(v) => {
                onStatusFilterChange(v === "all" ? undefined : v);
                setSelectedIds(new Set()); // Limpiar selección al cambiar filtro
              }}
              className="hidden @3xl/main:block"
            >
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="PENDING_REVIEW">Revisar</TabsTrigger>
                <TabsTrigger value="READY">Listos</TabsTrigger>
                <TabsTrigger value="PUBLISHED">Publicados</TabsTrigger>
                <TabsTrigger value="BLOCKED_INACTIVE">Bloqueados</TabsTrigger>
                <TabsTrigger value="ERROR">Errores</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Select para móvil */}
            <Select
              value={statusFilter ?? "all"}
              onValueChange={(v) => {
                onStatusFilterChange(v === "all" ? undefined : v);
                setSelectedIds(new Set());
              }}
            >
              <SelectTrigger className="w-[180px] @3xl/main:hidden">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDING_REVIEW">Revisar</SelectItem>
                <SelectItem value="READY">Listos</SelectItem>
                <SelectItem value="PUBLISHED">Publicados</SelectItem>
                <SelectItem value="BLOCKED_INACTIVE">Bloqueados</SelectItem>
                <SelectItem value="ERROR">Errores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        items.length > 0 &&
                        selectedIds.size === items.filter((i) => i.status === "PENDING" || i.status === "ERROR").length
                      }
                      onCheckedChange={toggleSelectAll}
                      disabled={items.length === 0}
                    />
                  </TableHead>
                  <TableHead>Archivo / Página</TableHead>
                  <TableHead>DNI Detectado</TableHead>
                  <TableHead>Nombre Detectado</TableHead>
                  <TableHead>Confianza</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center">
                      <div className="text-muted-foreground">
                        No hay items {statusFilter ? `con estado "${statusFilter}"` : ""}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const canSelect = item.status === "PENDING" || item.status === "ERROR";
                    return (
                      <TableRow key={item.id} data-state={selectedIds.has(item.id) && "selected"}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelectRow(item.id)}
                            disabled={!canSelect}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {item.originalFileName ?? `Página ${item.pageNumber ?? "?"}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="bg-muted rounded px-1 py-0.5 text-sm">{item.detectedDni ?? "-"}</code>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{item.detectedName ?? "-"}</span>
                        </TableCell>
                        <TableCell>{getConfidenceBadge(item.confidenceScore)}</TableCell>
                        <TableCell>
                          {item.employee ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>
                                {item.employee.firstName} {item.employee.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewItem(item)}
                              title="Ver preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Acciones para items que requieren revisión */}
                            {(item.status === "PENDING" || item.status === "PENDING_REVIEW") && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedItem(item)}
                                  title="Asignar a empleado"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSkip(item.id)}
                                  disabled={isSkipping === item.id}
                                  title="Saltar"
                                >
                                  {isSkipping === item.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}

                            {/* Botón revocar para items publicados */}
                            {item.status === "PUBLISHED" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRevokeItem(item)}
                                title="Revocar acceso"
                                className="text-destructive hover:text-destructive"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} de {total}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de acción flotante */}
      {selectedIds.size > 0 && (
        <div className="bg-foreground/95 text-background supports-[backdrop-filter]:bg-foreground/80 animate-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full px-6 py-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 border-r pr-4">
            <CheckSquare className="h-4 w-4" />
            <span className="text-sm font-medium">{selectedIds.size} seleccionados</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkSkip}
              disabled={isBulkSkipping}
              className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              {isBulkSkipping ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SkipForward className="mr-2 h-4 w-4" />
              )}
              Saltar selección
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Dialog para seleccionar empleado */}
      <EmployeeSelectorDialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        onSelect={handleAssign}
        isLoading={isAssigning}
        detectedDni={selectedItem?.detectedDni ?? undefined}
        detectedName={selectedItem?.detectedName ?? undefined}
      />

      {/* Dialog para preview */}
      <ItemPreviewDialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
        item={previewItem}
      />

      {/* Dialog para revocar item individual */}
      {revokeItem && (
        <RevokeItemDialog
          open={!!revokeItem}
          onOpenChange={(open) => !open && setRevokeItem(null)}
          item={revokeItem}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
