"use client";

import { useState } from "react";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  MoreHorizontal,
  ArrowUpDown,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash2,
  Eye,
  CalendarIcon,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  updateSettlementStatus,
  deleteSettlement,
  type SettlementListItem,
} from "@/server/actions/vacation-settlement";

import { SettlementDetailDialog } from "./settlement-detail-dialog";

interface SettlementsDataTableProps {
  data: SettlementListItem[];
  onRefresh: () => void;
}

const statusConfig = {
  PENDING: {
    label: "Pendiente",
    variant: "outline" as const,
    icon: Clock,
    className: "text-yellow-600 border-yellow-600/20 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
  PAID: {
    label: "Pagada",
    variant: "default" as const,
    icon: CheckCircle,
    className: "bg-green-600 hover:bg-green-700",
  },
  COMPENSATED: {
    label: "Compensada",
    variant: "secondary" as const,
    icon: RefreshCw,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

export function SettlementsDataTable({ data, onRefresh }: SettlementsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementListItem | null>(null);

  const handleUpdateStatus = async (id: string, status: "PAID" | "COMPENSATED") => {
    try {
      const result = await updateSettlementStatus({ settlementId: id, status });
      if (result.success) {
        toast.success(`Liquidación marcada como ${status === "PAID" ? "pagada" : "compensada"}`);
        onRefresh();
      } else {
        toast.error(result.error ?? "Error al actualizar estado");
      }
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const handleDelete = async (settlement: SettlementListItem) => {
    if (!window.confirm(`¿Eliminar la liquidación de ${settlement.employeeName}?`)) {
      return;
    }

    try {
      const result = await deleteSettlement(settlement.id);
      if (result.success) {
        toast.success("Liquidación eliminada");
        onRefresh();
      } else {
        toast.error(result.error ?? "Error al eliminar liquidación");
      }
    } catch {
      toast.error("Error al eliminar liquidación");
    }
  };

  const columns: ColumnDef<SettlementListItem>[] = [
    {
      accessorKey: "employeeName",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Empleado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.employeeName}</div>
          {row.original.employeeNumber && (
            <div className="text-muted-foreground text-sm">{row.original.employeeNumber}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "settlementDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Fecha liquidación
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => format(new Date(row.original.settlementDate), "dd MMM yyyy", { locale: es }),
    },
    {
      accessorKey: "accruedDays",
      header: "Devengados",
      cell: ({ row }) => <span className="font-mono">{row.original.accruedDays.toFixed(2)} días</span>,
    },
    {
      accessorKey: "usedDays",
      header: "Disfrutados",
      cell: ({ row }) => <span className="font-mono">{row.original.usedDays.toFixed(2)} días</span>,
    },
    {
      accessorKey: "balanceDays",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Saldo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const balance = row.original.balanceDays;
        const isPositive = balance >= 0;
        return (
          <span
            className={`font-mono font-medium ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {isPositive ? "+" : ""}
            {balance.toFixed(2)} días
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.original.status as keyof typeof statusConfig;
        const config = statusConfig[status];
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className={config.className}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isAutoGenerated",
      header: "Tipo",
      cell: ({ row }) =>
        row.original.isAutoGenerated ? (
          <Badge variant="outline">Automática</Badge>
        ) : (
          <Badge variant="secondary">Manual</Badge>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const settlement = row.original;
        const isPending = settlement.status === "PENDING";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedSettlement(settlement)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalle
              </DropdownMenuItem>
              {isPending && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleUpdateStatus(settlement.id, "PAID")}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marcar como pagada
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleUpdateStatus(settlement.id, "COMPENSATED")}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Marcar como compensada
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(settlement)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar por empleado..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Mobile View - Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const settlement = row.original;
            const status = settlement.status as keyof typeof statusConfig;
            const config = statusConfig[status];
            const Icon = config.icon;
            const isPositive = settlement.balanceDays >= 0;

            return (
              <Card key={row.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{settlement.employeeName}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {settlement.employeeNumber ?? "Sin nº"}
                      </CardDescription>
                    </div>
                    <Badge variant={config.variant} className={config.className}>
                      <Icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2 text-sm">
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Fecha</span>
                      <span className="flex items-center gap-1 font-medium">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(settlement.settlementDate), "dd/MM/yy")}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Saldo</span>
                      <span
                        className={`font-mono font-medium ${
                          isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {settlement.balanceDays.toFixed(2)} días
                      </span>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>Dev: {settlement.accruedDays.toFixed(2)}</span>
                    <span>Dis: {settlement.usedDays.toFixed(2)}</span>
                    <span>{settlement.isAutoGenerated ? "Automática" : "Manual"}</span>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 flex justify-end gap-2 border-t p-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSettlement(settlement)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {settlement.status === "PENDING" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateStatus(settlement.id, "PAID")}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marcar pagada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(settlement.id, "COMPENSATED")}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Marcar compensada
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(settlement)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="text-muted-foreground bg-muted/10 rounded-lg border border-dashed py-8 text-center">
            No se encontraron liquidaciones
          </div>
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden rounded-md border md:block">
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron liquidaciones.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Siguiente
        </Button>
      </div>

      {selectedSettlement && (
        <SettlementDetailDialog
          settlement={selectedSettlement}
          open={!!selectedSettlement}
          onOpenChange={(open) => !open && setSelectedSettlement(null)}
        />
      )}
    </div>
  );
}
