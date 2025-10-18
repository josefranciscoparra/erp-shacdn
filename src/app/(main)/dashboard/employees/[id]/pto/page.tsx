"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { AlertCircle, ArrowLeft } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getEmployeePtoBalance,
  getEmployeePtoRequests,
  getEmployeePtoAdjustments,
  getRecurringAdjustments,
} from "@/server/actions/admin-pto";
import { getCurrentUserRole } from "@/server/actions/get-current-user-role";

import { EmployeePtoRequestsTable } from "../_components/employee-pto-requests-table";
import { EmployeePtoSummary } from "../_components/employee-pto-summary";

import { AdjustBalanceDialog } from "./_components/adjust-balance-dialog";
import { RecurringAdjustmentsList } from "./_components/recurring-adjustments-list";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
}

export default function EmployeePtoManagementPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [ptoBalance, setPtoBalance] = useState<any>(null);
  const [ptoRequests, setPtoRequests] = useState<any[]>([]);
  const [ptoAdjustments, setPtoAdjustments] = useState<any[]>([]);
  const [recurringAdjustments, setRecurringAdjustments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustBalanceDialogOpen, setAdjustBalanceDialogOpen] = useState(false);
  const [canManageRequests, setCanManageRequests] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      // Cargar datos del empleado
      const empResponse = await fetch(`/api/employees/${params.id}`);
      if (!empResponse.ok) {
        throw new Error("Empleado no encontrado");
      }
      const empData = await empResponse.json();
      setEmployee(empData);

      // Cargar datos de PTO y rol del usuario actual
      const [balance, requests, adjustments, recurring, role] = await Promise.all([
        getEmployeePtoBalance(params.id as string),
        getEmployeePtoRequests(params.id as string),
        getEmployeePtoAdjustments(params.id as string),
        getRecurringAdjustments(params.id as string),
        getCurrentUserRole(),
      ]);

      setPtoBalance(balance);
      setPtoRequests(requests);
      setPtoAdjustments(adjustments);
      setRecurringAdjustments(recurring);
      setCanManageRequests(role ? ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(role) : false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse">Cargando gestión de vacaciones...</div>
        </div>
      </div>
    );
  }

  if (error ?? !employee) {
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
          title="Error al cargar datos"
          description={error ?? "No se pudo cargar la información de vacaciones"}
        />
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/employees/${params.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-foreground text-2xl font-semibold">Gestión de Vacaciones</h1>
          <p className="text-muted-foreground text-sm">{fullName}</p>
        </div>
      </div>

      {/* Balance Summary */}
      <div>
        <h2 className="mb-4 text-lg font-medium">Balance Actual</h2>
        <EmployeePtoSummary balance={ptoBalance} isLoading={false} />
      </div>

      <Separator />

      {/* Admin Panel */}
      <div>
        <h2 className="mb-4 text-lg font-medium">Acciones Administrativas</h2>
        <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Gestión de Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button onClick={() => setAdjustBalanceDialogOpen(true)}>Ajustar balance</Button>
              <Button variant="outline" disabled>
                Registrar ausencia
              </Button>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">
              Ajusta el balance de vacaciones del empleado o registra ausencias sin solicitud previa (bajas médicas,
              maternales, etc.)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Adjustments */}
      {recurringAdjustments.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="mb-4 text-lg font-medium">Ajustes Recurrentes Activos</h2>
            <RecurringAdjustmentsList adjustments={recurringAdjustments} onSuccess={loadData} />
          </div>
        </>
      )}

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
          <TabsTrigger value="adjustments">Historial de Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <h3 className="text-lg font-medium">Historial de Solicitudes</h3>
          <EmployeePtoRequestsTable
            requests={ptoRequests}
            isLoading={false}
            canManage={canManageRequests}
            onRefresh={() => loadData(true)}
          />
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <h3 className="text-lg font-medium">Ajustes Manuales Realizados</h3>
          {ptoAdjustments.length === 0 ? (
            <Card className="p-6">
              <p className="text-muted-foreground text-center text-sm">
                No se han realizado ajustes manuales en este balance
              </p>
            </Card>
          ) : (
            <Card className="rounded-lg border shadow-xs">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {ptoAdjustments.map((adjustment: any) => (
                    <div key={adjustment.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {adjustment.adjustmentType.replace(/_/g, " ")} -{" "}
                            <span className={adjustment.daysAdjusted > 0 ? "text-green-600" : "text-red-600"}>
                              {adjustment.daysAdjusted > 0 ? "+" : ""}
                              {adjustment.daysAdjusted} días
                            </span>
                          </p>
                          <p className="text-muted-foreground text-sm">{adjustment.reason}</p>
                          {adjustment.notes && (
                            <p className="text-muted-foreground mt-1 text-xs italic">{adjustment.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground text-xs">
                            {new Date(adjustment.createdAt).toLocaleDateString("es-ES")}
                          </p>
                          <p className="text-muted-foreground text-xs">{adjustment.createdBy.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AdjustBalanceDialog
        open={adjustBalanceDialogOpen}
        onOpenChange={setAdjustBalanceDialogOpen}
        employeeId={params.id as string}
        currentBalance={ptoBalance}
        onSuccess={loadData}
      />
    </div>
  );
}
