"use client";

import { useEffect, useState, useCallback } from "react";

import { Check, ChevronsUpDown, FolderKanban, Globe, Loader2, Lock, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getAvailableProjects } from "@/server/actions/projects";

interface Project {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  accessType: "OPEN" | "ASSIGNED";
}

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  task: string;
  onTaskChange: (task: string) => void;
  disabled?: boolean;
}

export function ProjectSelector({
  selectedProjectId,
  onSelectProject,
  task,
  onTaskChange,
  disabled = false,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const result = await getAvailableProjects();
      if (result.success && result.projects) {
        setProjects(result.projects);
      }
    } catch (error) {
      console.error("Error al cargar proyectos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Si no hay proyectos, no mostrar nada
  if (!isLoading && projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Selector de proyecto */}
      <div className="space-y-2">
        <Label className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <FolderKanban className="h-4 w-4" />
          Proyecto (opcional)
        </Label>

        {isLoading ? (
          <div className="flex h-10 items-center justify-center rounded-md border">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={disabled}
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
                          onSelectProject(null);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <X className="text-muted-foreground h-4 w-4" />
                          <span className="text-muted-foreground">Sin proyecto</span>
                        </div>
                        <Check
                          className={cn("ml-auto h-4 w-4", selectedProjectId === null ? "opacity-100" : "opacity-0")}
                        />
                      </CommandItem>

                      {projects.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={`${project.name} ${project.code ?? ""}`}
                          onSelect={() => {
                            onSelectProject(project.id);
                            setOpen(false);
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

            {/* Botón para limpiar selección (visible solo cuando hay proyecto seleccionado) */}
            {selectedProjectId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onSelectProject(null);
                }}
                disabled={disabled}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Campo de tarea (solo visible si hay proyecto seleccionado) */}
      {selectedProjectId && (
        <div className="space-y-2">
          <Label htmlFor="task" className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            Tarea o descripción (opcional)
          </Label>
          <Input
            id="task"
            placeholder="Ej: Reunión con cliente, Desarrollo frontend..."
            value={task}
            onChange={(e) => onTaskChange(e.target.value)}
            maxLength={255}
            disabled={disabled}
          />
          <p className="text-muted-foreground text-xs">{task.length}/255 caracteres</p>
        </div>
      )}
    </div>
  );
}
