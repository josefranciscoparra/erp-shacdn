"use client";

import { useCallback, useMemo, useState } from "react";

import { type Role } from "@prisma/client";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, Settings2 } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DirectoryUserRow } from "@/server/actions/group-users";
import { ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

import { ManageAccessDialog } from "./manage-access-dialog";

interface GlobalDirectoryTableProps {
  data: DirectoryUserRow[];
  groupId: string;
  organizations: { id: string; name: string }[];
  currentUserRole: Role;
}

export function GlobalDirectoryTable({ data, groupId, organizations, currentUserRole }: GlobalDirectoryTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => (selectedUserId ? (data.find((user) => user.userId === selectedUserId) ?? null) : null),
    [data, selectedUserId],
  );

  const filteredData = useMemo(() => {
    const search = globalFilter.trim().toLowerCase();

    return data.filter((user) => {
      const matchesText =
        search.length === 0 || user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search);

      if (!matchesText) return false;

      if (orgFilter === "ALL") return true;
      if (orgFilter === "NO_ACCESS") {
        return user.organizations.every((org) => !org.isActive);
      }

      return user.organizations.some((org) => org.orgId === orgFilter && org.isActive);
    });
  }, [data, globalFilter, orgFilter]);

  const handleManageAccess = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedUserId(null);
    }
  }, []);

  const columns = useMemo<ColumnDef<DirectoryUserRow>[]>(
    () => [
      {
        accessorKey: "user",
        header: "Usuario",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{user.name}</span>
                <span className="text-muted-foreground text-xs">{user.email}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "organizations",
        header: "Organizaciones",
        cell: ({ row }) => {
          const orgs = row.original.organizations;
          const hasActiveAccess = orgs.some((org) => org.isActive);

          if (!hasActiveAccess) {
            return <Badge variant="destructive">Sin acceso</Badge>;
          }

          const display = orgs.slice(0, 3);
          const remaining = orgs.length - 3;

          return (
            <div className="flex flex-wrap gap-1">
              {display.map((org) => (
                <Badge key={org.orgId} variant="outline" className="bg-background whitespace-nowrap">
                  <span className="mr-1 font-semibold">{org.orgName}</span>
                  <span className="text-muted-foreground ml-1 border-l pl-1 text-xs font-normal">
                    {ROLE_DISPLAY_NAMES[org.role]}
                  </span>
                </Badge>
              ))}
              {remaining > 0 && <Badge variant="secondary">+{remaining}</Badge>}
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => handleManageAccess(row.original.userId)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Gestionar accesos
          </Button>
        ),
      },
    ],
    [handleManageAccess],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las empresas</SelectItem>
            <SelectItem value="NO_ACCESS">Sin acceso activo</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      <ManageAccessDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        user={selectedUser}
        groupId={groupId}
        organizations={organizations}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
