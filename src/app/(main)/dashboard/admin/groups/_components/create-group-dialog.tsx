"use client";

import * as React from "react";

import { AlertCircle, FolderPlus, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOrganizationGroup } from "@/server/actions/organization-groups";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateGroupDialog({ open, onOpenChange, onCreated }: CreateGroupDialogProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setName("");
    setDescription("");
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const trimmedDescription = description.trim();

    try {
      const result = await createOrganizationGroup({
        name,
        description: trimmedDescription ? trimmedDescription : undefined,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo crear el grupo");
        return;
      }

      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <FolderPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle>Nuevo Grupo</DialogTitle>
              <DialogDescription className="mt-0.5">
                Crea un grupo para administrar varias organizaciones.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="group-name">
              Nombre del Grupo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Grupo Norte, Holding Principal..."
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Descripción</Label>
            <Textarea
              id="group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Breve contexto sobre el propósito de este grupo..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="border-t bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Grupo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
