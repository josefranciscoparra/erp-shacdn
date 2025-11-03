"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Crown, Receipt, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmployeeApprover } from "@/server/actions/expense-approvers";

import { SetEmployeeApproverDialog } from "./set-employee-approver-dialog";

type Approver = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
};

type OrganizationalApprover = {
  id: string;
  isPrimary: boolean;
  order: number;
  user: Approver;
};

type Props = {
  employeeId: string;
  employeeName: string;
};

export function EmployeeExpenseApprover({ employeeId, employeeName }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [approverType, setApproverType] = useState<"specific" | "organizational" | null>(null);
  const [specificApprover, setSpecificApprover] = useState<Approver | null>(null);
  const [organizationalApprovers, setOrganizationalApprovers] = useState<OrganizationalApprover[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadApprover = async () => {
    try {
      setIsLoading(true);
      const result = await getEmployeeApprover(employeeId);

      if (result.success) {
        setApproverType(result.type);

        if (result.type === "specific" && "approver" in result) {
          setSpecificApprover(result.approver);
          setOrganizationalApprovers([]);
        } else if (result.type === "organizational" && "approvers" in result) {
          setSpecificApprover(null);
          setOrganizationalApprovers(result.approvers);
        }
      } else {
        toast.error(result.error ?? "Error al cargar aprobador");
      }
    } catch (error) {
      console.error("Error loading approver:", error);
      toast.error("Error al cargar aprobador");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadApprover();
  }, [employeeId]);

  const handleApproverChanged = () => {
    setIsDialogOpen(false);
    void loadApprover();
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
      <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            <Receipt className="mr-2 inline h-5 w-5" />
            Aprobador de Gastos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (organizationalApprovers.length === 0 && !specificApprover) {
    return (
      <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            <Receipt className="mr-2 inline h-5 w-5" />
            Aprobador de Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No hay aprobadores configurados</AlertTitle>
            <AlertDescription>
              No se han configurado aprobadores de gastos en la organización. Por favor, configura al menos un aprobador
              en la configuración de la organización.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              <Receipt className="mr-2 inline h-5 w-5" />
              Aprobador de Gastos
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
              <UserCheck className="mr-2 h-4 w-4" />
              Cambiar aprobador
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {approverType === "specific" && specificApprover ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="default">Aprobador Específico</Badge>
                <p className="text-muted-foreground text-sm">
                  Este empleado tiene un aprobador asignado exclusivamente
                </p>
              </div>

              <div className="flex items-center gap-4 rounded-lg border p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={specificApprover.image ?? undefined} alt={specificApprover.name} />
                  <AvatarFallback>
                    {specificApprover.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{specificApprover.name}</span>
                    <Badge variant={getRoleBadgeVariant(specificApprover.role)}>
                      {getRoleLabel(specificApprover.role)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{specificApprover.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="secondary">Aprobadores Organizacionales</Badge>
                <p className="text-muted-foreground text-sm">
                  Este empleado usa los aprobadores generales de la organización
                </p>
              </div>

              <div className="space-y-3">
                {organizationalApprovers.map((approver) => (
                  <div key={approver.id} className="flex items-center gap-4 rounded-lg border p-4">
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

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{approver.user.name}</span>
                        {approver.isPrimary && (
                          <Badge variant="default" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Primario
                          </Badge>
                        )}
                        <Badge variant={getRoleBadgeVariant(approver.user.role)}>
                          {getRoleLabel(approver.user.role)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">{approver.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SetEmployeeApproverDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        currentApproverId={specificApprover?.id ?? null}
        onApproverChanged={handleApproverChanged}
      />
    </>
  );
}
