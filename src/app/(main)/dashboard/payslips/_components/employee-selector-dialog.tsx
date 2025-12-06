"use client";

import { useEffect, useState } from "react";

import { Loader2, Search, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchEmployeesForPayslip } from "@/server/actions/payslips";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  employeeNumber: string | null;
  email: string | null;
}

interface EmployeeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (employeeId: string) => void;
  isLoading: boolean;
  detectedDni?: string;
  detectedName?: string;
}

export function EmployeeSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  isLoading,
  detectedDni,
  detectedName,
}: EmployeeSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Búsqueda inicial con DNI detectado
  useEffect(() => {
    if (open && detectedDni) {
      setSearchQuery(detectedDni);
      handleSearch(detectedDni);
    } else if (open && detectedName) {
      setSearchQuery(detectedName);
      handleSearch(detectedName);
    } else if (open) {
      setSearchQuery("");
      setEmployees([]);
    }
    setSelectedId(null);
  }, [open, detectedDni, detectedName]);

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setEmployees([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchEmployeesForPayslip(query);
      if (result.success && result.employees) {
        setEmployees(result.employees);
      }
    } catch {
      setEmployees([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar a empleado</DialogTitle>
          <DialogDescription>
            Busca y selecciona el empleado al que asignar esta nómina.
            {detectedDni && (
              <span className="mt-1 block">
                DNI detectado: <code className="bg-muted rounded px-1">{detectedDni}</code>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nombre, DNI o email..."
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Resultados */}
          <div className="max-h-[300px] overflow-y-auto rounded-lg border">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                <span className="text-muted-foreground ml-2">Buscando...</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                {searchQuery.length < 2 ? "Escribe al menos 2 caracteres para buscar" : "No se encontraron empleados"}
              </div>
            ) : (
              <div className="divide-y">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedId(emp.id)}
                    className={`hover:bg-muted/50 flex w-full items-center gap-3 p-3 text-left transition-colors ${
                      selectedId === emp.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                      <User className="text-muted-foreground h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        {emp.dni && <Badge variant="outline">{emp.dni}</Badge>}
                        {emp.employeeNumber && <Badge variant="secondary">{emp.employeeNumber}</Badge>}
                        {emp.email && <span className="truncate">{emp.email}</span>}
                      </div>
                    </div>
                    {selectedId === emp.id && <div className="text-primary text-sm font-medium">Seleccionado</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedId || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                "Asignar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
