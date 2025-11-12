"use client";

import { useState } from "react";

import { useDraggable } from "@dnd-kit/core";
import type { Shift } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Users, MapPin, MoreVertical } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShiftsStore } from "@/stores/shifts-store";

import { AssignEmployeesDialog } from "./assign-employees-dialog";
import { EditShiftDialog } from "./edit-shift-dialog";

type ShiftWithRelations = Shift & {
  position: { id: string; title: string } | null;
  costCenter: { id: string; name: string };
  template: { id: string; name: string; color: string } | null;
  assignments: Array<{
    id: string;
    employeeId: string;
    status: string;
  }>;
};

interface ShiftCardProps {
  shift: ShiftWithRelations;
  onClick?: () => void;
  onUpdate?: () => void;
}

export function ShiftCard({ shift, onClick, onUpdate }: ShiftCardProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { deleteShift } = useShiftsStore();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
  });

  const handleAssignmentChange = () => {
    // Notificar al padre para refrescar el turno
    if (onUpdate) {
      onUpdate();
    }
  };

  const handleDelete = async () => {
    try {
      await deleteShift(shift.id);
      toast.success("Turno eliminado correctamente");

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar turno");
    }
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const statusColor = {
    DRAFT: "bg-gray-500",
    PENDING_APPROVAL: "bg-amber-500",
    PUBLISHED: "bg-green-500",
    CLOSED: "bg-blue-500",
  }[shift.status];

  const statusLabel = {
    DRAFT: "Borrador",
    PENDING_APPROVAL: "Pendiente",
    PUBLISHED: "Publicado",
    CLOSED: "Cerrado",
  }[shift.status];

  const templateColor = shift.template?.color ?? "#3b82f6";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card relative rounded-lg border p-3 transition-all hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      }`}
      onClick={onClick}
    >
      {/* Color indicator */}
      <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg" style={{ backgroundColor: templateColor }} />

      {/* Content */}
      <div className="relative z-10 ml-2 flex flex-col gap-2">
        {/* Header with time and actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1 text-sm font-medium">
            <Clock className="text-muted-foreground h-3 w-3" />
            {shift.startTime} - {shift.endTime}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative z-20 h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditDialogOpen(true);
                }}
                disabled={shift.status === "CLOSED"}
              >
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setAssignDialogOpen(true);
                }}
              >
                Asignar empleados
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
                disabled={shift.status !== "DRAFT"}
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Position */}
        {shift.position && <div className="text-xs font-medium">{shift.position.title}</div>}

        {/* Cost center */}
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3" />
          {shift.costCenter.name}
        </div>

        {/* Coverage */}
        <div className="flex items-center gap-1 text-xs">
          <Users className="text-muted-foreground h-3 w-3" />
          <span>
            {shift.assignments.length} / {shift.requiredHeadcount}
          </span>
          {shift.assignments.length < shift.requiredHeadcount && (
            <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
              Incompleto
            </Badge>
          )}
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {statusLabel}
          </Badge>
          <div className={`h-2 w-2 rounded-full ${statusColor}`} title={statusLabel} />
        </div>
      </div>

      {/* Drag handle (invisible but covers the card) */}
      <div {...listeners} {...attributes} className="absolute inset-0 cursor-move" aria-label="Arrastrar turno" />

      {/* Assign Employees Dialog */}
      <AssignEmployeesDialog
        shift={shift}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssignmentChange={handleAssignmentChange}
      />

      {/* Edit Shift Dialog */}
      <EditShiftDialog shift={shift} open={editDialogOpen} onOpenChange={setEditDialogOpen} onUpdate={onUpdate} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar turno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El turno del {format(new Date(shift.date), "PPP", { locale: es })} de{" "}
              {shift.startTime} a {shift.endTime} será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
