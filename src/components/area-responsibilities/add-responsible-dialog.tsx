"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { Scope } from "@/services/permissions";
import { cn } from "@/lib/utils";
import {
  assignResponsibility,
  searchUsersForResponsibility,
  type Permission,
} from "@/server/actions/area-responsibilities";

interface AddResponsibleDialogProps {
  scope: Scope;
  scopeId: string;
  scopeName?: string; // Nombre del ámbito (ej: "Centro Madrid", "Equipo A")
}

// Labels de roles en español
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin",
  HR_ADMIN: "RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

// Labels de scopes en español
const scopeLabels: Record<Scope, string> = {
  ORGANIZATION: "organización",
  COST_CENTER: "centro de coste",
  TEAM: "equipo",
};

// Permisos que se asignan automáticamente a todo responsable
// El responsable tiene control total sobre su área de responsabilidad
const ALL_PERMISSIONS: Permission[] = [
  "VIEW_EMPLOYEES",
  "MANAGE_EMPLOYEES",
  "VIEW_TIME_ENTRIES",
  "MANAGE_TIME_ENTRIES",
  "VIEW_ALERTS",
  "RESOLVE_ALERTS",
  "VIEW_SCHEDULES",
  "MANAGE_SCHEDULES",
  "VIEW_PTO_REQUESTS",
  "APPROVE_PTO_REQUESTS",
];

const formSchema = z.object({
  userId: z.string().min(1, "Debes seleccionar un usuario"),
  createSubscription: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export function AddResponsibleDialog({ scope, scopeId, scopeName }: AddResponsibleDialogProps) {
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
      // Asignar todos los permisos automáticamente
      const { success, error } = await assignResponsibility({
        userId: data.userId,
        scope,
        scopeId,
        permissions: ALL_PERMISSIONS,
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
  const scopeLabel = scopeLabels[scope];

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
          <DialogDescription>
            Asigna un usuario como responsable de este {scopeLabel}
            {scopeName ? `: ${scopeName}` : ""}
          </DialogDescription>
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

            {/* Información de permisos */}
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-sm font-medium">El responsable podrá:</p>
              <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
                <li>Aprobar solicitudes de ausencias y fichajes manuales</li>
                <li>Ver y resolver alertas de incidencias</li>
                <li>Gestionar empleados, horarios y fichajes</li>
              </ul>
            </div>

            {/* Switch suscripción automática */}
            <FormField
              control={form.control}
              name="createSubscription"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Suscripción automática a alertas</FormLabel>
                    <FormDescription>
                      El usuario recibirá notificaciones de alertas de este {scopeLabel} (solo WARNING y CRITICAL)
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
