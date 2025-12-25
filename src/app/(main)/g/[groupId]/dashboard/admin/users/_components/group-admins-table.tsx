"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@prisma/client";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getPaginationRowModel } from "@tanstack/react-table";
import { Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { addGroupAdmin, GroupAdminRow, removeGroupAdmin, updateGroupAdmin } from "@/server/actions/group-users";
import { ROLE_DISPLAY_NAMES } from "@/services/permissions/role-hierarchy";

interface GroupAdminsTableProps {
  data: GroupAdminRow[];
  groupId: string;
  currentUserRole: Role; // Para permisos de UI
}

// Roles permitidos para asignar a nivel de grupo
const ALLOWED_GROUP_ROLES: Role[] = ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT"];

export function GroupAdminsTable({ data, groupId, currentUserRole }: GroupAdminsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Form schema for adding admin
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

  const handleAddAdmin = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      const result = await addGroupAdmin({
        groupId,
        email: values.email,
        role: values.role as Role,
      });

      if (result.success) {
        toast.success("Administrador añadido correctamente");
        setAddDialogOpen(false);
        form.reset();
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
      header: "Rol de Grupo",
      cell: ({ row }) => {
        const user = row.original;

        // Si el usuario actual es HR_ADMIN, no puede editar ORG_ADMINs
        const canEdit =
          currentUserRole === "ORG_ADMIN" ||
          currentUserRole === "SUPER_ADMIN" ||
          (currentUserRole === "HR_ADMIN" && user.role !== "ORG_ADMIN");

        if (!canEdit) {
          return <Badge variant="outline">{ROLE_DISPLAY_NAMES[user.role]}</Badge>;
        }

        return (
          <Select
            disabled={isPending}
            defaultValue={user.role}
            onValueChange={(val) => handleUpdateRole(user.id, val as Role)}
          >
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_GROUP_ROLES.map((role) => (
                <SelectItem
                  key={role}
                  value={role}
                  // HR_ADMIN no puede ascender a ORG_ADMIN
                  disabled={currentUserRole === "HR_ADMIN" && role === "ORG_ADMIN"}
                >
                  {ROLE_DISPLAY_NAMES[role]}
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
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Activo" : "Inactivo"}
        </Badge>
      ),
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
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleRemove(user.id)}>
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
        <h3 className="text-lg font-medium">Administradores del Grupo</h3>

        {(currentUserRole === "ORG_ADMIN" || currentUserRole === "SUPER_ADMIN" || currentUserRole === "HR_ADMIN") && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Administrador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Administrador al Grupo</DialogTitle>
                <DialogDescription>Invita a un usuario existente para que gestione este grupo.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddAdmin)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email del usuario</FormLabel>
                        <FormControl>
                          <Input placeholder="usuario@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol de Grupo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ORG_ADMIN" disabled={currentUserRole === "HR_ADMIN"}>
                              Admin de Organización (Grupo)
                            </SelectItem>
                            <SelectItem value="HR_ADMIN">Admin de RRHH (Grupo)</SelectItem>
                            <SelectItem value="HR_ASSISTANT">Asistente RRHH (Grupo)</SelectItem>
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
                  No hay administradores definidos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
