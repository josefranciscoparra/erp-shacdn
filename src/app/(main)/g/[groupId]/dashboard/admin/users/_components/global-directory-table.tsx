"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Role } from "@prisma/client";
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { Building2, Crown, Search, Settings2, ShieldCheck, UserCog, Users } from "lucide-react";

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

// Colores hex sólidos para Safari - mismos que /dashboard/admin/users
const ROLE_BADGE_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ORG_ADMIN: { bg: "#dbeafe", text: "#1d4ed8", icon: <Crown className="h-3 w-3" /> }, // blue
  HR_ADMIN: { bg: "#dcfce7", text: "#15803d", icon: <ShieldCheck className="h-3 w-3" /> }, // green
  HR_ASSISTANT: { bg: "#ccfbf1", text: "#0f766e", icon: <UserCog className="h-3 w-3" /> }, // teal
  MANAGER: { bg: "#ffedd5", text: "#c2410c", icon: <Users className="h-3 w-3" /> }, // orange
  EMPLOYEE: { bg: "#f3f4f6", text: "#374151", icon: <Users className="h-3 w-3" /> }, // gray
};

const ROLE_BADGE_STYLES_DARK: Record<string, { bg: string; text: string }> = {
  ORG_ADMIN: { bg: "#1e3a5f", text: "#93c5fd" },
  HR_ADMIN: { bg: "#14532d", text: "#86efac" },
  HR_ASSISTANT: { bg: "#134e4a", text: "#5eead4" },
  MANAGER: { bg: "#7c2d12", text: "#fdba74" },
  EMPLOYEE: { bg: "#374151", text: "#9ca3af" },
};

function RoleBadgeCompact({ role }: { role: Role }) {
  const lightStyles = ROLE_BADGE_STYLES[role];
  const darkStyles = ROLE_BADGE_STYLES_DARK[role];

  if (!lightStyles) {
    return <Badge variant="outline">{ROLE_DISPLAY_NAMES[role]}</Badge>;
  }

  return (
    <>
      {/* Light mode */}
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium dark:hidden"
        style={{ backgroundColor: lightStyles.bg, color: lightStyles.text }}
      >
        {lightStyles.icon}
        {ROLE_DISPLAY_NAMES[role]}
      </span>
      {/* Dark mode */}
      <span
        className="hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium dark:inline-flex"
        style={{ backgroundColor: darkStyles.bg, color: darkStyles.text }}
      >
        {lightStyles.icon}
        {ROLE_DISPLAY_NAMES[role]}
      </span>
    </>
  );
}

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
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback className="text-sm">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
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
        cell: ({ row }) => <RoleBadgeCompact role={row.original.role} />,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => handleManageAccess(row.original.userId)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Gestionar
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
        <Building2 className="text-muted-foreground/40 h-10 w-10" />
        <p className="text-muted-foreground text-sm">No hay organizaciones activas en este grupo</p>
      </div>
    );
  }

  const emptyMessage = showEmployees
    ? "No hay usuarios asignados a esta empresa"
    : "No hay roles de RRHH asignados en esta empresa";

  return (
    <div className="space-y-4">
      {/* Header con tabs de empresas y switch */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium">Accesos por empresa</h3>
            <p className="text-muted-foreground text-sm">Usuarios con acceso a las empresas del grupo</p>
          </div>

          {/* Switch con estilos Safari-safe */}
          <div className="flex items-center gap-3">
            <Switch
              id="show-employees"
              checked={showEmployees}
              onCheckedChange={setShowEmployees}
              className="wizard-switch"
            />
            <Label htmlFor="show-employees" className="cursor-pointer text-sm">
              Incluir empleados
            </Label>
          </div>
        </div>

        {/* Tabs de empresas */}
        <Tabs value={activeOrgId} onValueChange={setActiveOrgId} className="w-full">
          {/* Mobile: Select */}
          <div className="@4xl/main:hidden">
            <Select value={activeOrgId} onValueChange={setActiveOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {org.name}
                      <Badge variant="secondary" className="ml-1">
                        {orgCounts.get(org.id) ?? 0}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tabs con scroll horizontal */}
          <div className="hidden w-full overflow-x-auto @4xl/main:block">
            <TabsList className="inline-flex h-auto w-auto gap-1 bg-transparent p-0">
              {organizations.map((org) => (
                <TabsTrigger
                  key={org.id}
                  value={org.id}
                  className="bg-muted/50 data-[state=active]:bg-background data-[state=active]:border-primary/30 rounded-md border px-3 py-1.5 data-[state=active]:shadow-sm"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span className="max-w-[180px] truncate">{org.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {orgCounts.get(org.id) ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border shadow-xs">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-muted/50">
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
                  <div className="flex flex-col items-center gap-2">
                    <Users className="text-muted-foreground/40 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">{emptyMessage}</p>
                  </div>
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
