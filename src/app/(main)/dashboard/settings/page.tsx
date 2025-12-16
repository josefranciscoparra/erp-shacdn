"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUserRole } from "@/server/actions/get-current-user-role";

import { AbsenceTypesTab } from "./_components/absence-types-tab";
import { AdminTab } from "./_components/admin-tab";
import { ChatTab } from "./_components/chat-tab";
import { ExpensesTab } from "./_components/expenses-tab";
import { GeolocationTab } from "./_components/geolocation-tab";
import { OrganizationTab } from "./_components/organization-tab";
import { ShiftsTab } from "./_components/shifts-tab";
import { StorageTab } from "./_components/storage-tab";
import { SystemInfoTab } from "./_components/system-info-tab";
import { TimeBankTab } from "./_components/time-bank-tab";
import { TimeClockValidationsTab } from "./_components/time-clock-validations-tab";
import { WhistleblowingTab } from "./_components/whistleblowing-tab";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    getCurrentUserRole().then((role) => {
      setIsSuperAdmin(role === "SUPER_ADMIN");
    });
  }, []);

  const tabs = useMemo(
    () => [
      { value: "organization", label: "Organización" },
      { value: "absence-types", label: "Tipos de Ausencia" },
      { value: "chat", label: "Chat" },
      { value: "shifts", label: "Turnos" },
      { value: "whistleblowing", label: "Denuncias" },
      { value: "geolocation", label: "Geolocalización" },
      { value: "validations", label: "Fichajes" },
      { value: "time-bank", label: "Bolsa Horas" },
      { value: "expenses", label: "Gastos" },
      { value: "storage", label: "Storage" },
      { value: "system", label: "Sistema" },
      ...(isSuperAdmin ? [{ value: "admin", label: "Admin" }] : []),
    ],
    [isSuperAdmin],
  );

  const initialTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((tab) => tab.value === tabParam)) {
      return tabParam;
    }
    return "organization";
  }, [searchParams, tabs]);

  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("tab", value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <PermissionGuard
      permission="manage_organization"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Configuración" subtitle="Gestiona las preferencias de tu organización" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para acceder a la configuración"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Configuración" subtitle="Gestiona las preferencias de tu organización" />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between gap-4">
            {/* Select para móvil */}
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full @4xl/main:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tabs para desktop */}
            <TabsList className="hidden @4xl/main:flex">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="organization" className="mt-4 md:mt-6">
            <OrganizationTab />
          </TabsContent>

          <TabsContent value="absence-types" className="mt-4 md:mt-6">
            <AbsenceTypesTab />
          </TabsContent>

          <TabsContent value="chat" className="mt-4 md:mt-6">
            <ChatTab />
          </TabsContent>

          <TabsContent value="shifts" className="mt-4 md:mt-6">
            <ShiftsTab />
          </TabsContent>

          <TabsContent value="whistleblowing" className="mt-4 md:mt-6">
            <WhistleblowingTab />
          </TabsContent>

          <TabsContent value="geolocation" className="mt-4 md:mt-6">
            <GeolocationTab />
          </TabsContent>

          <TabsContent value="validations" className="mt-4 md:mt-6">
            <TimeClockValidationsTab />
          </TabsContent>

          <TabsContent value="time-bank" className="mt-4 md:mt-6">
            <TimeBankTab />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4 md:mt-6">
            <ExpensesTab />
          </TabsContent>

          <TabsContent value="storage" className="mt-4 md:mt-6">
            <StorageTab />
          </TabsContent>

          <TabsContent value="system" className="mt-4 md:mt-6">
            <SystemInfoTab />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="admin" className="mt-4 md:mt-6">
              <AdminTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
