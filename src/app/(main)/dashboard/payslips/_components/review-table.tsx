"use client";

import { useEffect, useState } from "react";

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
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { AUTO_READY_CONFIDENCE_THRESHOLD } from "@/lib/payslip/config";
import {
  assignPayslipItem,
  skipPayslipItem,
  publishItems,
  type PayslipUploadItemDetail,
} from "@/server/actions/payslips";

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

const ASSIGNABLE_STATUSES = new Set(["PENDING", "PENDING_REVIEW", "BLOCKED_INACTIVE", "ERROR", "READY"]);
const SKIPPABLE_STATUSES = new Set(["PENDING_OCR", "PENDING", "PENDING_REVIEW", "READY", "BLOCKED_INACTIVE", "ERROR"]);

function formatStatusLabel(status: string) {
  return status.toLowerCase().replace(/_/g, " ");
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
      return (
        <Badge variant="outline" className="capitalize">
          {formatStatusLabel(status)}
        </Badge>
      );
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

const STATUS_FILTERS_LABELS: Record<string, string> = {
  PENDING_OCR: "en cola de procesamiento OCR",
  PENDING_REVIEW: "pendientes de revisión",
  READY: "listas para publicar",
  PUBLISHED: "publicadas",
  BLOCKED_INACTIVE: "de empleados inactivos",
  REVOKED: "revocadas",
  ERROR: "con errores",
  PENDING: "pendientes",
};

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
  const [isPublishingSelection, setIsPublishingSelection] = useState(false);
  const { hasPermission } = usePermissions();
  const canManagePayslips = hasPermission("manage_payslips");

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const item of items) {
        const shouldAutoSelect =
          item.status === "READY" && (item.isAutoMatched || item.confidenceScore >= AUTO_READY_CONFIDENCE_THRESHOLD);
        if (shouldAutoSelect && SKIPPABLE_STATUSES.has(item.status) && !next.has(item.id)) {
          next.add(item.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);
  const selectedReadyIds = items
    .filter((item) => selectedIds.has(item.id) && item.status === "READY")
    .map((item) => item.id);
  const selectedReadyCount = selectedReadyIds.length;
  const hasSelection = canManagePayslips && selectedIds.size > 0;

  // Manejo de selección
  const toggleSelectAll = () => {
    const selectableIds = items.filter((i) => SKIPPABLE_STATUSES.has(i.status)).map((i) => i.id);

    if (selectableIds.length === 0) {
      setSelectedIds(new Set());
      return;
    }

    if (selectedIds.size === selectableIds.length) {
      setSelectedIds(new Set());
    } else {
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

  const handlePublishSelected = async () => {
    if (selectedReadyIds.length === 0) {
      toast.error("Selecciona al menos una nómina lista para publicar");
      return;
    }

    setIsPublishingSelection(true);
    try {
      const result = await publishItems(selectedReadyIds);
      if (result.success) {
        toast.success(`Publicadas ${result.publishedCount ?? selectedReadyIds.length} nóminas seleccionadas`);
        setSelectedIds(new Set());
        onRefresh();
      } else {
        toast.error(result.error ?? "Error al publicar la selección");
      }
    } catch {
      toast.error("Error al publicar la selección");
    } finally {
      setIsPublishingSelection(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Tabs
            value={statusFilter ?? "all"}
            onValueChange={(v) => {
              onStatusFilterChange(v === "all" ? undefined : v);
              setSelectedIds(new Set()); // Limpiar selección al cambiar filtro
            }}
            className="hidden lg:block"
          >
            <TabsList className="bg-muted/50">
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
            <SelectTrigger className="w-[180px] lg:hidden">
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="h-9">
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h3 className="leading-none font-semibold tracking-tight">Detalle de Nóminas</h3>
            <p className="text-muted-foreground mt-1 text-sm">{total} items en total</p>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground mr-2 text-sm">
                {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px] pl-6">
                <Checkbox
                  checked={
                    items.length > 0 &&
                    selectedIds.size > 0 &&
                    selectedIds.size === items.filter((i) => SKIPPABLE_STATUSES.has(i.status)).length
                  }
                  onCheckedChange={toggleSelectAll}
                  disabled={!canManagePayslips || items.length === 0}
                />
              </TableHead>
              <TableHead>Archivo / Página</TableHead>
              <TableHead>DNI Detectado</TableHead>
              <TableHead>Nombre Detectado</TableHead>
              <TableHead>Confianza</TableHead>
              <TableHead>Empleado Asignado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="pr-6 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <FileText className="h-10 w-10 opacity-10" />
                    <p className="text-sm">
                      No hay nóminas{" "}
                      {statusFilter
                        ? (STATUS_FILTERS_LABELS[statusFilter] ?? formatStatusLabel(statusFilter))
                        : "en este lote"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const canSelect = SKIPPABLE_STATUSES.has(item.status);
                const canAssign = ASSIGNABLE_STATUSES.has(item.status);
                const canSkip = SKIPPABLE_STATUSES.has(item.status);
                const assignLabel = item.employee ? "Cambiar" : "Asignar";
                const isSelected = selectedIds.has(item.id);

                return (
                  <TableRow
                    key={item.id}
                    data-state={isSelected && "selected"}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="pl-6">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectRow(item.id)}
                        disabled={!canManagePayslips || !canSelect}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {item.originalFileName ?? `Página ${item.pageNumber ?? "?"}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                        {item.detectedDni ?? "-"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">{item.detectedName ?? "-"}</span>
                    </TableCell>
                    <TableCell>{getConfidenceBadge(item.confidenceScore)}</TableCell>
                    <TableCell>
                      {item.employee ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">
                            {item.employee.firstName} {item.employee.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex flex-wrap justify-end gap-1 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewItem(item)}
                          title="Ver preview"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="text-muted-foreground h-4 w-4" />
                        </Button>

                        {canManagePayslips && canAssign && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            title={item.employee ? "Cambiar empleado" : "Asignar a empleado"}
                            className="h-8 w-8 p-0"
                          >
                            <UserPlus className="text-muted-foreground h-4 w-4" />
                          </Button>
                        )}
                        {canManagePayslips && canSkip && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSkip(item.id)}
                            disabled={isSkipping === item.id}
                            title="Quitar del lote"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            {isSkipping === item.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* Botón revocar para items publicados */}
                        {canManagePayslips && item.status === "PUBLISHED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevokeItem(item)}
                            title="Revocar acceso"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
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

      {/* Barra de acción flotante */}
      {hasSelection && (
        <div className="animate-in slide-in-from-bottom-4 fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 duration-300">
          <div className="bg-foreground/90 text-background supports-[backdrop-filter]:bg-foreground/80 flex items-center gap-6 rounded-full border border-white/10 py-2 pr-2 pl-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">
                {selectedIds.size}
              </div>
              <div className="text-sm">
                <span className="text-background font-medium">Seleccionados</span>
                {selectedReadyCount > 0 && (
                  <span className="text-background/60 ml-1 text-xs">({selectedReadyCount} listos)</span>
                )}
              </div>
            </div>

            <div className="bg-background/20 h-4 w-px" />

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className="bg-background text-foreground hover:bg-background/90 h-8 rounded-full border-0 px-4 font-medium"
                onClick={handlePublishSelected}
                disabled={isPublishingSelection || selectedReadyCount === 0}
              >
                {isPublishingSelection ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Publicar seleccionados
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedIds(new Set())}
                className="text-background/60 hover:text-background hover:bg-background/10 h-8 w-8 rounded-full"
                title="Limpiar selección"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog para seleccionar empleado */}
      {canManagePayslips && (
        <EmployeeSelectorDialog
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          onSelect={handleAssign}
          isLoading={isAssigning}
          detectedDni={selectedItem?.detectedDni ?? undefined}
          detectedName={selectedItem?.detectedName ?? undefined}
        />
      )}

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
    </div>
  );
}
