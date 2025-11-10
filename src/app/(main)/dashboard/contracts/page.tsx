"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Briefcase, FileText, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Contract, useContractsStore } from "@/stores/contracts-store";

import { getContractsColumns } from "../employees/[id]/contracts/_components/contracts-columns";

import { ContractsDataTable } from "./_components/contracts-data-table";

type ContractStatusTab = "active" | "inactive" | "all";

export default function ContractsPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<ContractStatusTab>("active");

  const contracts = useContractsStore((state) => state.contracts);
  const isLoading = useContractsStore((state) => state.isLoading);
  const total = useContractsStore((state) => state.total);
  const fetchAllContracts = useContractsStore((state) => state.fetchAllContracts);
  const setStatus = useContractsStore((state) => state.setStatus);
  const resetStore = useContractsStore((state) => state.reset);

  const lastFetchedStatusRef = useRef<ContractStatusTab | null>(null);

  // Load contracts whenever the tab changes and keep StrictMode double-invocation in check.
  useEffect(() => {
    const statusParam = currentTab;

    if (lastFetchedStatusRef.current === statusParam) {
      return;
    }

    lastFetchedStatusRef.current = statusParam;

    const loadContracts = async () => {
      try {
        await fetchAllContracts({ status: statusParam });
        setStatus(statusParam);
      } catch (error) {
        lastFetchedStatusRef.current = null;
      }
    };

    void loadContracts();
  }, [currentTab, fetchAllContracts, setStatus]);

  // Reset the store when leaving the page to avoid leaking stale data between navigations.
  useEffect(() => {
    return () => {
      resetStore();
      lastFetchedStatusRef.current = null;
    };
  }, [resetStore]);

  const activeContracts = contracts.filter((contract) => contract.active);
  const inactiveContracts = contracts.filter((contract) => !contract.active);

  const getFilteredContracts = () => {
    switch (currentTab) {
      case "active":
        return activeContracts;
      case "inactive":
        return inactiveContracts;
      default:
        return contracts;
    }
  };

  const handleEditContract = (contract: Contract) => {
    if (contract.employee?.id) {
      router.push(`/dashboard/employees/${contract.employee.id}/contracts/${contract.id}/edit`);
    }
  };

  const columns = getContractsColumns({
    onEdit: handleEditContract,
  });

  return (
    <PermissionGuard
      permission="view_contracts"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Contratos" subtitle="Gestión de contratos laborales" />
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
        <SectionHeader title="Contratos" subtitle="Gestión de todos los contratos laborales de la organización" />

        {/* Tabs de contratos */}
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
                  <SelectItem value="inactive">
                    Finalizados
                    {inactiveContracts.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {inactiveContracts.length}
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
                Contratos Activos
                {activeContracts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {activeContracts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="inactive" className="relative">
                Finalizados
                {inactiveContracts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {inactiveContracts.length}
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
                icon={<Briefcase className="text-muted-foreground mx-auto h-12 w-12" />}
                title="No hay contratos activos"
                description="No hay contratos activos en este momento en la organización"
              />
            ) : (
              <ContractsDataTable columns={columns} data={activeContracts} isLoading={isLoading} />
            )}
          </TabsContent>

          <TabsContent value="inactive">
            {inactiveContracts.length === 0 && !isLoading ? (
              <EmptyState
                icon={<FileText className="text-muted-foreground mx-auto h-12 w-12" />}
                title="No hay contratos finalizados"
                description="No hay contratos en el historial"
              />
            ) : (
              <ContractsDataTable columns={columns} data={inactiveContracts} isLoading={isLoading} />
            )}
          </TabsContent>

          <TabsContent value="all">
            {contracts.length === 0 && !isLoading ? (
              <EmptyState
                icon={<Briefcase className="text-muted-foreground mx-auto h-12 w-12" />}
                title="No hay contratos registrados"
                description="No hay contratos en la organización"
              />
            ) : (
              <ContractsDataTable columns={columns} data={getFilteredContracts()} isLoading={isLoading} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
