"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Circle, CheckCircle2, XCircle, Clock, FileText, User, ArrowRight, ShieldCheck, Edit } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getProcedureHistory } from "@/server/actions/expense-procedures";

interface ProcedureHistoryItem {
  id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  comment: string | null;
  details: string | null;
  createdAt: Date;
  actor: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

function getActionIcon(action: string, newStatus: string | null) {
  if (action === "CREATED") return <FileText className="h-4 w-4 text-blue-500" />;
  if (action === "UPDATED") return <Edit className="h-4 w-4 text-orange-500" />;

  if (action === "STATUS_CHANGE") {
    switch (newStatus) {
      case "AUTHORIZED":
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "PENDING_AUTHORIZATION":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "JUSTIFICATION_PENDING":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "CLOSED":
        return <CheckCircle2 className="h-4 w-4 text-gray-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  }

  return <Circle className="h-4 w-4 text-gray-400" />;
}

function getStatusLabel(status: string | null) {
  if (!status) return "-";
  const labels: Record<string, string> = {
    DRAFT: "Borrador",
    PENDING_AUTHORIZATION: "Pendiente Autorización",
    AUTHORIZED: "Autorizado",
    JUSTIFICATION_PENDING: "Pendiente Revisión",
    JUSTIFIED: "Justificado",
    CLOSED: "Cerrado",
    REJECTED: "Rechazado",
  };
  return labels[status] || status;
}

export function ProcedureTimeline({ procedureId }: { procedureId: string }) {
  const [history, setHistory] = useState<ProcedureHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await getProcedureHistory(procedureId);
        if (res.success && res.history) {
          setHistory(res.history as any);
        }
      } catch (error) {
        console.error("Failed to load history", error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [procedureId]);

  if (loading) {
    return <div className="text-muted-foreground py-4 text-center text-sm">Cargando historial...</div>;
  }

  if (history.length === 0) {
    return <div className="text-muted-foreground py-4 text-center text-sm">No hay registros de auditoría.</div>;
  }

  return (
    <div className="relative space-y-4 pl-2">
      {/* Línea vertical conectora */}
      <div className="bg-muted absolute top-2 left-[19px] h-[calc(100%-20px)] w-[2px]" />

      {history.map((item) => (
        <div key={item.id} className="relative flex gap-4">
          {/* Icono del evento */}
          <div className="bg-background relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm">
            {getActionIcon(item.action, item.newStatus)}
          </div>

          {/* Contenido */}
          <div className="bg-card flex flex-1 flex-col gap-1 rounded-lg border p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{item.actor.name ?? item.actor.email ?? "Sistema"}</span>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(item.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>
            </div>

            <div className="text-sm">
              {item.action === "CREATED" && "Creó el expediente"}
              {item.action === "UPDATED" && "Actualizó los datos del expediente"}
              {item.action === "STATUS_CHANGE" && (
                <div className="flex items-center gap-1 font-medium">
                  <Badge
                    variant="outline"
                    className="text-muted-foreground decoration-muted-foreground/50 text-xs font-normal line-through"
                  >
                    {getStatusLabel(item.previousStatus)}
                  </Badge>
                  <ArrowRight className="text-muted-foreground h-3 w-3" />
                  <Badge className="text-xs">{getStatusLabel(item.newStatus)}</Badge>
                </div>
              )}
            </div>

            {(item.details ?? item.comment) && (
              <div className="bg-muted/30 text-muted-foreground mt-1 rounded p-2 text-xs">
                {item.comment && <p className="mb-1 font-medium italic">&ldquo;{item.comment}&rdquo;</p>}
                {item.details && <p>{item.details}</p>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
