import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Calendar, Euro, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils"; // Asumiendo que existe o usar Intl
import { getProcedureById } from "@/server/actions/expense-procedures";
import { getAuthenticatedUser } from "@/server/actions/shared/get-authenticated-employee";

import { EditProcedureDialog } from "./_components/edit-procedure-dialog";
import { ProcedureActions } from "./_components/procedure-actions";
import { ProcedureTimeline } from "./_components/procedure-timeline";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-500",
    AUTHORIZED: "bg-green-500",
    JUSTIFICATION_PENDING: "bg-blue-500",
    JUSTIFIED: "bg-purple-500",
    CLOSED: "bg-gray-700",
    REJECTED: "bg-red-500",
  };

  return <Badge className={styles[status] || "bg-gray-500"}>{status.replace("_", " ")}</Badge>;
}

export default async function ProcedureDetailPage({ params }: { params: { id: string } }) {
  const { procedure, error } = await getProcedureById(params.id);
  const user = await getAuthenticatedUser(); // Ya devuelve { role, ... }

  if (!procedure || error) {
    notFound();
  }

  const isManagerOrAdmin = ["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(user.role);

  // Correction: user object from getAuthenticatedUser has employee relation loaded.
  const loggedInEmployeeId = user.employee?.id;
  const isBeneficiary = procedure.employeeId ? procedure.employeeId === loggedInEmployeeId : false;

  // Regla: Solo Managers/Admin pueden gestionar.
  // Se permite auto-aprobación por petición del usuario.
  const canManage = isManagerOrAdmin;

  // Se permite editar si es manager O si es el creador/beneficiario (según lógica del servidor)
  // Pasaremos canManage para la asignación de empleados, pero el diálogo controlará campos.
  // Vamos a pasar procedure serializado para evitar problemas de fechas en componentes cliente.

  const procedureSerializable = {
    ...procedure,
    startDate: procedure.startDate,
    endDate: procedure.endDate,
    estimatedAmount: procedure.estimatedAmount ? Number(procedure.estimatedAmount) : null,
    expenses: [], // No necesitamos expenses en el diálogo de edición
  };

  // Cálculos económicos
  const estimated = Number(procedure.estimatedAmount ?? 0);
  const totalSpent = procedure.expenses.reduce((acc, exp) => acc + Number(exp.totalAmount), 0);
  const progress = estimated > 0 ? (totalSpent / estimated) * 100 : 0;
  const isOverBudget = totalSpent > estimated && estimated > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        {/* Top Navigation & Meta */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
            <Link href="/dashboard/procedures">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Expedientes
            </Link>
          </Button>
          <div className="md:hidden">
            <StatusBadge status={procedure.status} />
          </div>
        </div>

        {/* Title & Actions Area */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          {/* Left: Title & Info */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-muted-foreground flex items-center gap-3 text-sm">
              <Badge variant="outline" className="bg-background px-2 py-0.5 font-mono text-xs">
                {procedure.code}
              </Badge>
              <span className="hidden md:inline-block">•</span>
              <div className="hidden md:block">
                <StatusBadge status={procedure.status} />
              </div>
            </div>

            <h1 className="text-foreground text-3xl leading-tight font-bold tracking-tight break-words md:text-4xl">
              {procedure.name}
            </h1>

            {procedure.description && (
              <p className="text-muted-foreground max-w-3xl text-lg leading-relaxed break-words">
                {procedure.description}
              </p>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 pt-2 md:w-auto">
            <EditProcedureDialog procedure={procedureSerializable} canManage={canManage} />

            <ProcedureActions id={procedure.id} currentStatus={procedure.status} canManage={canManage} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Financial & Expenses (Takes 2/3 width on LG) */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Financial Summary Card */}
          <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground flex items-center gap-2 text-lg font-medium">
                <Euro className="h-5 w-5" />
                Control Presupuestario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">Gastado</p>
                  <p
                    className={`text-3xl font-bold tracking-tight ${isOverBudget ? "text-red-600" : "text-foreground"}`}
                  >
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(totalSpent)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">Presupuesto Estimado</p>
                  <p className="text-muted-foreground/70 text-3xl font-bold tracking-tight">
                    {estimated > 0
                      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(estimated)
                      : "Sin límite"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Progreso del gasto</span>
                  <span>{Math.min(progress, 100).toFixed(1)}%</span>
                </div>
                <Progress
                  value={Math.min(progress, 100)}
                  className={`h-3 rounded-full ${isOverBudget ? "bg-red-100 [&>div]:bg-red-600" : "[&>div]:bg-blue-600"}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Expenses List */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Gastos Imputados</span>
                <Badge variant="secondary" className="ml-2">
                  {procedure.expenses.length}
                </Badge>
              </CardTitle>
              <CardDescription>Desglose detallado de los gastos vinculados a este expediente.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {procedure.expenses.length === 0 ? (
                <div className="bg-muted/10 flex flex-col items-center justify-center space-y-3 px-4 py-12 text-center">
                  <div className="bg-muted rounded-full p-3">
                    <Euro className="text-muted-foreground h-6 w-6" />
                  </div>
                  <p className="text-foreground text-base font-medium">No hay gastos registrados</p>
                  <p className="text-muted-foreground max-w-xs text-sm">
                    Este expediente aún no tiene gastos asociados. Los gastos aparecerán aquí a medida que se registren.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[120px]">Fecha</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Pagado por</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead className="w-[100px] text-right">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedure.expenses.map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{new Date(expense.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{expense.category}</span>
                              {expense.merchantName && (
                                <span className="text-muted-foreground max-w-[150px] truncate text-xs">
                                  {expense.merchantName}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={expense.paidBy === "ORGANIZATION" ? "secondary" : "outline"}
                              className="text-xs font-normal"
                            >
                              {expense.paidBy === "ORGANIZATION" ? "Empresa" : "Empleado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
                              Number(expense.totalAmount),
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end">
                              <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] tracking-wider uppercase">
                                {expense.status}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Details & Metadata (Takes 1/3 width on LG) */}
        <div className="flex flex-col gap-6">
          <Card className="h-fit shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-base font-semibold">Detalles del Expediente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Beneficiary Section */}
              <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  <span>Beneficiario</span>
                </div>
                {procedure.employee ? (
                  <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {procedure.employee.firstName.charAt(0)}
                      {procedure.employee.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {procedure.employee.firstName} {procedure.employee.lastName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">{procedure.employee.user?.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-3 text-center">
                    <p className="text-muted-foreground text-sm italic">Sin asignar</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Dates Section */}
              <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  <span>Fechas Previstas</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="hover:bg-muted/50 flex items-center justify-between rounded p-2 transition-colors">
                    <span className="text-muted-foreground text-sm">Inicio</span>
                    <span className="text-sm font-medium">
                      {procedure.startDate ? new Date(procedure.startDate).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  <div className="hover:bg-muted/50 flex items-center justify-between rounded p-2 transition-colors">
                    <span className="text-muted-foreground text-sm">Fin</span>
                    <span className="text-sm font-medium">
                      {procedure.endDate ? new Date(procedure.endDate).toLocaleDateString() : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Meta Section */}
              <div className="pt-2">
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>Creado por</span>
                  <span className="text-foreground font-medium">{procedure.createdBy.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historial de Auditoría */}
          <Card className="h-fit shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-base font-semibold">Historial</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ProcedureTimeline procedureId={procedure.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
