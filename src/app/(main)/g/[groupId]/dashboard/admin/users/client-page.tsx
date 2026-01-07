"use client";

import { useMemo } from "react";

import type { Role } from "@prisma/client";
import { Building2, Crown, Network, Shield, ShieldCheck, Users, UserCog } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DirectoryUserRow, GroupAdminRow } from "@/server/actions/group-users";

import { GroupOrganizationUsersTable } from "./_components/global-directory-table";
import { GroupAdminsTable } from "./_components/group-admins-table";

interface GroupUsersClientPageProps {
  groupId: string;
  currentUserRole: Role;
  initialAdmins: GroupAdminRow[];
  initialDirectory: DirectoryUserRow[];
  organizations: { id: string; name: string }[];
}

export function GroupUsersClientPage({
  groupId,
  currentUserRole,
  initialAdmins,
  initialDirectory,
  organizations,
}: GroupUsersClientPageProps) {
  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalAdmins = initialAdmins.length;
    const activeAdmins = initialAdmins.filter((a) => a.isActive).length;
    const orgAdmins = initialAdmins.filter((a) => a.role === "ORG_ADMIN").length;
    const hrAdmins = initialAdmins.filter((a) => a.role === "HR_ADMIN" || a.role === "HR_ASSISTANT").length;
    const totalOrgs = organizations.length;

    // Contar usuarios únicos con acceso a alguna empresa
    const uniqueUsers = new Set(initialDirectory.map((u) => u.userId)).size;

    return { totalAdmins, activeAdmins, orgAdmins, hrAdmins, totalOrgs, uniqueUsers };
  }, [initialAdmins, organizations, initialDirectory]);

  return (
    <div className="@container/main flex flex-col gap-6 md:gap-8">
      {/* Header */}
      <SectionHeader
        title="Gestión de usuarios"
        subtitle="Administra los permisos del grupo y los accesos por empresa"
        backButton={{ href: "/dashboard/admin/group-users", label: "Volver a grupos" }}
      />

      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="text-xs @[180px]/card:text-sm">Administradores</CardDescription>
            <div className="bg-primary/10 rounded-md p-1.5 @[180px]/card:p-2">
              <Shield className="text-primary h-3.5 w-3.5 @[180px]/card:h-4 @[180px]/card:w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold tabular-nums @[180px]/card:text-2xl">{stats.totalAdmins}</div>
            <p className="text-muted-foreground mt-0.5 text-[10px] @[180px]/card:text-xs">
              {stats.activeAdmins} activos
            </p>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="text-xs @[180px]/card:text-sm">Org Admins</CardDescription>
            <div className="rounded-md bg-blue-500/10 p-1.5 @[180px]/card:p-2">
              <Crown className="h-3.5 w-3.5 text-blue-500 @[180px]/card:h-4 @[180px]/card:w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold tabular-nums @[180px]/card:text-2xl">{stats.orgAdmins}</div>
            <p className="text-muted-foreground mt-0.5 text-[10px] @[180px]/card:text-xs">control total</p>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="text-xs @[180px]/card:text-sm">HR Admins</CardDescription>
            <div className="rounded-md bg-violet-500/10 p-1.5 @[180px]/card:p-2">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-500 @[180px]/card:h-4 @[180px]/card:w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold tabular-nums @[180px]/card:text-2xl">{stats.hrAdmins}</div>
            <p className="text-muted-foreground mt-0.5 text-[10px] @[180px]/card:text-xs">gestión RRHH</p>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="text-xs @[180px]/card:text-sm">Empresas</CardDescription>
            <div className="rounded-md bg-emerald-500/10 p-1.5 @[180px]/card:p-2">
              <Building2 className="h-3.5 w-3.5 text-emerald-500 @[180px]/card:h-4 @[180px]/card:w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold tabular-nums @[180px]/card:text-2xl">{stats.totalOrgs}</div>
            <p className="text-muted-foreground mt-0.5 text-[10px] @[180px]/card:text-xs">en el grupo</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="admins" className="w-full">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between gap-3">
          {/* Mobile Select */}
          <Label htmlFor="view-selector" className="sr-only">
            Vista
          </Label>
          <Select defaultValue="admins">
            <SelectTrigger className="flex w-fit @xl/main:hidden" size="sm" id="view-selector">
              <SelectValue placeholder="Seleccionar vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admins">
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Administradores ({stats.totalAdmins})
                </div>
              </SelectItem>
              <SelectItem value="organizations">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Por empresa ({stats.uniqueUsers})
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Desktop Tabs */}
          <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @xl/main:flex">
            <TabsTrigger value="admins" className="gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden @2xl/main:inline">Administradores del grupo</span>
              <span className="@2xl/main:hidden">Admins</span>
              <Badge variant="secondary">{stats.totalAdmins}</Badge>
            </TabsTrigger>
            <TabsTrigger value="organizations" className="gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden @2xl/main:inline">Accesos por empresa</span>
              <span className="@2xl/main:hidden">Empresas</span>
              <Badge variant="secondary">{stats.uniqueUsers}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Spacer for alignment */}
          <div className="hidden @xl/main:block" />
        </div>

        {/* Tab Content */}
        <TabsContent value="admins" className="mt-6">
          <GroupAdminsTable data={initialAdmins} groupId={groupId} currentUserRole={currentUserRole} />
        </TabsContent>

        <TabsContent value="organizations" className="mt-6">
          <GroupOrganizationUsersTable
            data={initialDirectory}
            groupId={groupId}
            organizations={organizations}
            currentUserRole={currentUserRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
