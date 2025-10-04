"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/hr/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { ShieldAlert } from "lucide-react";
import { OrganizationTab } from "./_components/organization-tab";
import { SystemInfoTab } from "./_components/system-info-tab";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("organization");

  const tabs = [
    { value: "organization", label: "Organización" },
    { value: "system", label: "Sistema" },
  ];

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
        <SectionHeader
          title="Configuración"
          subtitle="Gestiona las preferencias de tu organización"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4">
            {/* Select para móvil */}
            <Select value={activeTab} onValueChange={setActiveTab}>
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

          <TabsContent value="system" className="mt-4 md:mt-6">
            <SystemInfoTab />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
