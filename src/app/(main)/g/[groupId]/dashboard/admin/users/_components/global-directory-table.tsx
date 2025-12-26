"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { type Role } from "@prisma/client";
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { Search, Settings2 } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type DirectoryUserRow } from "@/server/actions/group-users";
import { ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

import { ManageAccessDialog } from "./manage-access-dialog";

interface GroupOrganizationUsersTableProps {
  data: DirectoryUserRow[];
  groupId: string;
  organizations: { id: string; name: string }[];
  currentUserRole: Role;
}

type OrgUserRow = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
};

const HR_ROLES: Role[] = ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT"];

export function GroupOrganizationUsersTable({
  data,
  groupId,
  organizations,
  currentUserRole,
}: GroupOrganizationUsersTableProps) {
  const [search, setSearch] = useState("");
  const [showEmployees, setShowEmployees] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState(() => organizations[0]?.id || "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId && organizations.length > 0) {
      setActiveOrgId(organizations[0].id);
    }
  }, [activeOrgId, organizations]);

  const selectedUser = useMemo(
    () => (selectedUserId ? (data.find((user) => user.userId === selectedUserId) ?? null) : null),
    [data, selectedUserId],
  );

  const isAllowedRole = useCallback(
    (role: Role) => HR_ROLES.includes(role) || (showEmployees && role === "EMPLOYEE"),
    [showEmployees],
  );

  const orgCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const orgIds = new Set(organizations.map((org) => org.id));

    for (const orgId of orgIds) {
      counts.set(orgId, 0);
    }

    for (const user of data) {
      for (const membership of user.organizations) {
        if (!orgIds.has(membership.orgId) || !membership.isActive) continue;
        if (!isAllowedRole(membership.role)) continue;
        counts.set(membership.orgId, (counts.get(membership.orgId) ?? 0) + 1);
      }
    }

    return counts;
  }, [data, organizations, isAllowedRole]);

  const filteredRows = useMemo(() => {
    if (!activeOrgId) return [];

    const query = search.trim().toLowerCase();
    const rows: OrgUserRow[] = [];

    for (const user of data) {
      const membership = user.organizations.find((org) => org.orgId === activeOrgId);
      if (!membership || !membership.isActive) continue;
      if (!isAllowedRole(membership.role)) continue;

      if (query.length > 0 && !user.name.toLowerCase().includes(query) && !user.email.toLowerCase().includes(query)) {
        continue;
      }

      rows.push({
        userId: user.userId,
        name: user.name,
        email: user.email,
        image: user.image,
        role: membership.role,
      });
    }

    return rows;
  }, [activeOrgId, data, isAllowedRole, search]);

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

  const columns = useMemo<ColumnDef<OrgUserRow>[]>(
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
        accessorKey: "role",
        header: "Rol en la empresa",
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-background">
            {ROLE_DISPLAY_NAMES[row.original.role]}
          </Badge>
        ),
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
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (organizations.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border p-6 text-center">
        No hay organizaciones activas en este grupo.
      </div>
    );
  }

  const emptyMessage = showEmployees
    ? "No hay usuarios asignados a esta empresa."
    : "No hay roles de RRHH asignados en esta empresa.";

  return (
    <div className="space-y-4">
      <Tabs value={activeOrgId} onValueChange={setActiveOrgId} className="w-full">
        <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
          <div className="@4xl/main:hidden">
            <Select value={activeOrgId} onValueChange={setActiveOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden w-full overflow-x-auto @4xl/main:block">
            <TabsList className="flex w-full min-w-max flex-nowrap justify-start gap-2 bg-transparent p-0">
              {organizations.map((org) => (
                <TabsTrigger
                  key={org.id}
                  value={org.id}
                  className="bg-background data-[state=active]:border-primary/40 border data-[state=active]:shadow-sm"
                >
                  <span className="max-w-[220px] truncate">{org.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {orgCounts.get(org.id) ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="show-employees" checked={showEmployees} onCheckedChange={setShowEmployees} />
            <Label htmlFor="show-employees" className="text-sm">
              Mostrar empleados
            </Label>
          </div>
        </div>
      </Tabs>

      <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
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
                  {emptyMessage}
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
