"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Edit, Trash2, Eye, Send, Download } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Expense } from "@/stores/expenses-store";

import { ExpenseAmountDisplay } from "./expense-amount-display";
import { ExpenseCategoryIcon, getCategoryLabel } from "./expense-category-icon";
import { ExpenseStatusBadge } from "./expense-status-badge";

interface ExpensesColumnsProps {
  onView?: (expense: Expense) => void;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onSubmit?: (expense: Expense) => void;
}

export const getExpensesColumns = ({
  onView,
  onEdit,
  onDelete,
  onSubmit,
}: ExpensesColumnsProps = {}): ColumnDef<Expense>[] => [
  // Columna de selección removida para esta tabla
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Seleccionar todos"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //     aria-label="Seleccionar fila"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const date = row.getValue("date");
      return <div className="text-sm">{format(date, "dd MMM yyyy", { locale: es })}</div>;
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Categoría" />,
    cell: ({ row }) => {
      const category = row.getValue("category");
      return (
        <div className="flex items-center gap-2">
          <ExpenseCategoryIcon category={category} className="size-4" />
          <span className="text-sm">{getCategoryLabel(category)}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "merchantName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Comercio" />,
    cell: ({ row }) => {
      const merchantName = row.getValue("merchantName");
      const notes = row.original.notes;
      return (
        <div className="flex flex-col gap-1">
          {merchantName ? (
            <span className="text-sm font-medium">{merchantName}</span>
          ) : (
            <span className="text-muted-foreground text-sm">Sin comercio</span>
          )}
          {notes && <span className="text-muted-foreground line-clamp-1 text-xs">{notes}</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Importe" />,
    cell: ({ row }) => {
      const amount = row.getValue("amount");
      return (
        <div className="text-sm">
          {new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: row.original.currency,
          }).format(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "vatPercent",
    header: ({ column }) => <DataTableColumnHeader column={column} title="IVA" />,
    cell: ({ row }) => {
      const vatPercent = row.getValue("vatPercent");
      return <div className="text-sm">{vatPercent ? `${vatPercent}%` : "-"}</div>;
    },
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => {
      return (
        <ExpenseAmountDisplay
          amount={row.original.amount}
          vatPercent={row.original.vatPercent}
          totalAmount={row.original.totalAmount}
          currency={row.original.currency}
          className="font-semibold"
        />
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue("status");
      return <ExpenseStatusBadge status={status} />;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const expense = row.original;
      const isDraft = expense.status === "DRAFT";
      const canEdit = isDraft;
      const canDelete = isDraft;
      const canSubmit = isDraft && (expense.attachments?.length ?? 0) > 0;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onView?.(expense)}>
              <Eye className="mr-2 size-4" />
              Ver detalles
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit?.(expense)}>
                <Edit className="mr-2 size-4" />
                Editar
              </DropdownMenuItem>
            )}
            {canSubmit && (
              <DropdownMenuItem onClick={() => onSubmit?.(expense)}>
                <Send className="mr-2 size-4" />
                Enviar a aprobación
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canDelete && (
              <DropdownMenuItem onClick={() => onDelete?.(expense)} className="text-destructive">
                <Trash2 className="mr-2 size-4" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
