"use client";

import { useEffect, useState } from "react";

import { Check, ChevronsUpDown, Info, Users } from "lucide-react";

import { ContractFormSimplified } from "@/components/contracts/contract-form-simplified";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getTeams, type TeamListItem } from "@/server/actions/teams";
import { type CreateContractData } from "@/stores/contracts-store";

interface WizardStep2ContractProps {
  onSubmit: (data: CreateContractData | null, teamId?: string) => Promise<void>;
  isLoading?: boolean;
  initialData?: CreateContractData | null;
  initialTeamId?: string;
}

export function WizardStep2Contract({
  onSubmit,
  isLoading = false,
  initialData,
  initialTeamId,
}: WizardStep2ContractProps) {
  const [skipContract, setSkipContract] = useState(false);
  const [teamId, setTeamId] = useState<string>(initialTeamId ?? "");
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Cargar equipos al montar el componente
  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    setIsTeamsLoading(true);
    try {
      const { success, teams: data } = await getTeams();
      if (success && data) {
        setTeams(data);
      }
    } finally {
      setIsTeamsLoading(false);
    }
  }

  // Cuando cambia skipContract, si es true, llamar onSubmit con null inmediatamente
  // Esto permite que el wizard avance automáticamente al siguiente paso
  useEffect(() => {
    if (skipContract) {
      // No llamamos onSubmit aquí, lo dejamos para cuando el usuario haga click en "Siguiente"
    }
  }, [skipContract]);

  const handleContractSubmit = async (data: CreateContractData) => {
    if (skipContract) {
      // Si está marcado, crear contrato básico automático (SOLO datos contractuales)
      const defaultContract: CreateContractData = {
        contractType: "INDEFINIDO",
        startDate: new Date().toISOString().split("T")[0],
        endDate: null,
        grossSalary: null,
        positionId: null,
        departmentId: null,
        costCenterId: null,
        managerId: null,
      };
      await onSubmit(defaultContract, teamId);
    } else {
      // Si no está marcado, usar los datos del formulario
      await onSubmit(data, teamId);
    }
  };

  // Función que será llamada desde el wizard cuando el usuario haga click en "Siguiente"
  const handleWizardNext = () => {
    if (skipContract) {
      // Crear contrato básico automático (SOLO datos contractuales)
      const defaultContract: CreateContractData = {
        contractType: "INDEFINIDO",
        startDate: new Date().toISOString().split("T")[0],
        endDate: null,
        grossSalary: null,
        positionId: null,
        departmentId: null,
        costCenterId: null,
        managerId: null,
      };
      return handleContractSubmit(defaultContract);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-6">
      {/* Switch compacto */}
      <div className="from-primary/15 to-card border-muted hover:border-primary/40 flex items-center justify-between rounded-xl border-2 bg-gradient-to-br p-5 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex-1 space-y-1">
          <Label htmlFor="skip-contract" className="text-lg font-semibold">
            Configurar contrato más tarde
          </Label>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Crearemos un contrato indefinido básico. Podrás editarlo después.
          </p>
        </div>
        <Switch id="skip-contract" checked={skipContract} onCheckedChange={setSkipContract} className="wizard-switch" />
      </div>

      {skipContract && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Se creará un contrato indefinido básico. Los horarios se configurarán en el siguiente paso.
          </AlertDescription>
        </Alert>
      )}

      {/* Formulario de contrato (solo si no está marcado el checkbox) */}
      {!skipContract && (
        <div className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <ContractFormSimplified
            onSubmit={handleContractSubmit}
            onCancel={() => {}}
            isSubmitting={isLoading}
            initialData={initialData}
            hideActions={true}
            formId="wizard-step-2-form"
          />
        </div>
      )}

      {/* Selector de Equipo - Siempre visible */}
      <Card className="rounded-lg border shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipo de Trabajo
          </CardTitle>
          <CardDescription>Asigna el empleado a un equipo (opcional)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label>Equipo (opcional)</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn("w-full justify-between", !teamId && "text-muted-foreground")}
                >
                  {teamId ? teams.find((team) => team.id === teamId)?.name : "Seleccionar equipo"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar equipo..." />
                  <CommandList>
                    <CommandEmpty>{isTeamsLoading ? "Cargando equipos..." : "No se encontraron equipos"}</CommandEmpty>
                    <CommandGroup>
                      {/* Opción para limpiar selección */}
                      {teamId && (
                        <CommandItem
                          value="__clear__"
                          onSelect={() => {
                            setTeamId("");
                            setComboboxOpen(false);
                          }}
                        >
                          <span className="text-muted-foreground italic">Sin equipo</span>
                        </CommandItem>
                      )}
                      {teams.map((team) => (
                        <CommandItem
                          value={team.name}
                          key={team.id}
                          onSelect={() => {
                            setTeamId(team.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", team.id === teamId ? "opacity-100" : "opacity-0")} />
                          <Users className="mr-2 h-4 w-4 opacity-50" />
                          <div className="flex flex-col">
                            <span>{team.name}</span>
                            {team.code && <span className="text-muted-foreground text-xs">{team.code}</span>}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-muted-foreground text-sm">
              El equipo ayuda a organizar empleados dentro de un mismo centro de coste
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Formulario oculto para manejar el submit cuando skipContract está true */}
      {skipContract && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleWizardNext();
          }}
          id="wizard-step-2-form"
          className="hidden"
        />
      )}
    </div>
  );
}
