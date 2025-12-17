"use client";

import { Activity, Building2, Database, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { OrganizationItem } from "./types";

interface StatsCardsProps {
  organizations: OrganizationItem[];
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(1)} ${units[exponent]}`;
}

export function StatsCards({ organizations }: StatsCardsProps) {
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.active).length;
  const totalUsers = organizations.reduce((acc, curr) => acc + (curr._count?.users ?? 0), 0);
  const totalEmployees = organizations.reduce((acc, curr) => acc + (curr._count?.employees ?? 0), 0);
  const totalStorage = organizations.reduce((acc, curr) => acc + (curr.storageUsedBytes ?? 0), 0);
  const totalLimit = organizations.reduce((acc, curr) => acc + (curr.storageLimitBytes ?? 0), 0);

  const storagePercent = totalLimit > 0 ? (totalStorage / totalLimit) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Organizaciones</CardTitle>
          <Building2 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalOrgs}</div>
          <p className="text-muted-foreground text-xs">{activeOrgs} activas actualmente</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers}</div>
          <p className="text-muted-foreground text-xs">{totalEmployees} perfiles de empleado</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
          <Database className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBytes(totalStorage)}</div>
          <div className="mt-1 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(storagePercent, 100)}%` }} />
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {formatBytes(totalLimit)} disponibles ({storagePercent.toFixed(1)}%)
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Salud del Sistema</CardTitle>
          <Activity className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">100%</div>
          <p className="text-muted-foreground text-xs">Todos los sistemas operativos</p>
        </CardContent>
      </Card>
    </div>
  );
}
