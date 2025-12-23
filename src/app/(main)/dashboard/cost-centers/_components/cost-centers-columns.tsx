"use client";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Pencil, Trash2, MapPin, Clock, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CostCenterData } from "@/stores/cost-centers-store";

interface CostCentersColumnsProps {
  onEdit?: (costCenter: CostCenterData) => void;
  onDelete?: (costCenter: CostCenterData) => void;
  canManage?: boolean;
}

export const createCostCentersColumns = ({
  onEdit,
  onDelete,
  canManage = false,
}: CostCentersColumnsProps = {}): ColumnDef<CostCenterData>[] => [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => {
      const costCenter = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{costCenter.name}</span>
          {costCenter.code && <span className="text-muted-foreground text-sm">Código: {costCenter.code}</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "address",
    header: "Dirección",
    cell: ({ row }) => {
      const address = row.original.address;
      if (!address) {
        return <span className="text-muted-foreground">Sin dirección</span>;
      }

      return (
        <div className="flex items-center gap-2">
          <MapPin className="text-muted-foreground h-4 w-4" />
          <span className="max-w-[200px] truncate" title={address}>
            {address}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "timezone",
    header: "Zona Horaria",
    cell: ({ row }) => {
      const timezone = row.original.timezone;
      if (!timezone) {
        return <span className="text-muted-foreground">Sin configurar</span>;
      }

      return (
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-4 w-4" />
          <span className="text-sm">{timezone}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) => {
      const active = row.getValue("active");
      return (
        <Badge
          variant={active ? "default" : "secondary"}
          className={active ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}
        >
          {active ? "Activo" : "Inactivo"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Creado",
    cell: ({ row }) => {
      const date = row.getValue("createdAt");
      return (
        <span className="text-muted-foreground text-sm">{format(new Date(date), "dd/MM/yyyy", { locale: es })}</span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const costCenter = row.original;

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
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/cost-centers/${costCenter.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalle
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(costCenter.id)}>Copiar ID</DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuItem onClick={() => onEdit?.(costCenter)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar centro de coste
                </DropdownMenuItem>
                {costCenter.active && (
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(costCenter)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar centro de coste
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const costCentersColumns = createCostCentersColumns();
