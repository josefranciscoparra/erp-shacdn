"use client";

import { useEffect, useState } from "react";

import { Building2, Check, ChevronsUpDown, User } from "lucide-react";
import { toast } from "sonner";

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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { setEmployeeApprover } from "@/server/actions/expense-approvers";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  currentApproverId: string | null;
  onApproverChanged: () => void;
};

export function SetEmployeeApproverDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  currentApproverId,
  onApproverChanged,
}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [approverMode, setApproverMode] = useState<"organizational" | "specific">(
    currentApproverId ? "specific" : "organizational",
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentApproverId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => {
    if (open) {
      void loadEligibleUsers();
      setApproverMode(currentApproverId ? "specific" : "organizational");
      setSelectedUserId(currentApproverId);
    }
  }, [open, currentApproverId]);

  const loadEligibleUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch("/api/users?roles=MANAGER,HR_ADMIN,ORG_ADMIN,SUPER_ADMIN");

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
    try {
      setIsSubmitting(true);

      const userId = approverMode === "organizational" ? null : selectedUserId;

      if (approverMode === "specific" && !userId) {
        toast.error("Selecciona un usuario como aprobador");
        return;
      }

      const result = await setEmployeeApprover({
        employeeId,
        userId,
      });

      if (result.success) {
        toast.success(
          approverMode === "organizational"
            ? "El empleado ahora usa los aprobadores organizacionales"
            : "Aprobador específico asignado correctamente",
        );
        onApproverChanged();
      } else {
        toast.error(result.error ?? "Error al asignar aprobador");
      }
    } catch (error) {
      console.error("Error setting approver:", error);
      toast.error("Error al asignar aprobador");
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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Configurar aprobador de gastos</DialogTitle>
          <DialogDescription>
            Configura quién aprobará los gastos de {employeeName}. Puedes usar los aprobadores de la organización o
            asignar uno específico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selector de modo */}
          <div className="space-y-3">
            <Label>Tipo de aprobador</Label>
            <RadioGroup
              value={approverMode}
              onValueChange={(value) => {
                setApproverMode(value as "organizational" | "specific");
                if (value === "organizational") {
                  setSelectedUserId(null);
                }
              }}
            >
              <div className="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-4 transition-colors">
                <RadioGroupItem value="organizational" id="organizational" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="organizational" className="cursor-pointer font-medium">
                    <Building2 className="mr-2 inline h-4 w-4" />
                    Aprobadores organizacionales
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Los gastos serán aprobados por los aprobadores generales de la organización
                  </p>
                </div>
              </div>

              <div className="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-4 transition-colors">
                <RadioGroupItem value="specific" id="specific" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="specific" className="cursor-pointer font-medium">
                    <User className="mr-2 inline h-4 w-4" />
                    Aprobador específico
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">Asigna un aprobador exclusivo para este empleado</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Selector de usuario (solo si modo specific) */}
          {approverMode === "specific" && (
            <div className="space-y-2">
              <Label>Seleccionar aprobador</Label>
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
                        {isLoadingUsers ? "Cargando usuarios..." : "Selecciona un aprobador"}
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar usuario..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.id}
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (approverMode === "specific" && !selectedUserId)}>
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
