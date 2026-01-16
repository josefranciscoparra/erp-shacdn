"use client";

import { useEffect, useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addOrganizationApprover } from "@/server/actions/expense-approvers";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
};

type AddApproverDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproverAdded: () => void;
};

export function AddApproverDialog({ open, onOpenChange, onApproverAdded }: AddApproverDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => {
    if (open) {
      void loadEligibleUsers();
    } else {
      // Reset al cerrar
      setSelectedUserId(null);
      setIsPrimary(false);
    }
  }, [open]);

  const loadEligibleUsers = async () => {
    try {
      setIsLoadingUsers(true);
      // Cargar usuarios que pueden ser aprobadores (MANAGER+) y que tengan empleado asociado
      const response = await fetch("/api/users?roles=MANAGER,HR_ADMIN,ORG_ADMIN&withEmployee=true");

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      setUsers(data.users ?? []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error("Selecciona un usuario");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await addOrganizationApprover({
        userId: selectedUserId,
        isPrimary,
      });

      if (result.success) {
        toast.success("Aprobador agregado correctamente");
        onApproverAdded();
      } else {
        toast.error(result.error ?? "Error al agregar aprobador");
      }
    } catch (error) {
      console.error("Error adding approver:", error);
      toast.error("Error al agregar aprobador");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      SUPER_ADMIN: "Super Admin",
      ORG_ADMIN: "Admin Organización",
      HR_ADMIN: "Admin RRHH",
      MANAGER: "Manager",
    };
    return labels[role] ?? role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar aprobador de gastos</DialogTitle>
          <DialogDescription>
            Selecciona un usuario con rol de Manager o superior para que pueda aprobar gastos de la organización.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Usuario selector */}
          <div className="space-y-2">
            <Label>Usuario</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                  disabled={isLoadingUsers}
                >
                  {selectedUser ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedUser.image ?? undefined} alt={selectedUser.name} />
                        <AvatarFallback className="text-xs">
                          {selectedUser.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{selectedUser.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {isLoadingUsers ? "Cargando usuarios..." : "Selecciona un usuario"}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar usuario..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.name} ${user.email}`}
                          onSelect={() => {
                            setSelectedUserId(user.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")}
                          />
                          <Avatar className="mr-2 h-6 w-6">
                            <AvatarImage src={user.image ?? undefined} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-1 items-center justify-between">
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-muted-foreground text-xs">{user.email}</span>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {getRoleLabel(user.role)}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Checkbox primario */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked === true)}
            />
            <Label htmlFor="isPrimary" className="cursor-pointer text-sm font-normal">
              Marcar como aprobador primario (desmarcará otros aprobadores primarios)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || isSubmitting}>
            {isSubmitting ? "Agregando..." : "Agregar aprobador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
