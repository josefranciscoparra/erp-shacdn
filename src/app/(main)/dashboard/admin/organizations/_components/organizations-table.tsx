"use client";

import { Building2, Loader2, Pencil, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { OrganizationItem } from "./types";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

interface OrganizationRowProps {
  organization: OrganizationItem;
  onEdit: (organization: OrganizationItem) => void;
  onSetup: (organization: OrganizationItem) => void;
}

function OrganizationRow({ organization, onEdit, onSetup }: OrganizationRowProps) {
  const statusVariant = organization.active ? ("secondary" as const) : ("outline" as const);
  const departmentCount = organization._count?.departments ?? 0;
  const costCenterCount = organization._count?.costCenters ?? 0;
  const scheduleCount = organization._count?.scheduleTemplates ?? 0;
  const limitBytes = Math.max(organization.storageLimitBytes, 1);
  const usagePercent = Math.min((organization.storageUsedBytes / limitBytes) * 100, 999);

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{organization.name}</span>
          <span className="text-muted-foreground text-xs">ID: {organization.id}</span>
        </div>
        <div className="text-muted-foreground mt-2 text-xs">
          <p>
            Prefijo empleados:{" "}
            {organization.employeeNumberPrefix ? (
              <span className="text-foreground font-medium">{organization.employeeNumberPrefix}</span>
            ) : (
              <span className="text-destructive">Pendiente</span>
            )}
          </p>
          <p>Vacaciones anuales: {organization.annualPtoDays} días</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {organization.allowedEmailDomains.length > 0 ? (
              organization.allowedEmailDomains.map((domain) => (
                <span key={domain} className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]">
                  @{domain}
                </span>
              ))
            ) : (
              <span className="text-destructive/80 text-[11px]">Sin dominios de email configurados</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>{organization.vat ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={statusVariant}>{organization.active ? "Activa" : "Inactiva"}</Badge>
      </TableCell>
      <TableCell className="text-right">{organization._count?.users ?? 0}</TableCell>
      <TableCell className="text-right">{organization._count?.employees ?? 0}</TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Badge variant={departmentCount > 0 ? "secondary" : "outline"} className="text-[11px]">
            Deptos {departmentCount}
          </Badge>
          <Badge variant={costCenterCount > 0 ? "secondary" : "outline"} className="text-[11px]">
            Centros {costCenterCount}
          </Badge>
          <Badge variant={scheduleCount > 0 ? "secondary" : "outline"} className="text-[11px]">
            Horarios {scheduleCount}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold">
            {formatBytes(organization.storageUsedBytes)} / {formatBytes(organization.storageLimitBytes)}
          </span>
          <div className="bg-muted relative h-1.5 w-28 rounded-full">
            <div
              className={`${usagePercent > 85 ? "bg-destructive" : "bg-primary"} absolute inset-y-0 left-0 rounded-full`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <span className="text-muted-foreground text-[11px]">{Math.round(usagePercent)}% usado</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSetup(organization)}
                  aria-label={`Checklist de ${organization.name}`}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Checklist de arranque</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(organization)}
            aria-label={`Editar ${organization.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface OrganizationsTableProps {
  organizations: OrganizationItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onEdit: (organization: OrganizationItem) => void;
  onSetup: (organization: OrganizationItem) => void;
}

export function OrganizationsTable({
  organizations,
  isLoading,
  error,
  onRetry,
  onEdit,
  onSetup,
}: OrganizationsTableProps) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando organizaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-destructive text-sm">{error}</p>
        <Button onClick={onRetry} size="sm" variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Building2 className="text-muted-foreground h-12 w-12" />
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium">No hay organizaciones</p>
          <p className="text-muted-foreground text-xs">
            Crea una nueva organización para empezar a trabajar en el sistema
          </p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-10">Organización</TableHead>
          <TableHead className="h-10">NIF/CIF</TableHead>
          <TableHead className="h-10">Estado</TableHead>
          <TableHead className="h-10 text-right">Usuarios</TableHead>
          <TableHead className="h-10 text-right">Empleados</TableHead>
          <TableHead className="h-10 text-right">Catálogos</TableHead>
          <TableHead className="h-10 text-right">Storage</TableHead>
          <TableHead className="h-10 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((organization) => (
          <OrganizationRow key={organization.id} organization={organization} onEdit={onEdit} onSetup={onSetup} />
        ))}
      </TableBody>
    </Table>
  );
}
