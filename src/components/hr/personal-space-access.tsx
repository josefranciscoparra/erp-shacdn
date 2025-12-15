"use client";

import { AlertTriangle, Building2, RefreshCw, Shield } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { SwitchToEmployeeOrgButton } from "./switch-to-employee-org-button";

interface PersonalSpaceWrongOrgProps {
  employeeOrgId: string;
  employeeOrgName: string;
  viewingOrgName: string;
}

export function PersonalSpaceWrongOrgNotice({
  employeeOrgId,
  employeeOrgName,
  viewingOrgName,
}: PersonalSpaceWrongOrgProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-xl border border-dashed p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="max-w-lg space-y-4">
        <h2 className="text-xl font-semibold">Estás gestionando otra empresa</h2>

        <div className="space-y-2">
          <p className="text-muted-foreground">
            Actualmente tienes seleccionada{" "}
            <Badge variant="outline" className="mx-1">
              {viewingOrgName}
            </Badge>{" "}
            pero tu espacio personal está en{" "}
            <Badge variant="default" className="mx-1">
              {employeeOrgName}
            </Badge>
          </p>
        </div>
      </div>

      <Alert className="max-w-lg border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
        <RefreshCw className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Tus fichajes, vacaciones y nóminas están en {employeeOrgName}
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Para acceder a tu espacio personal, cambia a tu empresa con el botón de abajo
        </AlertDescription>
      </Alert>

      <SwitchToEmployeeOrgButton employeeOrgId={employeeOrgId} employeeOrgName={employeeOrgName} />
    </div>
  );
}

interface PersonalSpaceNoEmployeeNoticeProps {
  userRole?: string;
}

export function PersonalSpaceNoEmployeeNotice({ userRole = "USUARIO" }: PersonalSpaceNoEmployeeNoticeProps) {
  const isAdmin = ["SUPER_ADMIN", "ORG_ADMIN"].includes(userRole);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-xl border border-dashed p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Shield className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="max-w-md space-y-3">
        <h2 className="text-xl font-semibold">Usuario sin ficha de empleado</h2>
        <p className="text-muted-foreground">
          Tu cuenta tiene rol de <Badge variant="secondary">{userRole}</Badge> pero no tiene una ficha de empleado
          asociada.
        </p>
        <p className="text-muted-foreground text-sm">
          {isAdmin
            ? "Como administrador, puedes gestionar la organización pero no tienes acceso a las funciones de empleado como fichajes, vacaciones o gastos."
            : "Para acceder a esta sección necesitas tener una ficha de empleado. Contacta con tu administrador de recursos humanos."}
        </p>
      </div>

      <Alert className="max-w-md border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Sección no disponible</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Las funciones de &quot;Mi espacio&quot; (fichajes, vacaciones, gastos, nóminas) requieren una ficha de
          empleado activa en el sistema.
        </AlertDescription>
      </Alert>
    </div>
  );
}
