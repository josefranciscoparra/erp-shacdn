import { Suspense } from "react";

import Link from "next/link";

import { PlusCircle, ClipboardList, ArrowRight, Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProcedures } from "@/server/actions/expense-procedures";

import { ProceduresStats } from "./_components/procedures-stats";

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

function MyProceduresTable({ procedures }: { procedures: any[] }) {
  if (!procedures || procedures.length === 0) {
    return (
      <div className="bg-muted/10 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <div className="bg-muted mb-3 rounded-full p-4">
          <ClipboardList className="text-muted-foreground h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium">No tienes expedientes</h3>
        <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
          Aún no has creado ningún expediente de gasto o comisión de servicio.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/procedures/new?context=mine">Crear mi primer expediente</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Gastos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {procedures.map((proc) => (
            <TableRow key={proc.id} className="hover:bg-muted/50">
              <TableCell className="text-muted-foreground font-mono text-xs font-medium">{proc.code}</TableCell>
              <TableCell className="font-medium">{proc.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs font-normal">
                  {proc._count.expenses}
                </Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={proc.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                  <Link href={`/dashboard/my-procedures/${proc.id}`}>
                    Ver Detalle <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function MyProceduresPage() {
  const { procedures } = await getProcedures({ mine: true });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Expedientes de Gasto"
        description="Consulta y crea tus solicitudes de gasto o comisiones de servicio."
        actionLabel="Nuevo Expediente"
        actionHref="/dashboard/procedures/new?context=mine"
        actionIcon={<PlusCircle className="h-4 w-4" />}
      />

      {/* Cards de resumen */}
      <ProceduresStats procedures={procedures || []} />

      {/* Tabla de expedientes */}
      <MyProceduresTable procedures={procedures || []} />
    </div>
  );
}
