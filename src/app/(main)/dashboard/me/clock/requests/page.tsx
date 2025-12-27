"use client";

import { useState } from "react";

import Link from "next/link";

import { Calendar, PiggyBank, ArrowLeft, Clock, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TimeBankContent } from "../../time-bank/_components/time-bank-content";

import { ManualRequestsContent } from "./_components/manual-requests-content";
import { TimeBalanceSidebar } from "./_components/time-balance-sidebar";
import { TimeCalendarView } from "./_components/time-calendar-view";

export default function MyTimeEntriesPage() {
  const [activeTab, setActiveTab] = useState<"fichajes" | "timebank">("fichajes");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/me/clock">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Fichajes</h1>
            <p className="text-muted-foreground text-sm">Revisa tu historial y solicita correcciones</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <div className="border-b">
          <TabsList className="h-auto gap-0 bg-transparent p-0">
            <TabsTrigger
              value="fichajes"
              className="text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent px-4 py-3 font-medium transition-all data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <Calendar className="size-4" />
                <span>Mis Fichajes</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="timebank"
              className="text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary relative rounded-none border-b-2 border-transparent px-4 py-3 font-medium transition-all data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                <PiggyBank className="size-4" />
                <span>Bolsa de Horas</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="fichajes" className="mt-6 focus-visible:ring-0">
          <div className="space-y-6">
            {/* Calendar and sidebar in grid */}
            <div className="grid gap-6 xl:grid-cols-[1fr,400px]">
              <TimeCalendarView />
              <div className="hidden xl:block">
                <TimeBalanceSidebar variant="vertical" />
              </div>
            </div>

            {/* Sidebar for mobile/tablet */}
            <div className="xl:hidden">
              <TimeBalanceSidebar />
            </div>

            {/* Requests list */}
            <ManualRequestsContent />
          </div>
        </TabsContent>

        <TabsContent value="timebank" className="mt-6 focus-visible:ring-0">
          <TimeBankContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
