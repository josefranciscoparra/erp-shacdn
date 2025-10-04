"use client";

import { useState } from "react";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/hr/section-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RequestStatus = "pending" | "approved" | "rejected";

interface PtoRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: RequestStatus;
  reason?: string;
  submittedAt: string;
}

const mockRequests: PtoRequest[] = [
  {
    id: "1",
    type: "Vacaciones",
    startDate: "2025-02-10",
    endDate: "2025-02-14",
    days: 5,
    status: "approved",
    reason: "Vacaciones de invierno",
    submittedAt: "2025-01-20",
  },
  {
    id: "2",
    type: "Asuntos personales",
    startDate: "2025-01-28",
    endDate: "2025-01-28",
    days: 1,
    status: "pending",
    reason: "Trámites bancarios",
    submittedAt: "2025-01-25",
  },
  {
    id: "3",
    type: "Vacaciones",
    startDate: "2024-12-23",
    endDate: "2024-12-30",
    days: 6,
    status: "approved",
    reason: "Navidad",
    submittedAt: "2024-11-15",
  },
];

export function PtoRequests() {
  const [open, setOpen] = useState(false);
  const [requests] = useState<PtoRequest[]>(mockRequests);

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aprobada
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rechazada
          </Badge>
        );
    }
  };

  const totalDaysAvailable = 23;
  const daysUsed = requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.days, 0);
  const daysPending = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.days, 0);
  const daysRemaining = totalDaysAvailable - daysUsed - daysPending;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis Vacaciones"
        actionLabel="Nueva Solicitud"
        onAction={() => setOpen(true)}
      />

      {/* Resumen de días */}
      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-3">
        <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Días disponibles
          </div>
          <div className="text-3xl font-bold">{totalDaysAvailable}</div>
        </Card>

        <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Días usados
          </div>
          <div className="text-3xl font-bold">{daysUsed}</div>
        </Card>

        <Card className="from-primary/5 to-card flex flex-col gap-2 bg-gradient-to-t p-6 shadow-xs">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Días restantes
          </div>
          <div className="text-3xl font-bold">{daysRemaining}</div>
        </Card>
      </div>

      {/* Lista de solicitudes */}
      <Card className="@container/card flex flex-col gap-4 p-6">
        <h3 className="text-lg font-semibold">Mis solicitudes</h3>

        <div className="flex flex-col gap-3">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No tienes solicitudes todavía
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-lg border p-4 @md/card:flex-row @md/card:items-center @md/card:justify-between"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{request.type}</span>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(request.startDate).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(request.endDate).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  {request.reason && (
                    <div className="text-sm text-muted-foreground">
                      {request.reason}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold">{request.days}</span>
                    <span className="text-xs text-muted-foreground">
                      {request.days === 1 ? "día" : "días"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Dialog para nueva solicitud */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva solicitud de vacaciones</DialogTitle>
            <DialogDescription>
              Completa el formulario para solicitar días de vacaciones o ausencia.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">Tipo de ausencia</Label>
              <Select>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacaciones</SelectItem>
                  <SelectItem value="personal">Asuntos personales</SelectItem>
                  <SelectItem value="sick">Baja médica</SelectItem>
                  <SelectItem value="maternity">Maternidad/Paternidad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start-date">Fecha de inicio</Label>
                <Input id="start-date" type="date" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="end-date">Fecha de fin</Label>
                <Input id="end-date" type="date" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Describe brevemente el motivo de tu ausencia"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Enviar solicitud</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
