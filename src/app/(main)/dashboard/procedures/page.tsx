import { Suspense } from "react";

import Link from "next/link";

import { PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProcedures } from "@/server/actions/expense-procedures";

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

async function ProceduresTable({ mine }: { mine: boolean }) {
  const { procedures } = await getProcedures({ mine });

  if (!procedures || procedures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-muted-foreground">No hay expedientes creados</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead>Gastos</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {procedures.map((proc) => (
          <TableRow key={proc.id}>
            <TableCell className="font-medium">{proc.code}</TableCell>
            <TableCell>{proc.name}</TableCell>
            <TableCell>
              {proc.employee ? (
                `${proc.employee.firstName} ${proc.employee.lastName}`
              ) : (
                <span className="text-muted-foreground italic">Sin asignar</span>
              )}
            </TableCell>
            <TableCell>{proc._count.expenses}</TableCell>
            <TableCell>
              <StatusBadge status={proc.status} />
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/procedures/${proc.id}`}>Ver Detalle</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ProceduresPage({ searchParams }: { searchParams: { filter?: string } }) {
  const showMineOnly = searchParams.filter === "mine";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {showMineOnly ? "Mis Expedientes" : "Gestión de Expedientes"}
          </h1>
          <p className="text-muted-foreground">
            {showMineOnly
              ? "Consulta y crea tus solicitudes de gasto o comisiones de servicio."
              : "Supervisión y autorización de expedientes de gasto de la organización."}
          </p>
        </div>
        {/* El botón de crear siempre está disponible para que cualquiera inicie un expediente */}
        <Button asChild>
          <Link href="/dashboard/procedures/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Expediente
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{showMineOnly ? "Mis Solicitudes" : "Todos los Expedientes"}</CardTitle>
          <CardDescription>
            {showMineOnly
              ? "Histórico de tus expedientes activos y cerrados."
              : "Listado global para control y aprobación."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Cargando expedientes...</div>}>
            <ProceduresTable mine={showMineOnly} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
