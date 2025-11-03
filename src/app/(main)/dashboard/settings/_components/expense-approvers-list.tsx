"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Crown, Plus, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrganizationApprovers, setPrimaryApprover } from "@/server/actions/expense-approvers";

import { AddApproverDialog } from "./add-approver-dialog";
import { RemoveApproverDialog } from "./remove-approver-dialog";

type Approver = {
  id: string;
  isPrimary: boolean;
  order: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
  };
};

export function ExpenseApproversList() {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [approverToRemove, setApproverToRemove] = useState<Approver | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null);

  const loadApprovers = async () => {
    try {
      setIsLoading(true);
      const result = await getOrganizationApprovers();

      if (result.success) {
        setApprovers(result.approvers);
      } else {
        toast.error(result.error ?? "Error al cargar aprobadores");
      }
    } catch (error) {
      console.error("Error loading approvers:", error);
      toast.error("Error al cargar aprobadores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadApprovers();
  }, []);

  const handleSetPrimary = async (approverId: string) => {
    try {
      setIsSettingPrimary(approverId);
      const result = await setPrimaryApprover(approverId);

      if (result.success) {
        toast.success("Aprobador primario actualizado");
        await loadApprovers();
      } else {
        toast.error(result.error ?? "Error al actualizar aprobador primario");
      }
    } catch (error) {
      console.error("Error setting primary:", error);
      toast.error("Error al actualizar aprobador primario");
    } finally {
      setIsSettingPrimary(null);
    }
  };

  const handleApproverAdded = () => {
    setIsAddDialogOpen(false);
    void loadApprovers();
  };

  const handleApproverRemoved = () => {
    setApproverToRemove(null);
    void loadApprovers();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
      case "ORG_ADMIN":
        return "default";
      case "HR_ADMIN":
        return "secondary";
      case "MANAGER":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      SUPER_ADMIN: "Super Admin",
      ORG_ADMIN: "Admin Organización",
      HR_ADMIN: "Admin RRHH",
      MANAGER: "Manager",
      EMPLOYEE: "Empleado",
    };
    return labels[role] ?? role;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning si no hay aprobadores */}
      {approvers.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay aprobadores configurados</AlertTitle>
          <AlertDescription>
            Los empleados no podrán enviar gastos a aprobación hasta que configures al menos un aprobador. Haz click en
            &quot;Agregar aprobador&quot; para empezar.
          </AlertDescription>
        </Alert>
      )}

      {/* Cabecera con contador y botón */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {approvers.length === 0
            ? "No hay aprobadores configurados"
            : `${approvers.length} ${approvers.length === 1 ? "aprobador configurado" : "aprobadores configurados"}`}
        </p>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar aprobador
        </Button>
      </div>

      {/* Lista de aprobadores */}
      <div className="space-y-3">
        {approvers.map((approver) => (
          <Card key={approver.id} className="hover:bg-muted/50 p-4 transition-colors">
            <div className="flex items-center justify-between gap-4">
              {/* Info del aprobador */}
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={approver.user.image ?? undefined} alt={approver.user.name} />
                  <AvatarFallback>
                    {approver.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{approver.user.name}</span>
                    {approver.isPrimary && (
                      <Badge variant="default" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Primario
                      </Badge>
                    )}
                    <Badge variant={getRoleBadgeVariant(approver.user.role)}>{getRoleLabel(approver.user.role)}</Badge>
                  </div>
                  <span className="text-muted-foreground text-sm">{approver.user.email}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
                {!approver.isPrimary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetPrimary(approver.id)}
                    disabled={isSettingPrimary === approver.id}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    {isSettingPrimary === approver.id ? "Actualizando..." : "Marcar como primario"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApproverToRemove(approver)}
                  disabled={approvers.length === 1}
                  title={approvers.length === 1 ? "No puedes eliminar el último aprobador" : "Eliminar aprobador"}
                >
                  <Trash2 className="text-destructive h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Dialogs */}
      <AddApproverDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onApproverAdded={handleApproverAdded}
      />

      <RemoveApproverDialog
        approver={approverToRemove}
        onOpenChange={(open) => !open && setApproverToRemove(null)}
        onApproverRemoved={handleApproverRemoved}
      />
    </div>
  );
}
