"use client";

import { type Role } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, CheckCircle2, XCircle, KeyRound, Shield } from "lucide-react";

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

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  _count?: {
    temporaryPasswords: number;
  };
  temporaryPasswords?: Array<{
    id: string;
    password: string;
    createdAt: Date | string;
    expiresAt: Date | string;
    reason: string | null;
    usedAt: Date | string | null;
    createdBy: {
      name: string | null;
    };
  }>;
}

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Org",
  HR_ADMIN: "Admin RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  ORG_ADMIN: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HR_ADMIN: "bg-green-500/10 text-green-700 dark:text-green-300",
  MANAGER: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  EMPLOYEE: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

interface UsersColumnsProps {
  onViewDetails: (user: UserRow) => void;
  onChangeRole: (user: UserRow) => void;
  onResetPassword: (user: UserRow) => void;
  onToggleActive: (user: UserRow) => void;
}

export const createUsersColumns = ({
  onViewDetails,
  onChangeRole,
  onResetPassword,
  onToggleActive,
}: UsersColumnsProps): ColumnDef<UserRow>[] => [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => {
      const name = row.getValue("name");
      const mustChangePassword = row.original.mustChangePassword;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {mustChangePassword && <KeyRound className="h-3.5 w-3.5 text-orange-500" title="Debe cambiar contraseña" />}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      return <span className="text-muted-foreground text-sm">{row.getValue("email")}</span>;
    },
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => {
      const role = row.getValue("role");
      return (
        <Badge variant="outline" className={ROLE_COLORS[role]}>
          <Shield className="mr-1 h-3 w-3" />
          {ROLE_DISPLAY_NAMES[role]}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) => {
      const active = row.getValue("active");
      return active ? (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Activo
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300">
          <XCircle className="mr-1 h-3 w-3" />
          Inactivo
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewDetails(user)}>Ver detalles</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeRole(user)}>Cambiar rol</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onResetPassword(user)}>Generar contraseña temporal</DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.active ? (
              <DropdownMenuItem className="text-destructive" onClick={() => onToggleActive(user)}>
                Desactivar usuario
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onToggleActive(user)}>Activar usuario</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
