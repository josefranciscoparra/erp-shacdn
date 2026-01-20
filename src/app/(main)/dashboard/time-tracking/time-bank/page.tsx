"use client";

import { useEffect, useMemo, useState } from "react";

import { ClipboardList, PiggyBank, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTimeBankOrganizationOptions } from "@/server/actions/time-bank";

import { TimeBankAdminPanel } from "./_components/time-bank-admin-panel";
import { TimeBankStats } from "./_components/time-bank-stats";

export default function TimeBankAdminPage() {
  const [activeTab, setActiveTab] = useState("requests");
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrganization, setSelectedOrganization] = useState("all");

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const data = await getTimeBankOrganizationOptions();
        setOrganizations(data);
        setSelectedOrganization((prev) => {
          if (data.length === 0) {
            return "all";
          }
          if (prev !== "all" && data.some((org) => org.id === prev)) {
            return prev;
          }
          return data.length > 1 ? "all" : data[0].id;
        });
      } catch (error) {
        console.error("Error al cargar organizaciones de bolsa:", error);
        setOrganizations([]);
        setSelectedOrganization("all");
      }
    };

    loadOrganizations();
  }, []);

  const orgIds = useMemo(() => {
    if (selectedOrganization === "all") {
      return organizations.map((org) => org.id);
    }
    return selectedOrganization ? [selectedOrganization] : [];
  }, [organizations, selectedOrganization]);
  const showOrgBadges = selectedOrganization === "all";

  return (
    <PermissionGuard
      permission="approve_requests"
      fallback={
        <div className="@container/main flex flex-col gap-6">
          <SectionHeader
            title="Bolsa de Horas"
            description="Gestiona solicitudes y saldos de la bolsa de horas de la organización."
          />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para revisar solicitudes de bolsa de horas"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-6">
        <SectionHeader
          title="Bolsa de Horas"
          description="Gestiona solicitudes y saldos de la bolsa de horas de la organización."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto sm:grid-cols-none">
              <TabsTrigger value="requests" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Solicitudes</span>
                <span className="sm:hidden">Solicitudes</span>
              </TabsTrigger>
              <TabsTrigger value="balances" className="gap-2">
                <PiggyBank className="h-4 w-4" />
                <span className="hidden sm:inline">Saldos por Empleado</span>
                <span className="sm:hidden">Saldos</span>
              </TabsTrigger>
            </TabsList>
            {organizations.length > 1 && (
              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Selecciona empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las organizaciones</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="requests" className="mt-6">
            <TimeBankAdminPanel orgIds={orgIds} showOrgBadges={showOrgBadges} />
          </TabsContent>

          <TabsContent value="balances" className="mt-6">
            <TimeBankStats orgIds={orgIds} showOrgBadges={showOrgBadges} />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
