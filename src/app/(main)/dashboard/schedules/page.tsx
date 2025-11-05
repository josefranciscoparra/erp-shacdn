"use client";

import { useEffect, useState } from "react";

import { Clock, AlertCircle, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Contract, useContractsStore } from "@/stores/contracts-store";

import { getSchedulesColumns } from "./_components/schedules-columns";
import { SchedulesDataTable } from "./_components/schedules-data-table";

export default function SchedulesPage() {
  const [currentTab, setCurrentTab] = useState("active");

  const { contracts, isLoading, status, total, fetchAllContracts, setStatus, reset } = useContractsStore();

  useEffect(() => {
    // Cargar todos los contratos activos (que tienen horarios)
    fetchAllContracts({ status: currentTab === "all" ? "all" : currentTab });

    // Cleanup store on unmount
    return () => {
      reset();
    };
  }, []);

  // Refetch contracts when tab changes
  useEffect(() => {
    const statusParam = currentTab === "all" ? "all" : currentTab;
    fetchAllContracts({ status: statusParam });
    setStatus(statusParam as any);
  }, [currentTab]);

  const activeContracts = contracts.filter((contract) => contract.active);
  const allContractsWithSchedules = contracts; // Todos los contratos tienen horarios

  const getFilteredContracts = () => {
    switch (currentTab) {
      case "active":
        return activeContracts;
      default:
        return allContractsWithSchedules;
    }
  };

  const columns = getSchedulesColumns();

  return (
    <PermissionGuard
      permission="view_contracts"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Horarios" subtitle="Gestión de horarios laborales" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <SectionHeader
          title="Horarios"
          subtitle="Gestión de horarios laborales de todos los empleados de la organización"
        />

        {/* Tabs de horarios */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <div className="flex items-center justify-between">
            {/* Mobile Select */}
            <div className="@4xl/main:hidden">
              <Select value={currentTab} onValueChange={setCurrentTab}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    Activos
                    {activeContracts.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {activeContracts.length}
                      </Badge>
                    )}
                  </SelectItem>
                  <SelectItem value="all">
                    Todos
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {total}
                    </Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Tabs */}
            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="active" className="relative">
                Horarios Activos
                {activeContracts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {activeContracts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="relative">
                Todos
                <Badge variant="secondary" className="ml-2 text-xs">
                  {total}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active">
            {activeContracts.length === 0 && !isLoading ? (
              <EmptyState
                icon={<Clock className="text-muted-foreground mx-auto h-12 w-12" />}
                title="No hay horarios activos"
                description="No hay contratos activos con horarios configurados en este momento"
              />
            ) : (
              <SchedulesDataTable columns={columns} data={activeContracts} isLoading={isLoading} />
            )}
          </TabsContent>

          <TabsContent value="all">
            {allContractsWithSchedules.length === 0 && !isLoading ? (
              <EmptyState
                icon={<Clock className="text-muted-foreground mx-auto h-12 w-12" />}
                title="No hay horarios registrados"
                description="No hay horarios configurados en la organización"
              />
            ) : (
              <SchedulesDataTable columns={columns} data={getFilteredContracts()} isLoading={isLoading} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
