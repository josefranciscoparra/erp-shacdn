"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type { SchedulePeriod } from "@prisma/client";
import { Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteSchedulePeriod } from "@/server/actions/schedules-v2";

interface DeletePeriodDialogProps {
  period: SchedulePeriod;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DeletePeriodDialog({ period, variant = "ghost", size = "sm" }: DeletePeriodDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsLoading(true);

    try {
      const result = await deleteSchedulePeriod(period.id);

      if (result.success) {
        toast.success("Período eliminado", {
          description: `El período "${period.name ?? "sin nombre"}" se ha eliminado correctamente`,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Error al eliminar período", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch (error) {
      console.error("Error deleting period:", error);
      toast.error("Error al eliminar período", {
        description: "Ha ocurrido un error al eliminar el período",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar período</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente el período{" "}
            <strong>&ldquo;{period.name ?? "sin nombre"}&rdquo;</strong> y todos los horarios configurados en él.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Eliminando..." : "Eliminar Período"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
