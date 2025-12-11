"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { assignReportManager, getWhistleblowingManagers } from "@/server/actions/whistleblowing";

interface AssignManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  currentAssigneeId?: string;
  onSuccess: () => void;
}

type Manager = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export function AssignManagerDialog({
  open,
  onOpenChange,
  reportId,
  currentAssigneeId,
  onSuccess,
}: AssignManagerDialogProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>(currentAssigneeId ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadManagers();
      setSelectedManagerId(currentAssigneeId ?? "");
    }
  }, [open, currentAssigneeId]);

  async function loadManagers() {
    setIsLoading(true);
    try {
      const result = await getWhistleblowingManagers();
      if (result.success && result.managers) {
        setManagers(result.managers);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedManagerId) return;
    setIsSubmitting(true);
    try {
      const result = await assignReportManager(reportId, selectedManagerId);
      if (result.success) {
        onSuccess();
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar gestor</DialogTitle>
          <DialogDescription>Selecciona el gestor que se encargará de investigar esta denuncia.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : managers.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No hay gestores configurados para el canal de denuncias.
          </div>
        ) : (
          <RadioGroup value={selectedManagerId} onValueChange={setSelectedManagerId} className="gap-3">
            {managers.map((manager) => (
              <div key={manager.id} className="flex items-center space-x-3">
                <RadioGroupItem value={manager.id} id={manager.id} />
                <Label
                  htmlFor={manager.id}
                  className="hover:bg-muted flex flex-1 cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={manager.image ?? undefined} />
                    <AvatarFallback>{manager.name?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{manager.name ?? "Sin nombre"}</p>
                    <p className="text-muted-foreground truncate text-xs">{manager.email}</p>
                  </div>
                  {currentAssigneeId === manager.id && <span className="text-muted-foreground text-xs">(actual)</span>}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedManagerId || selectedManagerId === currentAssigneeId || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
