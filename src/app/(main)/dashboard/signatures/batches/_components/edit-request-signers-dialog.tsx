"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { ArrowDown, ArrowUp, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { getAvailableEmployeesForBatch, updateRequestSigners } from "@/server/actions/signature-batch";

interface SignerRow {
  id: string;
  order: number;
  status: string;
  signerName: string;
  signedAt: Date | null;
  employeeId: string;
}

export interface EditableRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  status: string;
  secondSignerMissing: boolean;
  signers: SignerRow[];
}

interface EditRequestSignersDialogProps {
  request: EditableRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface SelectedSigner {
  employeeId: string;
  fullName: string;
}

interface EmployeeOption {
  id: string;
  fullName: string;
  email: string;
  department?: string | null;
}

export function EditRequestSignersDialog({ request, open, onOpenChange, onSaved }: EditRequestSignersDialogProps) {
  const [selectedSigners, setSelectedSigners] = useState<SelectedSigner[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<EmployeeOption[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const additionalSigners = useMemo(() => request?.signers.filter((signer) => signer.order > 1) ?? [], [request]);
  const canEdit = useMemo(() => additionalSigners.every((signer) => signer.status === "PENDING"), [additionalSigners]);

  useEffect(() => {
    if (open && request) {
      setSelectedSigners(
        request.signers
          .filter((signer) => signer.order > 1)
          .map((signer) => ({
            employeeId: signer.employeeId,
            fullName: signer.signerName,
          })),
      );
    } else if (!open) {
      setSelectedSigners([]);
      setSearchTerm("");
      setSearchResults([]);
      setComboboxOpen(false);
    }
  }, [open, request]);

  useEffect(() => {
    if (!open) return;
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    startSearchTransition(async () => {
      try {
        const response = await getAvailableEmployeesForBatch({ search: searchTerm });
        if (!response.success || !response.data) {
          setSearchResults([]);
          return;
        }

        const options = response.data
          .filter(
            (employee) =>
              employee.hasUser &&
              Boolean(employee.userId) &&
              employee.id !== request?.employeeId &&
              !selectedSigners.some((signer) => signer.employeeId === employee.id),
          )
          .map((employee) => ({
            id: employee.id,
            fullName: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
            department: employee.departmentName,
          }));

        setSearchResults(options);
      } catch (error) {
        console.error("Error searching employees:", error);
        setSearchResults([]);
      }
    });
  }, [open, searchTerm, selectedSigners, request?.employeeId]);

  const handleAddSigner = (option: EmployeeOption) => {
    setSelectedSigners((current) => [...current, { employeeId: option.id, fullName: option.fullName }]);
    setSearchTerm("");
    setComboboxOpen(false);
  };

  const handleRemoveSigner = (employeeId: string) => {
    setSelectedSigners((current) => current.filter((signer) => signer.employeeId !== employeeId));
  };

  const handleMoveSigner = (fromIndex: number, direction: "up" | "down") => {
    setSelectedSigners((current) => {
      const newSigners = [...current];
      const targetIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
      if (targetIndex < 0 || targetIndex >= newSigners.length) {
        return current;
      }
      const [moved] = newSigners.splice(fromIndex, 1);
      newSigners.splice(targetIndex, 0, moved);
      return newSigners;
    });
  };

  const handleSave = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      const signerIds = selectedSigners.map((signer) => signer.employeeId);
      const result = await updateRequestSigners({ requestId: request.id, signerEmployeeIds: signerIds });

      if (!result.success) {
        toast.error(result.error ?? "No se pudieron actualizar los firmantes");
        return;
      }

      toast.success("Firmantes actualizados correctamente");
      onOpenChange(false);
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error("Error updating signers", error);
      toast.error("Error interno al actualizar los firmantes");
    } finally {
      setIsSubmitting(false);
    }
  };

  const primarySigner = request?.signers.find((signer) => signer.order === 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar firmantes</DialogTitle>
          <DialogDescription>
            Define el orden de validación para la solicitud de {request?.employeeName ?? ""}.
          </DialogDescription>
        </DialogHeader>

        {!canEdit && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Ya hay firmantes adicionales con actividad. Cancela la solicitud para volver a configurarla.
          </div>
        )}

        <div className="space-y-4 py-2">
          <section className="space-y-2">
            <p className="text-sm font-medium">Firmante principal</p>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="flex flex-col">
                <span className="font-semibold">{primarySigner?.signerName ?? request?.employeeName}</span>
                <span className="text-muted-foreground text-xs">El empleado siempre firma en primer lugar.</span>
              </div>
              <Badge variant="outline">{primarySigner?.status ?? "PENDING"}</Badge>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Firmantes adicionales</p>
                <p className="text-muted-foreground text-xs">
                  Se notificará automáticamente al firmante cuyo turno esté activo.
                </p>
              </div>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={!canEdit}>
                    <Plus className="mr-2 h-4 w-4" /> Añadir firmante
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por nombre o email"
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isSearching
                          ? "Buscando..."
                          : searchTerm.length < 2
                            ? "Escribe al menos 2 caracteres"
                            : "No hay resultados"}
                      </CommandEmpty>
                      {searchResults.length > 0 && (
                        <CommandGroup>
                          {searchResults.map((option) => (
                            <CommandItem
                              key={option.id}
                              value={option.id}
                              onSelect={() => handleAddSigner(option)}
                              disabled={!canEdit}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{option.fullName}</span>
                                <span className="text-muted-foreground text-xs">
                                  {option.email}
                                  {option.department ? ` · ${option.department}` : null}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedSigners.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No hay validadores adicionales configurados para esta solicitud.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSigners.map((signer, index) => (
                  <div
                    key={signer.employeeId}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 2}</Badge>
                      <div className="flex flex-col">
                        <span className="font-semibold">{signer.fullName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Subir"
                        disabled={!canEdit || index === 0}
                        onClick={() => handleMoveSigner(index, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Bajar"
                        disabled={!canEdit || index === selectedSigners.length - 1}
                        onClick={() => handleMoveSigner(index, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar"
                        disabled={!canEdit}
                        onClick={() => handleRemoveSigner(signer.employeeId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canEdit || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
