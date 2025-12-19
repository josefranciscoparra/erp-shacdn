"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, ArrowRight, FileText, Check, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/hr/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { bulkApproveRequests, type PendingApprovalItem } from "@/server/actions/approvals";

function getTypeLabel(type: PendingApprovalItem["type"]) {
  switch (type) {
    case "PTO":
      return "Ausencia";
    case "MANUAL_TIME_ENTRY":
      return "Fichaje";
    case "EXPENSE":
      return "Gasto";
    default:
      return "Solicitud";
  }
}

interface ApprovalsTableProps {
  items: PendingApprovalItem[];
  filterType?: string;
  onReview: (item: PendingApprovalItem) => void;
  onSuccess?: () => void; // Para recargar datos tras acción masiva
}

export function ApprovalsTable({ items, filterType = "all", onReview, onSuccess }: ApprovalsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const showOrgBadges = useMemo(() => {
    const orgIds = new Set(items.map((item) => item.orgId));
    return orgIds.size > 1;
  }, [items]);

  const columns: ColumnDef<PendingApprovalItem>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Seleccionar todo"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => {
          const isExpense = row.original.type === "EXPENSE";

          const checkbox = (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Seleccionar fila"
              className="translate-y-[2px]"
              disabled={!row.getCanSelect()}
            />
          );

          if (isExpense) {
            return (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    {/* Wrapper div to catch hover events on disabled input */}
                    <div className="inline-flex items-center justify-center">{checkbox}</div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Los gastos requieren revisión manual obligatoria</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return checkbox;
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "employeeName",
        header: "Empleado",
        cell: ({ row }) => {
          const item = row.original;
          const position = (item.details["position"] as string | undefined) ?? "Empleado";
          const department = item.details["department"] as string | undefined;

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={item.employeeImage ?? ""} />
                <AvatarFallback>{item.employeeName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <Link href={`/dashboard/employees/${item.employeeId}`} className="text-sm font-medium hover:underline">
                  {item.employeeName}
                </Link>
                <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                  <span className="capitalize">{position}</span>
                  {department && (
                    <>
                      <span className="text-border">•</span>
                      <span className="capitalize">{department}</span>
                    </>
                  )}
                  {showOrgBadges && item.organization && (
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {item.organization.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => {
          const type = row.original.type;
          const label = getTypeLabel(type);
          let icon = FileText;
          let colorClass = "text-green-500";

          switch (type) {
            case "PTO":
              icon = CheckCircle2;
              colorClass = "text-blue-500";
              break;
            case "MANUAL_TIME_ENTRY":
              icon = Clock;
              colorClass = "text-amber-500";
              break;
            case "EXPENSE":
              icon = FileText;
              colorClass = "text-green-500";
              break;
            default:
              break;
          }

          const IconComp = icon;

          return (
            <div className="flex items-center gap-2">
              <IconComp className={`h-4 w-4 ${colorClass}`} />
              <span className="font-medium">{label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "date",
        header: "Fecha Efectiva",
        cell: ({ row }) => {
          const date = new Date(row.original.date);
          return (
            <div className="flex flex-col">
              <span className="font-medium">{format(date, "d MMM yyyy", { locale: es })}</span>
              <span className="text-muted-foreground text-xs">{row.original.summary}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Solicitado",
        cell: ({ row }) => format(new Date(row.original.createdAt), "PP", { locale: es }),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const item = row.original;
          let isPending = false;
          switch (item.type) {
            case "EXPENSE":
              isPending = item.status === "SUBMITTED";
              break;
            default:
              isPending = item.status === "PENDING";
              break;
          }

          return (
            <Button
              onClick={() => onReview(item)}
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 gap-2"
            >
              {isPending ? (
                <>
                  Revisar <ArrowRight className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Ver Detalle <Eye className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          );
        },
      },
    ],
    [onReview, showOrgBadges],
  );

  // Filtrar solicitudes
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (filterType !== "all") {
      filtered = filtered.filter((i) => i.type === filterType);
    }
    return filtered;
  }, [items, filterType]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    // Solo permitir selección si son pendientes Y NO SON GASTOS (requieren revisión manual)
    enableRowSelection: (row) => row.original.status === "PENDING" && row.original.type !== "EXPENSE",
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleBulkApprove = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const requests = selectedRows.map((row) => ({
      id: row.original.id,
      type: row.original.type,
    }));

    if (requests.length === 0) return;

    setIsBulkSubmitting(true);
    try {
      const result = await bulkApproveRequests(requests);
      if (result.success) {
        toast.success(`Aprobadas ${result.summary?.success} solicitudes correctamente.`);
        if (result.summary?.failed && result.summary.failed > 0) {
          toast.warning(`Fallaron ${result.summary.failed} solicitudes.`);
        }
        setRowSelection({}); // Limpiar selección

        // Recargar datos automáticamente
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error("Error al procesar la aprobación masiva.");
      }
    } catch {
      toast.error("Error de conexión al aprobar.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40" data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState title="Todo al día" description="No tienes solicitudes pendientes de aprobación." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <DataTablePagination table={table} />
      </div>

      {/* Barra de Acción Flotante */}
      {selectedCount > 0 && (
        <div className="bg-background animate-in slide-in-from-bottom-4 fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border p-2 px-6 shadow-xl">
          <span className="text-sm font-medium">{selectedCount} seleccionados</span>
          <div className="bg-border h-4 w-px" />
          <Button
            onClick={handleBulkApprove}
            disabled={isBulkSubmitting}
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isBulkSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Aprobar Selección
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
