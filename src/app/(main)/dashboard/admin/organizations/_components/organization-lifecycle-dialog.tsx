"use client";

import { useEffect, useMemo, useState } from "react";

import { AlertTriangle, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import type { OrganizationItem } from "./types";

type OrganizationLifecycleMode = "deactivate" | "reactivate" | "purge";

type DeactivatePreview = {
  mode: "deactivate";
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  usersToDeactivate: number;
  usersWithOtherOrgs: number;
  employeesToDeactivate: number;
  contractsToDeactivate: number;
  superAdminsToReassign: number;
  fallbackOrgId: string | null;
  fallbackOrgName: string | null;
  canDeactivate: boolean;
};

type ReactivatePreview = {
  mode: "reactivate";
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  usersToReactivate: number;
  employeesToReactivate: number;
  contractsToReactivate: number;
  usesFallbackContracts: boolean;
};

type PurgePreview = {
  mode: "purge";
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  usersToDelete: number;
  usersWithOtherOrgs: number;
  employeesToDelete: number;
  contractsToDelete: number;
  storedFilesTotal: number;
  storedFilesBlocked: number;
  storedFilesLegalHold: number;
  storedFilesRetention: number;
  superAdminsToDelete: number;
  remainingSuperAdmins: number;
  canPurge: boolean;
  blockReason: string | null;
};

type OrganizationLifecyclePreview = DeactivatePreview | ReactivatePreview | PurgePreview;

interface OrganizationLifecycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: OrganizationLifecycleMode | null;
  organization: OrganizationItem | null;
  onCompleted: () => void;
}

const MODE_CONTENT: Record<OrganizationLifecycleMode, { title: string; description: string; confirmLabel: string }> = {
  deactivate: {
    title: "Dar de baja organización",
    description: "Desactiva acceso, empleados y usuarios principales de la organización.",
    confirmLabel: "Dar de baja",
  },
  reactivate: {
    title: "Reactivar organización",
    description: "Reactivará usuarios, empleados y contratos asociados.",
    confirmLabel: "Reactivar",
  },
  purge: {
    title: "Limpiar organización (hard)",
    description: "Elimina definitivamente todos los datos de la organización.",
    confirmLabel: "Limpiar definitivamente",
  },
};

export function OrganizationLifecycleDialog({
  open,
  onOpenChange,
  mode,
  organization,
  onCompleted,
}: OrganizationLifecycleDialogProps) {
  const [preview, setPreview] = useState<OrganizationLifecyclePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!open || !organization || !mode) {
      setPreview(null);
      setConfirmText("");
      return;
    }

    const action =
      mode === "deactivate" ? "preview-deactivate" : mode === "reactivate" ? "preview-reactivate" : "preview-purge";

    setIsLoading(true);
    setPreview(null);

    const run = async () => {
      try {
        const response = await fetch("/api/admin/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            data: { id: organization.id },
          }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const errorMessage = payload && payload.error ? payload.error : "No se pudo cargar el resumen";
          throw new Error(errorMessage);
        }

        setPreview(payload.preview as OrganizationLifecyclePreview);
      } catch (error) {
        console.error("Error loading organization lifecycle preview", error);
        toast.error(error instanceof Error ? error.message : "No se pudo cargar el resumen");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [open, organization, mode]);

  const content = mode ? MODE_CONTENT[mode] : MODE_CONTENT.deactivate;
  const isPurge = mode === "purge";
  const isDeactivate = mode === "deactivate";
  const confirmLabel = isSubmitting ? "Procesando..." : content.confirmLabel;
  const organizationName = organization?.name ?? "";
  const isNameMatch = confirmText.trim() === organizationName;
  const canSubmit = useMemo(() => {
    if (!preview) return false;

    if (preview.mode === "deactivate") {
      return preview.canDeactivate;
    }

    if (preview.mode === "purge") {
      return preview.canPurge && isNameMatch;
    }

    return true;
  }, [preview, isNameMatch]);

  if (!mode || !organization) {
    return null;
  }

  const handleConfirm = async () => {
    if (!organization || !mode) return;

    setIsSubmitting(true);
    const action = mode === "deactivate" ? "deactivate" : mode === "reactivate" ? "reactivate" : "purge";

    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          data: { id: organization.id },
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = payload && payload.error ? payload.error : "No se pudo completar la acción";
        throw new Error(errorMessage);
      }

      const successMessage =
        mode === "deactivate"
          ? "Organización dada de baja"
          : mode === "reactivate"
            ? "Organización reactivada"
            : "Organización eliminada definitivamente";

      toast.success(successMessage);
      onCompleted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error executing organization lifecycle action", error);
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando resumen...
          </div>
        ) : (
          <>
            {preview && preview.mode === "deactivate" && (
              <Alert variant={preview.canDeactivate ? "default" : "destructive"}>
                <AlertTriangle />
                <AlertTitle>Impacto de la baja</AlertTitle>
                <AlertDescription>
                  <p>Los usuarios principales quedarán inactivos aunque pertenezcan a otras empresas.</p>
                  {preview.usersWithOtherOrgs > 0 ? (
                    <p>{preview.usersWithOtherOrgs} usuarios tienen acceso adicional en otras organizaciones.</p>
                  ) : null}
                  {preview.superAdminsToReassign > 0 ? (
                    <p>
                      Se reasignarán {preview.superAdminsToReassign} superadmins a{" "}
                      {preview.fallbackOrgName ?? "otra organización activa"}.
                    </p>
                  ) : null}
                  {!preview.canDeactivate ? <p>Requiere otra organización activa para reasignar superadmins.</p> : null}
                </AlertDescription>
              </Alert>
            )}

            {preview && preview.mode === "reactivate" && (
              <Alert>
                <ShieldAlert />
                <AlertTitle>Reactivación total</AlertTitle>
                <AlertDescription>
                  <p>Se reactivarán usuarios, empleados y contratos asociados a la organización.</p>
                  {preview.usesFallbackContracts ? (
                    <p>No se encontró un registro previo, se reactivarán todos los contratos inactivos.</p>
                  ) : null}
                </AlertDescription>
              </Alert>
            )}

            {preview && preview.mode === "purge" && (
              <Alert variant={preview.canPurge ? "default" : "destructive"}>
                <Trash2 />
                <AlertTitle>Eliminación irreversible</AlertTitle>
                <AlertDescription>
                  <p>Se borrarán datos, usuarios principales y archivos físicos de storage.</p>
                  {preview.usersWithOtherOrgs > 0 ? (
                    <p>{preview.usersWithOtherOrgs} usuarios también desaparecerán de otras empresas.</p>
                  ) : null}
                  {preview.blockReason ? <p>{preview.blockReason}</p> : null}
                </AlertDescription>
              </Alert>
            )}

            {preview ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {preview.mode === "deactivate" && (
                    <>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Usuarios a inactivar</p>
                        <p className="text-2xl font-semibold">{preview.usersToDeactivate}</p>
                        <p className="text-muted-foreground text-xs">
                          {preview.usersWithOtherOrgs} con acceso en otras orgs
                        </p>
                      </Card>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Empleados a dar de baja</p>
                        <p className="text-2xl font-semibold">{preview.employeesToDeactivate}</p>
                      </Card>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Contratos activos</p>
                        <p className="text-2xl font-semibold">{preview.contractsToDeactivate}</p>
                      </Card>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Superadmins a reasignar</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-semibold">{preview.superAdminsToReassign}</p>
                          {preview.superAdminsToReassign > 0 ? (
                            <Badge variant="outline">{preview.fallbackOrgName ?? "Otra org"}</Badge>
                          ) : null}
                        </div>
                      </Card>
                    </>
                  )}

                  {preview.mode === "reactivate" && (
                    <>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Usuarios a reactivar</p>
                        <p className="text-2xl font-semibold">{preview.usersToReactivate}</p>
                      </Card>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Empleados a reactivar</p>
                        <p className="text-2xl font-semibold">{preview.employeesToReactivate}</p>
                      </Card>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Contratos a reactivar</p>
                        <p className="text-2xl font-semibold">{preview.contractsToReactivate}</p>
                      </Card>
                    </>
                  )}

                  {preview.mode === "purge" && (
                    <>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Usuarios a eliminar</p>
                        <p className="text-2xl font-semibold">{preview.usersToDelete}</p>
                        <p className="text-muted-foreground text-xs">
                          {preview.usersWithOtherOrgs} con acceso en otras orgs
                        </p>
                      </Card>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Empleados a eliminar</p>
                        <p className="text-2xl font-semibold">{preview.employeesToDelete}</p>
                      </Card>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Contratos a eliminar</p>
                        <p className="text-2xl font-semibold">{preview.contractsToDelete}</p>
                      </Card>
                      <Card className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Archivos en storage</p>
                        <p className="text-2xl font-semibold">{preview.storedFilesTotal}</p>
                        <p className="text-muted-foreground text-xs">Bloqueados: {preview.storedFilesBlocked}</p>
                      </Card>
                      <Card className="rounded-lg border p-4 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Retenciones / legal hold</span>
                          <Badge variant={preview.storedFilesBlocked > 0 ? "destructive" : "outline"}>
                            {preview.storedFilesLegalHold} legal hold · {preview.storedFilesRetention} retencion
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm">
                          Superadmins a eliminar: <strong>{preview.superAdminsToDelete}</strong>
                        </div>
                      </Card>
                    </>
                  )}
                </div>

                {isPurge ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Escribe el nombre de la organización para confirmar:</p>
                      <Input
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        placeholder={organization.name}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" />
                No se pudo cargar el resumen de impacto.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                variant={isDeactivate || isPurge ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={!canSubmit || isSubmitting}
              >
                {confirmLabel}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
