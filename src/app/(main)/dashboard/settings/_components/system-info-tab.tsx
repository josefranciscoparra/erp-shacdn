"use client";

import { Fragment, useState } from "react";

import Link from "next/link";

import { Role } from "@prisma/client";
import { Shield, Users, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_PERMISSIONS } from "@/services/permissions";

const roleInfo: Record<
  Role,
  { label: string; description: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Acceso total al sistema, gestión multi-organización",
    variant: "destructive",
  },
  ORG_ADMIN: {
    label: "Administrador",
    description: "Gestión completa de la organización",
    variant: "default",
  },
  HR_ADMIN: {
    label: "RRHH",
    description: "Gestión de recursos humanos",
    variant: "secondary",
  },
  HR_ASSISTANT: {
    label: "Asistente RRHH",
    description: "Asistente de RRHH con acceso operativo (sin datos sensibles)",
    variant: "secondary",
  },
  MANAGER: {
    label: "Manager",
    description: "Supervisor de equipo, acceso limitado",
    variant: "outline",
  },
  EMPLOYEE: {
    label: "Empleado",
    description: "Acceso básico, solo su información",
    variant: "outline",
  },
};

const permissionLabels: Record<string, string> = {
  view_employees: "Ver empleados",
  manage_employees: "Gestionar empleados",
  view_departments: "Ver departamentos",
  manage_departments: "Gestionar departamentos",
  view_cost_centers: "Ver centros de coste",
  manage_cost_centers: "Gestionar centros de coste",
  view_positions: "Ver puestos de trabajo",
  manage_positions: "Gestionar puestos",
  view_contracts: "Ver contratos",
  manage_contracts: "Gestionar contratos",
  view_documents: "Ver documentos",
  manage_documents: "Gestionar documentos",
  view_reports: "Ver reportes",
  manage_organization: "Gestionar organización",
  view_own_profile: "Ver perfil propio",
  edit_own_profile: "Editar perfil propio",
  view_own_documents: "Ver documentos propios",
  view_payroll: "Ver nóminas",
  view_own_payslips: "Ver mis nóminas",
  manage_payroll: "Gestionar nóminas",
  manage_payslips: "Gestionar lotes de nóminas",
};

export function SystemInfoTab() {
  const [expandedRole, setExpandedRole] = useState<Role | null>(null);

  const toggleRole = (role: Role) => {
    setExpandedRole(expandedRole === role ? null : role);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Información de roles */}
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Roles y permisos del sistema</h3>
              <p className="text-muted-foreground text-sm">Información sobre los roles disponibles y sus permisos</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Permisos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(roleInfo) as Role[]).map((role) => {
                  const info = roleInfo[role];
                  const permissions = ROLE_PERMISSIONS[role];
                  const isExpanded = expandedRole === role;

                  return (
                    <Fragment key={role}>
                      <TableRow className="cursor-pointer" onClick={() => toggleRole(role)}>
                        <TableCell>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell>
                          <Badge variant={info.variant}>{info.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{info.description}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{permissions.length}</Badge>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/50">
                            <div className="space-y-2 py-2">
                              <p className="text-sm font-medium">Permisos de {info.label}:</p>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {permissions.map((permission) => (
                                  <div
                                    key={permission}
                                    className="bg-background flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                                  >
                                    <div className="bg-primary/10 h-1.5 w-1.5 rounded-full" />
                                    {permissionLabels[permission] || permission}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Gestión de usuarios */}
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Gestión de usuarios</h3>
              <p className="text-muted-foreground text-sm">Administra los usuarios y sus roles en el sistema</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Panel de administración de usuarios</p>
              <p className="text-muted-foreground text-sm">Crear, editar y gestionar usuarios del sistema</p>
            </div>
            <Button variant="outline" disabled>
              Ir a usuarios
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
