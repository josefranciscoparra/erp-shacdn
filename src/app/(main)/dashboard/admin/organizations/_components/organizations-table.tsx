"use client";

import { Building2, Loader2, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { OrganizationItem } from "./types";

interface OrganizationRowProps {
  organization: OrganizationItem;
  onEdit: (organization: OrganizationItem) => void;
}

function OrganizationRow({ organization, onEdit }: OrganizationRowProps) {
  const statusVariant = organization.active ? ("secondary" as const) : ("outline" as const);

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{organization.name}</span>
          <span className="text-muted-foreground text-xs">ID: {organization.id}</span>
        </div>
      </TableCell>
      <TableCell>{organization.vat ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={statusVariant}>{organization.active ? "Activa" : "Inactiva"}</Badge>
      </TableCell>
      <TableCell className="text-right">{organization._count?.users ?? 0}</TableCell>
      <TableCell className="text-right">{organization._count?.employees ?? 0}</TableCell>
      <TableCell className="text-right">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(organization)}
          aria-label={`Editar ${organization.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
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
}

export function OrganizationsTable({ organizations, isLoading, error, onRetry, onEdit }: OrganizationsTableProps) {
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
          <TableHead className="h-10 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((organization) => (
          <OrganizationRow key={organization.id} organization={organization} onEdit={onEdit} />
        ))}
      </TableBody>
    </Table>
  );
}
