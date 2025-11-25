"use client";

import { useState } from "react";

import { ClipboardList, PiggyBank } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TimeBankAdminPanel } from "./_components/time-bank-admin-panel";
import { TimeBankStats } from "./_components/time-bank-stats";

export default function TimeBankAdminPage() {
  const [activeTab, setActiveTab] = useState("requests");

  return (
    <div className="@container/main flex flex-col gap-6">
      <SectionHeader
        title="Bolsa de Horas"
        description="Gestiona solicitudes y saldos de la bolsa de horas de la organización."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

        <TabsContent value="requests" className="mt-6">
          <TimeBankAdminPanel />
        </TabsContent>

        <TabsContent value="balances" className="mt-6">
          <TimeBankStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
