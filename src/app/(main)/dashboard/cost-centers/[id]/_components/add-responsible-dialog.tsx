"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  assignResponsibility,
  searchUsersForResponsibility,
  type Permission,
} from "@/server/actions/area-responsibilities";

interface AddResponsibleDialogProps {
  costCenterId: string;
}

// Labels de roles en español
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin",
  HR_ADMIN: "RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

// Permisos disponibles
const availablePermissions = [
  { value: "VIEW_EMPLOYEES" as const, label: "Ver Empleados" },
  { value: "MANAGE_EMPLOYEES" as const, label: "Gestionar Empleados" },
  { value: "VIEW_TIME_ENTRIES" as const, label: "Ver Fichajes" },
  { value: "MANAGE_TIME_ENTRIES" as const, label: "Gestionar Fichajes" },
  { value: "VIEW_ALERTS" as const, label: "Ver Alertas" },
  { value: "RESOLVE_ALERTS" as const, label: "Resolver Alertas" },
  { value: "VIEW_SCHEDULES" as const, label: "Ver Horarios" },
  { value: "MANAGE_SCHEDULES" as const, label: "Gestionar Horarios" },
  { value: "VIEW_PTO_REQUESTS" as const, label: "Ver Ausencias" },
  { value: "APPROVE_PTO_REQUESTS" as const, label: "Aprobar Ausencias" },
];

const formSchema = z.object({
  userId: z.string().min(1, "Debes seleccionar un usuario"),
  permissions: z.array(z.string()).min(1, "Debes seleccionar al menos un permiso"),
  createSubscription: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export function AddResponsibleDialog({ costCenterId }: AddResponsibleDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; role: string }>>(
    [],
  );
  const [searching, setSearching] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      permissions: [],
      createSubscription: true,
    },
  });

  async function handleSearch(search: string) {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { success, users, error } = await searchUsersForResponsibility(search);

      if (success && users) {
        setSearchResults(users);
      } else {
        toast.error(error ?? "Error al buscar usuarios");
      }
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const { success, error } = await assignResponsibility({
        userId: data.userId,
        scope: "COST_CENTER",
        scopeId: costCenterId,
        permissions: data.permissions as Permission[],
        createSubscription: data.createSubscription,
      });

      if (success) {
        toast.success("Responsable asignado correctamente");
        setOpen(false);
        form.reset();
        // Refresh page to show new responsible
        window.location.reload();
      } else {
        toast.error(error ?? "Error al asignar responsable");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedUser = searchResults.find((u) => u.id === form.watch("userId"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Añadir Responsable
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Responsable</DialogTitle>
          <DialogDescription>Asigna un usuario como responsable de este centro de coste</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Combobox de búsqueda de usuarios */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Usuario</FormLabel>
                  <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("justify-between", !field.value && "text-muted-foreground")}
                        >
                          {selectedUser ? (
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate">{selectedUser.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {roleLabels[selectedUser.role] ?? selectedUser.role}
                              </Badge>
                            </div>
                          ) : (
                            "Buscar por nombre o email..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar usuario..."
                          onValueChange={(value) => {
                            handleSearch(value);
                          }}
                        />
                        <CommandList>
                          {searching && <CommandEmpty>Buscando...</CommandEmpty>}
                          {!searching && searchResults.length === 0 && (
                            <CommandEmpty>No se encontraron usuarios. Escribe al menos 2 caracteres.</CommandEmpty>
                          )}
                          {!searching && searchResults.length > 0 && (
                            <CommandGroup>
                              {searchResults.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.id}
                                  onSelect={() => {
                                    form.setValue("userId", user.id);
                                    setUserSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === user.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-1 flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{user.name}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {roleLabels[user.role] ?? user.role}
                                      </Badge>
                                    </div>
                                    <span className="text-muted-foreground text-xs">{user.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Busca y selecciona el usuario que será responsable</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Checkboxes de permisos (grid 2 columnas) */}
            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Permisos</FormLabel>
                    <FormDescription>Selecciona los permisos que tendrá el responsable en este centro</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {availablePermissions.map((perm) => (
                      <FormField
                        key={perm.value}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(perm.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? [];
                                  if (checked) {
                                    field.onChange([...current, perm.value]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== perm.value));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">{perm.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Switch suscripción automática */}
            <FormField
              control={form.control}
              name="createSubscription"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Suscripción automática a alertas</FormLabel>
                    <FormDescription>
                      El usuario recibirá notificaciones de alertas de este centro (solo WARNING y CRITICAL)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Asignando..." : "Asignar Responsable"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
