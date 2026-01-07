"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Role } from "@prisma/client";
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { Check, Crown, Loader2, MoreHorizontal, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  addGroupAdmin,
  type DirectoryUserRow,
  type GroupAdminRow,
  removeGroupAdmin,
  updateGroupAdmin,
} from "@/server/actions/group-users";
import { ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

interface GroupAdminsTableProps {
  data: GroupAdminRow[];
  groupId: string;
  currentUserRole: Role;
  availableUsers: DirectoryUserRow[];
}

// Roles permitidos para asignar a nivel de grupo
const ALLOWED_GROUP_ROLES: Role[] = ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT"];

// Colores hex sólidos para Safari - mismos que /dashboard/admin/users
const ROLE_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ORG_ADMIN: { bg: "#dbeafe", text: "#1d4ed8", icon: <Crown className="h-3 w-3" /> }, // blue
  HR_ADMIN: { bg: "#dcfce7", text: "#15803d", icon: <ShieldCheck className="h-3 w-3" /> }, // green
  HR_ASSISTANT: { bg: "#ccfbf1", text: "#0f766e", icon: <UserCog className="h-3 w-3" /> }, // teal
};

const ROLE_STYLES_DARK: Record<string, { bg: string; text: string }> = {
  ORG_ADMIN: { bg: "#1e3a5f", text: "#93c5fd" },
  HR_ADMIN: { bg: "#14532d", text: "#86efac" },
  HR_ASSISTANT: { bg: "#134e4a", text: "#5eead4" },
};

function RoleBadge({ role }: { role: Role }) {
  const lightStyles = ROLE_STYLES[role];
  const darkStyles = ROLE_STYLES_DARK[role];

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

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <>
        {/* Light mode */}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium dark:hidden"
          style={{
            backgroundColor: "#dcfce7", // green-100
            color: "#166534", // green-800
            border: "1px solid #86efac", // green-300
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#22c55e", // green-500
            }}
          />
          Activo
        </span>
        {/* Dark mode */}
        <span
          className="hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium dark:inline-flex"
          style={{
            backgroundColor: "#14532d", // green-900
            color: "#86efac", // green-300
            border: "1px solid #166534", // green-800
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#22c55e", // green-500
            }}
          />
          Activo
        </span>
      </>
    );
  }

  return (
    <>
      {/* Light mode */}
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium dark:hidden"
        style={{
          backgroundColor: "#f3f4f6", // gray-100
          color: "#4b5563", // gray-600
          border: "1px solid #d1d5db", // gray-300
        }}
      >
        Inactivo
      </span>
      {/* Dark mode */}
      <span
        className="hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium dark:inline-flex"
        style={{
          backgroundColor: "#374151", // gray-700
          color: "#9ca3af", // gray-400
          border: "1px solid #4b5563", // gray-600
        }}
      >
        Inactivo
      </span>
    </>
  );
}

export function GroupAdminsTable({ data, groupId, currentUserRole, availableUsers }: GroupAdminsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const formSchema = z.object({
    email: z.string().email("Email inválido"),
    role: z.enum(["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT"] as [string, ...string[]]),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "HR_ADMIN",
    },
  });

  const resetDialogState = () => {
    form.reset();
    setSearchTerm("");
    setSelectedUserId(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    resetDialogState();
  };

  const candidateUsers = useMemo(() => {
    const adminIds = new Set(data.map((admin) => admin.userId));
    return availableUsers.filter((user) => !adminIds.has(user.userId));
  }, [availableUsers, data]);

  const filteredCandidates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (query.length < 2) return [];

    return candidateUsers.filter(
      (user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
    );
  }, [candidateUsers, searchTerm]);

  const selectedUser = useMemo(
    () => (selectedUserId ? (candidateUsers.find((user) => user.userId === selectedUserId) ?? null) : null),
    [candidateUsers, selectedUserId],
  );

  const handleAddAdmin = (values: z.infer<typeof formSchema>) => {
    const selectedEmail = values.email.trim();
    if (!selectedEmail) {
      toast.error("Selecciona un usuario para añadir");
      return;
    }

    startTransition(async () => {
      const result = await addGroupAdmin({
        groupId,
        email: selectedEmail,
        role: values.role as Role,
      });

      if (result.success) {
        toast.success("Administrador añadido correctamente");
        handleDialogOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al añadir administrador");
      }
    });
  };

  const handleUpdateRole = (membershipId: string, newRole: Role) => {
    startTransition(async () => {
      const result = await updateGroupAdmin({ membershipId, role: newRole });
      if (result.success) {
        toast.success("Rol actualizado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRemove = (membershipId: string) => {
    if (!confirm("¿Estás seguro de querer revocar el acceso de este usuario al grupo?")) return;

    startTransition(async () => {
      const result = await removeGroupAdmin(membershipId);
      if (result.success) {
        toast.success("Acceso revocado");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const columns: ColumnDef<GroupAdminRow>[] = [
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
      header: "Rol de Grupo",
      cell: ({ row }) => {
        const user = row.original;

        const canEdit =
          currentUserRole === "ORG_ADMIN" ||
          currentUserRole === "SUPER_ADMIN" ||
          (currentUserRole === "HR_ADMIN" && user.role !== "ORG_ADMIN");

        if (!canEdit) {
          return <RoleBadge role={user.role} />;
        }

        return (
          <Select
            disabled={isPending}
            defaultValue={user.role}
            onValueChange={(val) => handleUpdateRole(user.id, val as Role)}
          >
            <SelectTrigger className="h-8 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_GROUP_ROLES.map((role) => (
                <SelectItem key={role} value={role} disabled={currentUserRole === "HR_ADMIN" && role === "ORG_ADMIN"}>
                  <div className="flex items-center gap-2">
                    {ROLE_STYLES[role]?.icon}
                    {ROLE_DISPLAY_NAMES[role]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge isActive={row.original.isActive} />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        const canDelete =
          currentUserRole === "ORG_ADMIN" ||
          currentUserRole === "SUPER_ADMIN" ||
          (currentUserRole === "HR_ADMIN" && user.role !== "ORG_ADMIN");

        if (!canDelete) return null;

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
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950"
                onClick={() => handleRemove(user.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Revocar acceso
              </DropdownMenuItem>
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
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium">Administradores del grupo</h3>
          <p className="text-muted-foreground text-sm">Usuarios con permisos de gestión en este grupo</p>
        </div>

        {(currentUserRole === "ORG_ADMIN" || currentUserRole === "SUPER_ADMIN" || currentUserRole === "HR_ADMIN") && (
          <Dialog open={addDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Añadir
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Añadir administrador</DialogTitle>
                <DialogDescription>Invita a un usuario existente para que gestione este grupo.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddAdmin)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                        <Command shouldFilter={false} className="rounded-lg border shadow-md">
                          <CommandInput
                            placeholder="Buscar usuario..."
                            value={searchTerm}
                            onValueChange={(value) => {
                              setSearchTerm(value);
                              if (selectedUserId) {
                                setSelectedUserId(null);
                                form.setValue("email", "");
                              }
                            }}
                          />
                          <CommandList className="max-h-[240px]">
                            <CommandEmpty>
                              {searchTerm.trim().length < 2
                                ? "Escribe 2 letras para buscar..."
                                : "No se encontraron usuarios."}
                            </CommandEmpty>
                            {filteredCandidates.length > 0 && (
                              <CommandGroup heading="Usuarios encontrados">
                                {filteredCandidates.map((user) => (
                                  <CommandItem
                                    key={user.userId}
                                    value={`${user.name} ${user.email}`}
                                    onSelect={() => {
                                      setSelectedUserId(user.userId);
                                      setSearchTerm(user.name);
                                      field.onChange(user.email);
                                      form.clearErrors("email");
                                    }}
                                    className="flex cursor-pointer items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={user.image ?? ""} />
                                        <AvatarFallback className="text-[10px]">
                                          {user.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">{user.name}</span>
                                        <span className="text-muted-foreground text-xs">{user.email}</span>
                                      </div>
                                    </div>
                                    {selectedUser?.userId === user.userId && <Check className="text-primary h-4 w-4" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                        {selectedUser && (
                          <p className="text-muted-foreground text-xs">
                            Seleccionado: {selectedUser.name} · {selectedUser.email}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol de grupo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ORG_ADMIN" disabled={currentUserRole === "HR_ADMIN"}>
                              <div className="flex items-center gap-2">
                                <Crown className="h-3 w-3" />
                                Admin de Organización
                              </div>
                            </SelectItem>
                            <SelectItem value="HR_ADMIN">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3" />
                                Admin de RRHH
                              </div>
                            </SelectItem>
                            <SelectItem value="HR_ASSISTANT">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-3 w-3" />
                                Asistente RRHH
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Añadir
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <UserCog className="text-muted-foreground/40 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">No hay administradores definidos</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
