"use client";

import { useCallback, useEffect, useState } from "react";

import { AlertCircle, Check, ChevronsUpDown, FolderKanban, Globe, Loader2, Lock, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getAvailableProjects } from "@/server/actions/projects";
import { changeProject as changeProjectAction, getCurrentProject } from "@/server/actions/time-tracking";

interface Project {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  accessType: "OPEN" | "ASSIGNED";
}

interface CurrentProjectInfo {
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  task: string | null;
}

interface ChangeProjectDialogProps {
  isOnBreak?: boolean;
  disabled?: boolean;
  onProjectChanged?: () => void;
}

export function ChangeProjectDialog({
  isOnBreak = false,
  disabled = false,
  onProjectChanged,
}: ChangeProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<CurrentProjectInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selección del nuevo proyecto
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [task, setTask] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectsResult, currentProjectResult] = await Promise.all([getAvailableProjects(), getCurrentProject()]);

      if (projectsResult.success && projectsResult.projects) {
        setProjects(projectsResult.projects);
      }

      if (currentProjectResult) {
        setCurrentProject(currentProjectResult);
        // Pre-seleccionar el proyecto actual
        setSelectedProjectId(currentProjectResult.projectId);
        setTask(currentProjectResult.task ?? "");
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleSubmit = async () => {
    // Verificar que haya un cambio
    const hasProjectChange = selectedProjectId !== currentProject?.projectId;
    const hasTaskChange = task !== (currentProject?.task ?? "");

    if (!hasProjectChange && !hasTaskChange) {
      toast.info("No hay cambios que guardar");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changeProjectAction(selectedProjectId, task || undefined);

      if (result.success) {
        if (result.isOnBreak) {
          toast.info("El cambio de proyecto se aplicará cuando reanudes el trabajo");
        } else {
          toast.success("Proyecto actualizado correctamente");
        }
        setOpen(false);
        onProjectChanged?.();
      } else {
        toast.error(result.error ?? "Error al cambiar de proyecto");
      }
    } catch (error) {
      console.error("Error al cambiar proyecto:", error);
      toast.error("Error al cambiar de proyecto");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si no hay proyectos disponibles, no mostrar el botón
  if (!isLoading && projects.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Cambiar proyecto</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Cambiar Proyecto
          </DialogTitle>
          <DialogDescription>Cambia el proyecto al que se está imputando tu tiempo de trabajo.</DialogDescription>
        </DialogHeader>

        {isOnBreak && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Estás en pausa. El cambio de proyecto se aplicará cuando reanudes el trabajo.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            <span className="text-muted-foreground ml-2">Cargando proyectos...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Proyecto actual */}
            {currentProject?.projectId && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium">Proyecto actual</p>
                <div className="flex items-center gap-2">
                  {currentProject.projectColor && (
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: currentProject.projectColor }}
                    />
                  )}
                  <span className="font-medium">{currentProject.projectName}</span>
                </div>
                {currentProject.task && <p className="text-muted-foreground mt-1 text-sm">{currentProject.task}</p>}
              </div>
            )}

            {/* Selector de nuevo proyecto */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nuevo proyecto</Label>
              <div className="flex gap-2">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={popoverOpen}
                      className="w-full justify-between"
                      disabled={isSubmitting}
                    >
                      {selectedProject ? (
                        <div className="flex items-center gap-2 truncate">
                          {selectedProject.color && (
                            <div
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: selectedProject.color }}
                            />
                          )}
                          <span className="truncate">{selectedProject.name}</span>
                          {selectedProject.code && (
                            <Badge variant="outline" className="ml-1 font-mono text-xs">
                              {selectedProject.code}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin proyecto asignado</span>
                      )}
                      <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar proyecto..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron proyectos.</CommandEmpty>
                        <CommandGroup>
                          {/* Opción para limpiar selección */}
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setSelectedProjectId(null);
                              setPopoverOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <X className="text-muted-foreground h-4 w-4" />
                              <span className="text-muted-foreground">Sin proyecto</span>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedProjectId === null ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>

                          {projects.map((project) => (
                            <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.code ?? ""}`}
                              onSelect={() => {
                                setSelectedProjectId(project.id);
                                setPopoverOpen(false);
                              }}
                            >
                              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                                {project.color ? (
                                  <div
                                    className="h-3 w-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                  />
                                ) : (
                                  <FolderKanban className="text-muted-foreground h-3 w-3 shrink-0" />
                                )}
                                <span className="truncate">{project.name}</span>
                                {project.code && (
                                  <Badge variant="outline" className="ml-1 shrink-0 font-mono text-xs">
                                    {project.code}
                                  </Badge>
                                )}
                                {project.accessType === "OPEN" ? (
                                  <Globe className="text-muted-foreground ml-auto h-3 w-3 shrink-0" />
                                ) : (
                                  <Lock className="text-muted-foreground ml-auto h-3 w-3 shrink-0" />
                                )}
                              </div>
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4 shrink-0",
                                  selectedProjectId === project.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Botón para limpiar selección */}
                {selectedProjectId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedProjectId(null)}
                    disabled={isSubmitting}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Campo de tarea (solo si hay proyecto seleccionado) */}
            {selectedProjectId && (
              <div className="space-y-2">
                <Label htmlFor="task" className="text-sm font-medium">
                  Tarea o descripción (opcional)
                </Label>
                <Input
                  id="task"
                  placeholder="Ej: Reunión con cliente, Desarrollo frontend..."
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  maxLength={255}
                  disabled={isSubmitting}
                />
                <p className="text-muted-foreground text-xs">{task.length}/255 caracteres</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cambiar proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
