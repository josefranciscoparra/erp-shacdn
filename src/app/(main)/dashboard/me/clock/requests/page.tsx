"use client";

import { useState } from "react";

import Link from "next/link";

import { CheckCircle, Clock, PiggyBank } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TimeBankContent } from "../../time-bank/_components/time-bank-content";

import { ManualRequestsContent } from "./_components/manual-requests-content";

export default function MyTimeEntriesPage() {
  const [activeTab, setActiveTab] = useState<"requests" | "timebank">("requests");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 @xl/main:flex-row @xl/main:items-center @xl/main:justify-between">
        <div className="flex items-center gap-3">
          <SectionHeader
            title="Mis Fichajes"
            description="Gestiona tus solicitudes de fichaje manual y tu bolsa de horas."
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="mb-6 grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="requests" className="gap-2">
            <Clock className="h-4 w-4" />
            Solicitudes
          </TabsTrigger>
          <TabsTrigger value="timebank" className="gap-2">
            <PiggyBank className="h-4 w-4" />
            Bolsa de Horas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-0 focus-visible:ring-0 focus-visible:outline-none">
          <ManualRequestsContent />
        </TabsContent>

        <TabsContent value="timebank" className="mt-0 focus-visible:ring-0 focus-visible:outline-none">
          <TimeBankContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
