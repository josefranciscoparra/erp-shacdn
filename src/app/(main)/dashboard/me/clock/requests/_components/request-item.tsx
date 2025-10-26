"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ManualTimeEntryRequest } from "@/stores/manual-time-entry-store";

interface RequestItemProps {
  request: ManualTimeEntryRequest;
  onCancel: (requestId: string) => void;
}

export function RequestItem({ request, onCancel }: RequestItemProps) {
  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="default" className="gap-1.5 border-green-600/20 bg-green-500/10 text-green-700">
            <CheckCircle className="h-3 w-3" />
            Aprobado
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="gap-1.5">
            <XCircle className="h-3 w-3" />
            Rechazado
          </Badge>
        );
    }
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), "HH:mm", { locale: es });
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd MMM yyyy", { locale: es });
  };

  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{formatDate(request.date)}</h3>
          {getStatusBadge(request.status)}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Entrada:</span>{" "}
            <span className="font-medium">{formatTime(request.clockInTime)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Salida:</span>{" "}
            <span className="font-medium">{formatTime(request.clockOutTime)}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{request.reason}</p>
      </div>
      {request.status === "PENDING" && (
        <Button variant="ghost" size="icon" onClick={() => onCancel(request.id)}>
          <Trash2 className="text-muted-foreground h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
