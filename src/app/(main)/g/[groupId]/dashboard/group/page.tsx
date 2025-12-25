"use client";

import { useEffect, useMemo, useState } from "react";

import { useParams } from "next/navigation";

import { type Role } from "@prisma/client";
import { Building2, Loader2, ShieldAlert, Users } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getOrganizationGroupOverview,
  listGroupMembersForViewer,
  listGroupOrganizationsForViewer,
  type GroupMemberSummary,
  type GroupOrganizationSummary,
} from "@/server/actions/organization-groups-view";

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Org",
  HR_ADMIN: "Admin RRHH",
  HR_ASSISTANT: "Asistente RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

const STATUS_LABELS: Record<GroupOrganizationSummary["status"], string> = {
  ACTIVE: "Activa",
  PENDING: "Pendiente",
  REJECTED: "Rechazada",
};

const STATUS_COLORS: Record<GroupOrganizationSummary["status"], string> = {
  ACTIVE: "bg-green-500/10 text-green-700 dark:text-green-300",
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export default function GroupOverviewPage() {
  const params = useParams<{ groupId?: string }>();
  const rawGroupId = params?.groupId;
  const groupId = useMemo(() => (Array.isArray(rawGroupId) ? rawGroupId[0] : rawGroupId), [rawGroupId]);

  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getOrganizationGroupOverview>>["data"] | null>(
    null,
  );
  const [organizations, setOrganizations] = useState<GroupOrganizationSummary[]>([]);
  const [members, setMembers] = useState<GroupMemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("organizations");

  useEffect(() => {
    if (!groupId) return;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const [overviewResult, orgsResult, membersResult] = await Promise.all([
          getOrganizationGroupOverview(groupId),
          listGroupOrganizationsForViewer(groupId),
          listGroupMembersForViewer(groupId),
        ]);

        if (!overviewResult.success) {
          setError(overviewResult.error ?? "No se pudo cargar el grupo");
          return;
        }
        if (!overviewResult.data) {
          setError("No se pudo cargar el grupo");
          return;
        }

        setOverview(overviewResult.data);
        setOrganizations(orgsResult.organizations ?? []);
        setMembers(membersResult.members ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el grupo");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [groupId]);

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Grupo" subtitle="Resumen del grupo seleccionado" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando grupo...</span>
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Grupo" subtitle="Resumen del grupo seleccionado" />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="No se pudo cargar el grupo"
          description={error ?? "No tienes acceso al grupo."}
        />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Grupo" subtitle="Resumen del grupo seleccionado" />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="No se pudo cargar el grupo"
          description="No tienes acceso al grupo."
        />
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title={overview.name}
        subtitle={overview.description ?? "Sin descripción"}
        badge={
          <Badge variant="outline">
            {overview.viewerRole ? `Tu rol: ${ROLE_DISPLAY_NAMES[overview.viewerRole]}` : "Super Admin"}
          </Badge>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col gap-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="organizations">
            Empresas <Badge variant="secondary">{organizations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="members">
            Miembros <Badge variant="secondary">{members.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Empresa</TableHead>
                  <TableHead className="w-[160px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground text-sm">
                      Este grupo aún no tiene empresas.
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[org.status]}>
                          {STATUS_LABELS[org.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Usuario</TableHead>
                  <TableHead className="w-[180px]">Rol</TableHead>
                  <TableHead className="w-[120px] text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground text-sm">
                      No hay miembros asignados.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id} className={!member.isActive ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-muted-foreground text-xs">{member.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_DISPLAY_NAMES[member.role]}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {member.isActive ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300">
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {overview.viewerRole ? (
        <div className="rounded-lg border px-4 py-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
              <Users className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Este es tu contexto de grupo</p>
              <p className="text-muted-foreground text-xs">
                Los permisos de grupo se aplican sobre todas las empresas listadas arriba.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border px-4 py-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Vista global (Super Admin)</p>
              <p className="text-muted-foreground text-xs">Estás viendo el resumen completo del grupo.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
