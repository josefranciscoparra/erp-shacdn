"use client";

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

interface CopyWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  shiftCount: number;
}

export function CopyWeekDialog({ open, onOpenChange, onConfirm, shiftCount }: CopyWeekDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Sobreescribir semana actual?</AlertDialogTitle>
          <AlertDialogDescription>
            La semana actual ya tiene <strong>{shiftCount} turnos asignados</strong>.
            <br />
            <br />
            Si continúas, se <strong>borrarán todos los turnos existentes</strong> de esta semana y se copiarán los de
            la semana anterior exactamente como estaban.
            <br />
            <br />
            Esta acción es destructiva, aunque podrás deshacerla inmediatamente después si te equivocas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sobreescribir y Copiar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
