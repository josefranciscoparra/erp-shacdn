"use client";

import { Ban, Building2, Loader2, MoreHorizontal, Pencil, RotateCcw, Sparkles, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { OrganizationItem } from "./types";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface OrganizationRowProps {
  organization: OrganizationItem;
  onEdit: (organization: OrganizationItem) => void;
  onSetup: (organization: OrganizationItem) => void;
  onDeactivate: (organization: OrganizationItem) => void;
  onReactivate: (organization: OrganizationItem) => void;
  onPurge: (organization: OrganizationItem) => void;
}

function OrganizationRow({ organization, onEdit, onSetup, onDeactivate, onReactivate, onPurge }: OrganizationRowProps) {
  const limitBytes = Math.max(organization.storageLimitBytes, 1);
  const usagePercent = Math.min((organization.storageUsedBytes / limitBytes) * 100, 100);
  const isDangerUsage = usagePercent > 85;

  return (
    <TableRow className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50">
      <TableCell className="w-[300px] py-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 border shadow-sm">
            <AvatarImage src={`/api/organizations/${organization.id}/logo`} alt={organization.name} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white">
              {getInitials(organization.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{organization.name}</span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
              <span className="max-w-[120px] truncate">{organization.id}</span>
              {organization.active ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
                  Activa
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-500/10 ring-inset">
                  Inactiva
                </span>
              )}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell className="py-4 align-top">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{organization.vat ?? "—"}</div>
          <div className="flex flex-wrap gap-1">
            {organization.allowedEmailDomains.length > 0 ? (
              organization.allowedEmailDomains.slice(0, 2).map((domain) => (
                <Badge key={domain} variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                  @{domain}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">Sin dominio</span>
            )}
            {organization.allowedEmailDomains.length > 2 && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                +{organization.allowedEmailDomains.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="py-4">
        <div className="flex flex-col gap-2">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-500">Almacenamiento</span>
            <span className={cn("font-medium", isDangerUsage ? "text-red-600" : "text-slate-700 dark:text-slate-300")}>
              {Math.round(usagePercent)}%
            </span>
          </div>
          <Progress value={usagePercent} className="h-1.5" indicatorClassName={cn(isDangerUsage && "bg-red-500")} />
          <div className="text-right text-[10px] text-slate-400">
            {formatBytes(organization.storageUsedBytes)} / {formatBytes(organization.storageLimitBytes)}
          </div>
        </div>
      </TableCell>

      <TableCell className="py-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              {organization._count?.users ?? 0}
            </span>
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Usuarios</span>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              {organization._count?.employees ?? 0}
            </span>
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">Empleados</span>
          </div>
        </div>
      </TableCell>

      <TableCell className="py-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={() => onEdit(organization)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetup(organization)}>
              <Sparkles className="mr-2 h-3.5 w-3.5 text-indigo-500" />
              Checklist
            </DropdownMenuItem>
            {organization.active ? (
              <DropdownMenuItem onClick={() => onDeactivate(organization)}>
                <Ban className="mr-2 h-3.5 w-3.5" />
                Dar de baja
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => onReactivate(organization)}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reactivar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPurge(organization)} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Limpiar (hard)
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
  onDeactivate: (organization: OrganizationItem) => void;
  onReactivate: (organization: OrganizationItem) => void;
  onPurge: (organization: OrganizationItem) => void;
}

export function OrganizationsTable({
  organizations,
  isLoading,
  error,
  onRetry,
  onEdit,
  onSetup,
  onDeactivate,
  onReactivate,
  onPurge,
}: OrganizationsTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="animate-pulse text-sm font-medium">Cargando organizaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="rounded-full bg-red-50 p-3">
          <Building2 className="h-6 w-6 text-red-500" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-red-900">Error al cargar datos</p>
          <p className="max-w-[300px] text-sm text-red-600/80">{error}</p>
        </div>
        <Button onClick={onRetry} variant="outline" className="mt-2">
          Reintentar conexión
        </Button>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-slate-50 p-6">
          <Building2 className="h-10 w-10 text-slate-300" />
        </div>
        <div className="max-w-sm space-y-1 text-center">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Sin organizaciones</p>
          <p className="text-sm text-slate-500">
            Comienza creando la primera organización para dar de alta empleados y configurar el entorno.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto bg-white dark:bg-slate-950">
      <Table>
        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
          <TableRow className="border-b border-slate-100 hover:bg-transparent dark:border-slate-800">
            <TableHead className="h-12 w-[300px] font-medium text-slate-500">Organización</TableHead>
            <TableHead className="h-12 font-medium text-slate-500">Detalles Legales</TableHead>
            <TableHead className="h-12 w-[200px] font-medium text-slate-500">Recursos</TableHead>
            <TableHead className="h-12 font-medium text-slate-500">Métricas</TableHead>
            <TableHead className="h-12 w-[50px] text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
          {organizations.map((organization) => (
            <OrganizationRow
              key={organization.id}
              organization={organization}
              onEdit={onEdit}
              onSetup={onSetup}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
              onPurge={onPurge}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
