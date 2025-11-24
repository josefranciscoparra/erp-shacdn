import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, Calendar, Euro, User, Plus, FileText, Edit, PlusCircle, CheckCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProcedureById } from "@/server/actions/expense-procedures";
import { getAuthenticatedUser } from "@/server/actions/shared/get-authenticated-employee";

import { EditProcedureDialog } from "../../procedures/[id]/_components/edit-procedure-dialog";
import { ProcedureTimeline } from "../../procedures/[id]/_components/procedure-timeline";

import { FinishJustificationButton } from "./_components/finish-justification-button";
import { SubmitButton } from "./_components/submit-button";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-500",
    PENDING_AUTHORIZATION: "bg-yellow-500",
    AUTHORIZED: "bg-green-500",
    JUSTIFICATION_PENDING: "bg-blue-500",
    JUSTIFIED: "bg-purple-500",
    CLOSED: "bg-gray-700",
    REJECTED: "bg-red-500",
  };

  return <Badge className={styles[status] || "bg-gray-500"}>{status.replace("_", " ")}</Badge>;
}

export default async function MyProcedureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { procedure, error } = await getProcedureById(id);
  const user = await getAuthenticatedUser();

  if (!procedure || error) {
    notFound();
  }

  const isOwner = procedure.employeeId === user.employee?.id;
  const isManager = ["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(user.role);

  if (!isOwner && !isManager) {
    notFound();
  }

  const procedureSerializable = {
    ...procedure,
    startDate: procedure.startDate,
    endDate: procedure.endDate,
    estimatedAmount: procedure.estimatedAmount ? Number(procedure.estimatedAmount) : null,
    expenses: [],
  };

  const estimated = Number(procedure.estimatedAmount ?? 0);
  const totalSpent = procedure.expenses.reduce((acc, exp) => acc + Number(exp.totalAmount), 0);
  const progress = estimated > 0 ? (totalSpent / estimated) * 100 : 0;
  const isOverBudget = totalSpent > estimated && estimated > 0;

  const canEdit = procedure.status === "DRAFT" || procedure.status === "PENDING_AUTHORIZATION";

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/my-procedures">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{procedure.name}</h1>
              <StatusBadge status={procedure.status} />
            </div>
            <p className="text-muted-foreground text-sm">{procedure.code}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          {canEdit && <EditProcedureDialog procedure={procedureSerializable} canManage={false} />}

          {procedure.status === "DRAFT" && <SubmitButton procedureId={procedure.id} />}

          {procedure.status === "AUTHORIZED" && (
            <>
              <FinishJustificationButton procedureId={procedure.id} hasExpenses={procedure.expenses.length > 0} />
              <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                <Link href={`/dashboard/me/expenses/new?procedureId=${procedure.id}`}>
                  <Plus className="mr-2 size-4" /> Añadir Gasto
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Información principal (Columna Izquierda 2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card de Información */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Información del Expediente</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Fechas Previstas</p>
                <div className="flex flex-col">
                  <p className="font-medium">
                    Del {procedure.startDate ? new Date(procedure.startDate).toLocaleDateString() : "-"} al{" "}
                    {procedure.endDate ? new Date(procedure.endDate).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>

              {procedure.description && (
                <div className="md:col-span-2">
                  <p className="text-muted-foreground text-sm">Descripción / Motivo</p>
                  <p className="mt-1">{procedure.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lista de Gastos */}
          <div className="bg-card rounded-lg border p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gastos Imputados ({procedure.expenses.length})</h2>
              {procedure.status === "AUTHORIZED" && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/me/expenses/new?procedureId=${procedure.id}`}>
                    <PlusCircle className="mr-2 size-4" /> Nuevo
                  </Link>
                </Button>
              )}
            </div>

            {procedure.expenses.length === 0 ? (
              <div className="bg-muted/10 flex flex-col items-center justify-center rounded-lg py-8 text-center">
                <p className="text-muted-foreground text-sm">No hay gastos registrados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procedure.expenses.map((expense) => (
                    <TableRow key={expense.id}>
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
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
                          Number(expense.totalAmount),
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {expense.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Sidebar derecho (Columna 1/3) */}
        <div className="space-y-6">
          {/* Resumen Económico */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Resumen Económico</h2>

            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-end justify-between">
                  <p className="text-muted-foreground text-sm">Gastado</p>
                  <p className={`text-2xl font-bold ${isOverBudget ? "text-red-600" : ""}`}>
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(totalSpent)}
                  </p>
                </div>
                {estimated > 0 && (
                  <>
                    <Progress
                      value={Math.min(progress, 100)}
                      className={`h-2 ${isOverBudget ? "bg-red-100 [&>div]:bg-red-600" : ""}`}
                    />
                    <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                      <span>{progress.toFixed(0)}% del presupuesto</span>
                      <span>
                        Total:{" "}
                        {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(estimated)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Detalles adicionales */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Detalles</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creado por</span>
                <span className="font-medium">{procedure.createdBy.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Beneficiario</span>
                <span className="text-right font-medium">
                  {procedure.employee
                    ? `${procedure.employee.firstName} ${procedure.employee.lastName}`
                    : "Sin asignar"}
                </span>
              </div>
            </div>
          </div>

          {/* Historial de Auditoría */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Historial</h2>
            <ProcedureTimeline procedureId={procedure.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
