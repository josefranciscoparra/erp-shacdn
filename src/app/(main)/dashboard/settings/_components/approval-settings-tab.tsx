"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, ChevronUp, GripVertical, Info, Plus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  type ApprovalCriterion,
  type ApprovalRequestType,
  type ApprovalSettings,
  DEFAULT_APPROVAL_SETTINGS,
} from "@/lib/approvals/approval-settings";
import { cn } from "@/lib/utils";
import { getApprovalSettings, updateApprovalSettings } from "@/server/actions/approval-settings";

type WorkflowKey = ApprovalRequestType;

const workflowLabels: Record<WorkflowKey, { title: string; description: string }> = {
  PTO: {
    title: "Ausencias",
    description: "Define quien aprueba vacaciones y permisos.",
  },
  MANUAL_TIME_ENTRY: {
    title: "Fichajes manuales",
    description: "Define quien valida solicitudes de correccion de fichajes.",
  },
  TIME_BANK: {
    title: "Bolsa de horas",
    description: "Define quien revisa solicitudes de compensacion/recuperacion.",
  },
  EXPENSE: {
    title: "Gastos",
    description: "Define quien aprueba los gastos enviados por empleados.",
  },
  ON_CALL_INTERVENTION: {
    title: "Intervenciones de guardia",
    description: "Define quien valida intervenciones realizadas durante guardias.",
  },
};

const criterionLabels: Record<ApprovalCriterion, string> = {
  DIRECT_MANAGER: "Responsable directo (manager del contrato)",
  TEAM_RESPONSIBLE: "Responsable de equipo",
  DEPARTMENT_RESPONSIBLE: "Responsable de departamento",
  COST_CENTER_RESPONSIBLE: "Responsable de centro de coste",
  HR_ADMIN: "RRHH (empresa)",
  GROUP_HR: "RRHH del grupo",
};

const baseCriterionOptions: ApprovalCriterion[] = [
  "DIRECT_MANAGER",
  "TEAM_RESPONSIBLE",
  "DEPARTMENT_RESPONSIBLE",
  "COST_CENTER_RESPONSIBLE",
  "HR_ADMIN",
  "GROUP_HR",
];

type ApproverUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  source?: "ORG" | "GROUP";
  baseOrgName?: string | null;
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Organizacion",
  HR_ADMIN: "Admin RRHH",
  HR_ASSISTANT: "Asistente RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

// --- Drag & Drop Components ---

function SortableCriterionRow({
  criterion,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isMoving,
}: {
  criterion: ApprovalCriterion;
  index: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isMoving?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: criterion });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        scale: isMoving ? 1.02 : 1,
        boxShadow: isMoving ? "0 4px 20px rgba(0, 0, 0, 0.15)" : "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
      transition={{
        layout: {
          type: "spring",
          stiffness: 300,
          damping: 25,
        },
        scale: {
          duration: 0.2,
        },
        boxShadow: {
          duration: 0.2,
        },
      }}
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card flex items-center justify-between gap-3 rounded-lg border p-3 shadow-sm transition-colors hover:shadow-md",
        isDragging && "ring-primary opacity-80 shadow-lg ring-2",
        isMoving && "ring-primary/50 bg-primary/5 ring-2",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground/50 hover:text-foreground cursor-grab p-1">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {index + 1}. {criterionLabels[criterion]}
          </span>
          <span className="text-muted-foreground text-xs">
            Se usa si existe para el empleado. No crea niveles, solo prioridad.
          </span>
        </div>
      </div>
      <div
        className="flex items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking buttons
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="bg-background flex items-center gap-1 rounded-md border p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Subir prioridad"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Bajar prioridad"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRemove}
          aria-label="Eliminar criterio"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 h-9 w-9 border-dashed transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function ApprovalOrderEditor({
  order,
  onChange,
  availableCriteria,
}: {
  order: ApprovalCriterion[];
  onChange: (next: ApprovalCriterion[]) => void;
  availableCriteria: ApprovalCriterion[];
}) {
  const [movingItem, setMovingItem] = useState<ApprovalCriterion | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require slight movement to start drag, allowing clicks on children
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = order.indexOf(active.id as ApprovalCriterion);
      const newIndex = order.indexOf(over?.id as ApprovalCriterion);
      onChange(arrayMove(order, oldIndex, newIndex));
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newOrder = [...order];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const movedCriterion = newOrder[index];
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

      // Activar animación de movimiento
      setMovingItem(movedCriterion);
      setTimeout(() => setMovingItem(null), 300);

      onChange(newOrder);
    }
  };

  const availableOptions = useMemo(
    () => availableCriteria.filter((option) => !order.includes(option)),
    [availableCriteria, order],
  );

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((criterion, index) => (
              <SortableCriterionRow
                key={criterion}
                criterion={criterion}
                index={index}
                onRemove={() => onChange(order.filter((item) => item !== criterion))}
                onMoveUp={() => moveItem(index, "up")}
                onMoveDown={() => moveItem(index, "down")}
                isFirst={index === 0}
                isLast={index === order.length - 1}
                isMoving={movingItem === criterion}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {availableOptions.length > 0 && (
        <div className="pt-1">
          <Select
            value=""
            onValueChange={(value) => {
              if (!value) return;
              onChange([...order, value as ApprovalCriterion]);
            }}
          >
            <SelectTrigger className="w-full border-dashed">
              <div className="text-muted-foreground flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <SelectValue placeholder="Agregar criterio..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {criterionLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <p className="text-muted-foreground text-[10px]">
        Arrastra los elementos o usa las flechas para cambiar el orden de prioridad.
      </p>
    </div>
  );
}

function ApproverListEditor({
  users,
  value,
  onChange,
  isLoading,
  allowGroupUsers,
}: {
  users: ApproverUser[];
  value: string[];
  onChange: (next: string[]) => void;
  isLoading: boolean;
  allowGroupUsers: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedUsers = useMemo(() => users.filter((user) => value.includes(user.id)), [users, value]);
  const missingCount = value.length - selectedUsers.length;
  const { orgUsers, groupUsers } = useMemo(() => {
    const orgList: ApproverUser[] = [];
    const groupList: ApproverUser[] = [];
    users.forEach((user) => {
      if (user.source === "GROUP") {
        groupList.push(user);
      } else {
        orgList.push(user);
      }
    });
    return { orgUsers: orgList, groupUsers: groupList };
  }, [users]);

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
      return;
    }
    onChange([...value, userId]);
  };

  const removeUser = (userId: string) => {
    onChange(value.filter((id) => id !== userId));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedUsers.map((user) => (
          <Badge
            key={user.id}
            variant="secondary"
            className="flex items-center gap-1 py-1 pr-2 pl-1 text-sm font-normal"
          >
            <Avatar className="mr-1 h-5 w-5">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-[9px]">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="max-w-[150px] truncate">{user.name}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeUser(user.id);
              }}
              className="hover:text-destructive ml-1 focus:outline-none"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Eliminar</span>
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={open}
              disabled={isLoading}
              className="h-8 border-dashed"
            >
              <Plus className="mr-2 h-3 w-3" />
              Añadir validador
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar usuario..." />
              <CommandList className="max-h-[300px]">
                {isLoading ? (
                  <div className="text-muted-foreground py-6 text-center text-sm">Cargando usuarios...</div>
                ) : (
                  <>
                    <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                    <CommandGroup heading="Usuarios de la organizacion">
                      {orgUsers.map((user) => {
                        const isSelected = value.includes(user.id);
                        return (
                          <CommandItem
                            key={user.id}
                            value={`${user.name} ${user.email}`}
                            onSelect={() => toggleUser(user.id)}
                          >
                            <div
                              className={cn(
                                "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <Check className={cn("h-3 w-3")} />
                            </div>
                            <div className="flex flex-1 flex-col">
                              <span className="text-sm font-medium">{user.name}</span>
                              <span className="text-muted-foreground text-xs">{user.email}</span>
                            </div>
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {roleLabels[user.role] ?? user.role}
                            </Badge>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    {allowGroupUsers && (
                      <CommandGroup heading="Usuarios del grupo">
                        {groupUsers.length === 0 ? (
                          <div className="text-muted-foreground px-2 py-2 text-xs">No hay usuarios disponibles.</div>
                        ) : (
                          groupUsers.map((user) => {
                            const isSelected = value.includes(user.id);
                            return (
                              <CommandItem
                                key={user.id}
                                value={`${user.name} ${user.email}`}
                                onSelect={() => toggleUser(user.id)}
                              >
                                <div
                                  className={cn(
                                    "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                                  )}
                                >
                                  <Check className={cn("h-3 w-3")} />
                                </div>
                                <div className="flex flex-1 flex-col">
                                  <span className="text-sm font-medium">{user.name}</span>
                                  <span className="text-muted-foreground text-xs">{user.email}</span>
                                </div>
                                <Badge variant="secondary" className="ml-2 text-[10px]">
                                  Grupo
                                </Badge>
                              </CommandItem>
                            );
                          })
                        )}
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Caso 3: Aprobador eliminado - alerta más visible */}
      {missingCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-xs text-red-700 dark:text-red-300">
            {missingCount} aprobador{missingCount === 1 ? "" : "es"} ya no está disponible en la organización y será
            eliminado{missingCount === 1 ? "" : "s"} al guardar.
          </p>
        </div>
      )}
    </div>
  );
}

export function ApprovalSettingsTab() {
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<ApprovalSettings | null>(null);
  const [initialGroupHrEnabled, setInitialGroupHrEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [approverUsers, setApproverUsers] = useState<ApproverUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hasGroupScope, setHasGroupScope] = useState<boolean | null>(null);
  const [groupHrApprovalsEnabled, setGroupHrApprovalsEnabled] = useState(true);
  const [showGroupHrConfirmDialog, setShowGroupHrConfirmDialog] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!settings) setIsLoading(true);
    try {
      const data = await getApprovalSettings();
      setSettings(data.settings);
      setInitialSettings(JSON.parse(JSON.stringify(data.settings)));
      const groupEnabled = data.groupHrApprovalsEnabled ?? true;
      setGroupHrApprovalsEnabled(groupEnabled);
      setInitialGroupHrEnabled(groupEnabled);
    } catch (error) {
      console.error("Error al cargar configuracion de aprobaciones:", error);
      setSettings(DEFAULT_APPROVAL_SETTINGS);
      setInitialSettings(JSON.parse(JSON.stringify(DEFAULT_APPROVAL_SETTINGS)));
      setGroupHrApprovalsEnabled(true);
      setInitialGroupHrEnabled(true);
      toast.error("No se pudo cargar la configuracion de aprobaciones");
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadApproverUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch("/api/users?roles=MANAGER,HR_ASSISTANT,HR_ADMIN,ORG_ADMIN");

      if (!response.ok) {
        throw new Error("No se pudieron cargar los usuarios");
      }

      const data = await response.json();
      setApproverUsers(data.users ?? []);
      setHasGroupScope(data.hasGroupScope ?? false);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      setHasGroupScope(false);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadApproverUsers();
  }, [loadApproverUsers]);

  const allowGroupHr = hasGroupScope === true && groupHrApprovalsEnabled;
  const allowedCriteria = useMemo(
    () => (allowGroupHr ? baseCriterionOptions : baseCriterionOptions.filter((option) => option !== "GROUP_HR")),
    [allowGroupHr],
  );
  const groupUserIds = useMemo(
    () => new Set(approverUsers.filter((user) => user.source === "GROUP").map((user) => user.id)),
    [approverUsers],
  );

  const stripGroupCriteria = useCallback(
    (workflows: ApprovalSettings["workflows"]) => {
      const newWorkflows = { ...workflows };
      (Object.keys(newWorkflows) as ApprovalRequestType[]).forEach((key) => {
        newWorkflows[key] = {
          ...newWorkflows[key],
          criteriaOrder: newWorkflows[key].criteriaOrder.filter((c) => c !== "GROUP_HR"),
          approverList: newWorkflows[key].approverList.filter((id) => !groupUserIds.has(id)),
        };
      });
      return newWorkflows;
    },
    [groupUserIds],
  );

  // Caso 4: Verificar si hay GROUP_HR configurado en algún workflow
  const hasGroupHrConfigured = useMemo(() => {
    if (!settings) return false;
    return (Object.keys(settings.workflows) as ApprovalRequestType[]).some((key) => {
      const workflow = settings.workflows[key];
      const hasGroupHrCriteria = workflow.criteriaOrder.includes("GROUP_HR");
      const hasGroupUsers = workflow.approverList.some((id) => groupUserIds.has(id));
      return hasGroupHrCriteria || hasGroupUsers;
    });
  }, [settings, groupUserIds]);

  const handleGroupHrToggle = useCallback(
    (next: boolean) => {
      if (!next && hasGroupHrConfigured) {
        // Caso 4: Mostrar confirmación antes de limpiar
        setShowGroupHrConfirmDialog(true);
      } else {
        setGroupHrApprovalsEnabled(next);
      }
    },
    [hasGroupHrConfigured],
  );

  const confirmDisableGroupHr = useCallback(() => {
    setGroupHrApprovalsEnabled(false);
    setSettings((prev) => (prev ? { ...prev, workflows: stripGroupCriteria(prev.workflows) } : prev));
    setShowGroupHrConfirmDialog(false);
    toast.info("Se han eliminado los criterios y aprobadores del grupo");
  }, [stripGroupCriteria]);

  // Caso 7: Detectar si hay cambios
  const hasChanges = useMemo(() => {
    if (!settings || !initialSettings) return false;
    if (groupHrApprovalsEnabled !== initialGroupHrEnabled) return true;
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  }, [settings, initialSettings, groupHrApprovalsEnabled, initialGroupHrEnabled]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const result = await updateApprovalSettings({
        settings,
        groupHrApprovalsEnabled,
      });
      if (result.success) {
        // Actualizar valores iniciales después de guardar
        setInitialSettings(JSON.parse(JSON.stringify(settings)));
        setInitialGroupHrEnabled(groupHrApprovalsEnabled);
        toast.success("Configuracion de aprobaciones guardada");
      } else {
        toast.error(result.error ?? "No se pudo guardar la configuracion");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <Card className="rounded-lg border p-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </Card>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-lg border p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const workflows = settings.workflows;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="rounded-lg border p-6">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
            <ShieldCheck className="text-primary h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-semibold">Flujo de aprobaciones</h3>
            <p className="text-muted-foreground text-sm">
              El sistema utiliza el primer criterio que aplique para cada empleado. Si no encuentra aprobadores, se
              activa el fallback de RRHH.
            </p>
          </div>
        </div>

        {hasGroupScope && (
          <div className="bg-muted/30 mt-6 flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">RRHH del grupo</p>
              <p className="text-muted-foreground text-xs">
                Permite a RRHH del grupo aprobar solicitudes en esta organizacion.
              </p>
            </div>
            <Switch checked={groupHrApprovalsEnabled} onCheckedChange={handleGroupHrToggle} disabled={isSaving} />
          </div>
        )}
      </Card>

      {/* Workflows List */}
      <div className="space-y-6">
        {(["PTO", "MANUAL_TIME_ENTRY", "TIME_BANK", "EXPENSE"] as WorkflowKey[]).map((key) => {
          const workflow = workflows[key];
          const initialWorkflow = initialSettings?.workflows[key];

          // Caso 1: Lista vacía en modo LIST
          const isListModeEmpty = workflow.mode === "LIST" && workflow.approverList.length === 0;

          // Caso 2/5: Jerarquía vacía
          const isHierarchyEmpty = workflow.mode === "HIERARCHY" && workflow.criteriaOrder.length === 0;

          // Caso 6: Detectar si el otro modo tiene datos configurados
          const otherModeHasData =
            workflow.mode === "LIST" ? workflow.criteriaOrder.length > 0 : workflow.approverList.length > 0;

          // Detectar si se acaba de cambiar el modo
          const modeJustChanged = initialWorkflow && workflow.mode !== initialWorkflow.mode;

          return (
            <Card key={key} className="flex flex-col rounded-lg border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{workflowLabels[key].title}</CardTitle>
                <CardDescription className="text-xs">{workflowLabels[key].description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-5">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">Modo de aprobacion</span>
                    <Select
                      value={workflow.mode}
                      onValueChange={(value) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                workflows: {
                                  ...prev.workflows,
                                  [key]: {
                                    ...prev.workflows[key],
                                    mode: value === "LIST" ? "LIST" : "HIERARCHY",
                                  },
                                },
                              }
                            : prev,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIERARCHY">Jerarquia</SelectItem>
                        <SelectItem value="LIST">Lista de aprobadores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-tight">
                    {workflow.mode === "LIST"
                      ? "Todos los aprobadores de la lista reciben notificacion y cualquiera puede aprobar. Si esta vacia, se usa la prioridad de criterios."
                      : "Se usa el primer criterio con aprobadores. Si hay varios, cualquiera puede aprobar. Siempre hay fallback a RRHH."}
                  </p>

                  {/* Caso 6: Aviso de cambio de modo con datos en el otro modo */}
                  {modeJustChanged && otherModeHasData && (
                    <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Los datos del modo anterior se mantienen guardados. Si vuelves a cambiar, estarán disponibles.
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {workflow.mode === "HIERARCHY" ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Prioridad de criterios</span>
                    </div>
                    <ApprovalOrderEditor
                      order={workflow.criteriaOrder}
                      availableCriteria={allowedCriteria}
                      onChange={(next) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                workflows: {
                                  ...prev.workflows,
                                  [key]: {
                                    ...prev.workflows[key],
                                    criteriaOrder: next,
                                  },
                                },
                              }
                            : prev,
                        )
                      }
                    />

                    {/* Caso 2: Advertencia jerarquía vacía */}
                    {isHierarchyEmpty && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Sin criterios configurados. Solo RRHH podrá aprobar estas solicitudes.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Lista de aprobadores</span>
                      <p className="text-muted-foreground text-[11px]">
                        Todos los aprobadores reciben notificacion y cualquiera puede aprobar. Si esta vacia, se usa la
                        prioridad de criterios.
                      </p>
                    </div>
                    <ApproverListEditor
                      users={approverUsers}
                      value={workflow.approverList}
                      onChange={(next) =>
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                workflows: {
                                  ...prev.workflows,
                                  [key]: {
                                    ...prev.workflows[key],
                                    approverList: next,
                                  },
                                },
                              }
                            : prev,
                        )
                      }
                      isLoading={isLoadingUsers}
                      allowGroupUsers={allowGroupHr}
                    />

                    {/* Caso 1: Advertencia lista vacía */}
                    {isListModeEmpty && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Sin aprobadores en la lista. Se usará la jerarquía como fallback.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="lg">
          {isSaving ? "Guardando..." : hasChanges ? "Guardar cambios" : "Sin cambios"}
        </Button>
      </div>

      {/* Caso 4: Dialog de confirmación para desactivar RRHH del grupo */}
      <AlertDialog open={showGroupHrConfirmDialog} onOpenChange={setShowGroupHrConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar RRHH del grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes configuraciones que usan RRHH del grupo. Al desactivarlo se eliminarán automáticamente:
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>El criterio &quot;RRHH del grupo&quot; de las jerarquías</li>
                <li>Los aprobadores que pertenecen al grupo</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisableGroupHr}>Desactivar y limpiar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
