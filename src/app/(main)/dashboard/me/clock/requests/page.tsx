"use client";

import { useState } from "react";

import { Calendar, PiggyBank } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TimeBankContent } from "../../time-bank/_components/time-bank-content";

import { ManualRequestsContent } from "./_components/manual-requests-content";
import { TimeBalanceSidebar } from "./_components/time-balance-sidebar";
import { TimeCalendarView } from "./_components/time-calendar-view";

export default function MyTimeEntriesPage() {
  const [activeTab, setActiveTab] = useState<"fichajes" | "timebank">("fichajes");

  return (
    <div className="flex h-full flex-col gap-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex h-full w-full flex-col"
      >
        <div className="mb-4 flex items-center justify-between border-b px-1 pb-0">
          <TabsList className="h-9 gap-6 bg-transparent p-0">
            <TabsTrigger
              value="fichajes"
              className="text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none border-b-2 border-transparent px-4 py-2 font-medium transition-all data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Mis Fichajes</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="timebank"
              className="text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none border-b-2 border-transparent px-4 py-2 font-medium transition-all data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                <span>Bolsa de Horas</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="fichajes" className="mt-0 flex-1 focus-visible:ring-0">
          <div className="space-y-6">
            <TimeCalendarView />
            <TimeBalanceSidebar />
            <ManualRequestsContent />
          </div>
        </TabsContent>

        <TabsContent value="timebank" className="mt-0 flex-1 focus-visible:ring-0">
          <TimeBankContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
