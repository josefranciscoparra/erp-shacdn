"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Briefcase, AlertCircle, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { EmployeeStatusBadge } from "@/components/employees/employee-status-select";
import { useContractsStore } from "@/stores/contracts-store";
import { ContractSheet } from "@/components/contracts/contract-sheet";
import { getContractsColumns } from "./_components/contracts-columns";
import { ContractsDataTable } from "./_components/contracts-data-table";
import { toast } from "sonner";
import { FinalizeContractDialog } from "./_components/finalize-contract-dialog";
import type { Contract } from "@/stores/contracts-store";

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  employmentStatus: "PENDING_CONTRACT" | "ACTIVE" | "ON_LEAVE" | "VACATION" | "SUSPENDED" | "TERMINATED" | "RETIRED";
}

export default function EmployeeContractsPage() {
  const params = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractSheetOpen, setContractSheetOpen] = useState(false);
  const [editContractSheetOpen, setEditContractSheetOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("active");
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [contractToFinalize, setContractToFinalize] = useState<Contract | null>(null);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  
  const {
    contracts,
    isLoading: contractsLoading,
    status,
    total,
    fetchContracts,
    setStatus,
    reset,
  } = useContractsStore();

  const fetchEmployee = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/employees/${params.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al cargar empleado");
      }

      const employeeData = await response.json();
      setEmployee(employeeData);
      
      // Cargar contratos
      await fetchContracts(params.id as string, { status: currentTab === "all" ? "all" : currentTab });
    } catch (error: any) {
      console.error("Error fetching employee:", error);
      setError(error.message);
      toast.error("Error al cargar empleado", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchEmployee();
    }
    
    // Cleanup store on unmount
    return () => {
      reset();
    };
  }, [params.id]);
  
  // Refetch contracts when tab changes
  useEffect(() => {
    if (employee) {
      const statusParam = currentTab === "all" ? "all" : currentTab;
      fetchContracts(employee.id, { status: statusParam });
      setStatus(statusParam as any);
    }
  }, [currentTab, employee]);

  const activeContracts = contracts.filter((contract) => contract.active);
  const inactiveContracts = contracts.filter((contract) => !contract.active);
  
  const handleNewContract = () => {
    setContractSheetOpen(true);
  };

  const handleContractsRefresh = useCallback(() => {
    if (employee) {
      fetchContracts(employee.id, { status: currentTab === "all" ? "all" : currentTab });
    }
  }, [employee, currentTab, fetchContracts]);

  const handleEditContract = useCallback((contract: Contract) => {
    setContractToEdit(contract);
    setEditContractSheetOpen(true);
  }, []);

  const handleFinalizeContract = useCallback((contract: Contract) => {
    setContractToFinalize(contract);
    setFinalizeDialogOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      getContractsColumns({
        onEdit: handleEditContract,
        onFinalize: handleFinalizeContract,
      }),
    [handleEditContract, handleFinalizeContract]
  );
  
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

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Cargando contratos..."
          backButton={{
            href: `/dashboard/employees/${params.id}`,
            label: "Volver al empleado",
          }}
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
            <p className="text-muted-foreground text-sm">Cargando contratos del empleado...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Error"
          backButton={{
            href: `/dashboard/employees/${params.id}`,
            label: "Volver al empleado",
          }}
        />
        <EmptyState
          icon={<AlertCircle className="text-destructive mx-auto h-12 w-12" />}
          title="Error al cargar contratos"
          description={error || "No se pudieron cargar los contratos del empleado"}
        />
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <SectionHeader
        title="Contratos"
        description={`Gestión de contratos laborales de ${fullName}`}
        backButton={{
          href: `/dashboard/employees/${params.id}`,
          label: "Volver al empleado",
        }}
        badge={<EmployeeStatusBadge status={employee.employmentStatus} />}
      />

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

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleNewContract} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Button>
          </div>
        </div>

        <TabsContent value="active">
          {activeContracts.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="text-muted-foreground mx-auto h-12 w-12" />}
              title="No hay contratos activos"
              description="Este empleado no tiene contratos activos en este momento"
            />
          ) : (
            <ContractsDataTable
              columns={columns}
              data={activeContracts}
              isLoading={contractsLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {inactiveContracts.length === 0 ? (
            <EmptyState
              icon={<FileText className="text-muted-foreground mx-auto h-12 w-12" />}
              title="No hay contratos finalizados"
              description="Este empleado no tiene contratos en el historial"
            />
          ) : (
            <ContractsDataTable
              columns={columns}
              data={inactiveContracts}
              isLoading={contractsLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="all">
            <ContractsDataTable
              columns={columns}
              data={getFilteredContracts()}
              isLoading={contractsLoading}
            />
        </TabsContent>
      </Tabs>

      {/* Contract Sheet Modal */}
      <ContractSheet
        open={contractSheetOpen}
        onOpenChange={setContractSheetOpen}
        employeeId={employee.id}
        employeeName={fullName}
        onSuccess={handleContractsRefresh}
      />

      <ContractSheet
        open={editContractSheetOpen && Boolean(contractToEdit)}
        onOpenChange={(open) => {
          setEditContractSheetOpen(open);
          if (!open) {
            setContractToEdit(null);
          }
        }}
        employeeId={employee.id}
        employeeName={fullName}
        mode="edit"
        contract={contractToEdit}
        onSuccess={() => {
          handleContractsRefresh();
          setContractToEdit(null);
        }}
      />

      <FinalizeContractDialog
        open={finalizeDialogOpen && Boolean(contractToFinalize)}
        onOpenChange={(open) => {
          setFinalizeDialogOpen(open);
          if (!open) {
            setContractToFinalize(null);
          }
        }}
        contract={contractToFinalize}
        onSuccess={() => {
          handleContractsRefresh();
          setContractToFinalize(null);
        }}
      />
    </div>
  );
}
