"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { List, Calendar as CalendarIcon, Clock, FilePlus } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useManualTimeEntryStore } from "@/stores/manual-time-entry-store";

import { ManualTimeEntryDialog } from "../_components/manual-time-entry-dialog";

import { RequestItem } from "./_components/request-item";
import { SegmentedControl } from "./_components/segmented-control";
import { TimeBalanceSidebar } from "./_components/time-balance-sidebar";
import { TimeCalendarView } from "./_components/time-calendar-view";

export default function MyManualTimeEntryRequestsPage() {
  const { requests, totals, isLoading, loadRequests, cancelRequest } = useManualTimeEntryStore();
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  useEffect(() => {
    loadRequests(activeTab);
  }, [activeTab, loadRequests]);

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("¿Estás seguro de que quieres cancelar esta solicitud?")) {
      return;
    }

    try {
      await cancelRequest(requestId);
      toast.success("Solicitud cancelada");
    } catch (error) {
      toast.error("Error al cancelar solicitud");
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis fichajes"
        description="Calendario, balance de horas y solicitudes de fichaje manual"
        action={
          <div className="flex gap-2">
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Calendario
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="mr-2 h-4 w-4" />
              Solicitudes
            </Button>
          </div>
        }
      />

      <ManualTimeEntryDialog open={manualDialogOpen} onOpenChange={setManualDialogOpen} />

      {viewMode === "calendar" ? (
        <div className="grid gap-6 @4xl/main:grid-cols-[minmax(0,780px)_320px] @4xl/main:items-start">
          <TimeCalendarView />
          <TimeBalanceSidebar />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="hidden sm:block">
              <SegmentedControl
                options={[
                  { label: `Pendientes`, value: "PENDING", badge: totals.pending },
                  { label: `Aprobadas`, value: "APPROVED", badge: totals.approved },
                  { label: `Rechazadas`, value: "REJECTED", badge: totals.rejected },
                ]}
                value={activeTab}
                onChange={(value) => setActiveTab(value)}
              />
            </div>
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="APPROVED">Aprobadas</SelectItem>
                  <SelectItem value="REJECTED">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setManualDialogOpen(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              Nueva solicitud
            </Button>
          </div>
          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-muted-foreground text-sm">Cargando solicitudes...</div>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-24 text-center dark:border-gray-800">
                <Clock className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-700" />
                <h3 className="text-xl font-semibold">No hay solicitudes</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Cuando crees una nueva solicitud de fichaje manual, aparecerá aquí.
                </p>
                <Button onClick={() => setManualDialogOpen(true)} className="mt-6">
                  Nueva solicitud
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 rounded-lg border dark:divide-gray-800">
                {requests.map((request) => (
                  <RequestItem key={request.id} request={request} onCancel={handleCancelRequest} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
