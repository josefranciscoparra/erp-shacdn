"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, XCircle, Clock, AlertCircle, User, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getPendingApprovalShifts, approveShifts, rejectShifts } from "@/server/actions/shift-publishing";

export function PendingApprovals() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const data = await getPendingApprovalShifts();
      setShifts(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar turnos pendientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleApprove = async (shiftId: string) => {
    try {
      const result = await approveShifts([shiftId]);

      if (result.success) {
        toast.success("Turno aprobado correctamente");
        loadShifts();
      } else {
        toast.error(result.errors.join(", "));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al aprobar turno");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un turno");
      return;
    }

    try {
      const result = await approveShifts(selectedIds);

      if (result.success) {
        toast.success(`${result.approvedCount} turno(s) aprobado(s)`);
        setSelectedIds([]);
        loadShifts();
      } else {
        toast.error(result.errors.join(", "));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al aprobar turnos");
    }
  };

  const handleReject = async (shiftId: string) => {
    setSelectedIds([shiftId]);
    setRejectDialogOpen(true);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un turno");
      return;
    }
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Debes proporcionar un motivo de rechazo");
      return;
    }

    try {
      const result = await rejectShifts(selectedIds, rejectReason);

      if (result.success) {
        toast.success(`${result.rejectedCount} turno(s) rechazado(s)`);
        setSelectedIds([]);
        setRejectReason("");
        setRejectDialogOpen(false);
        loadShifts();
      } else {
        toast.error(result.errors.join(", "));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al rechazar turnos");
    }
  };

  const toggleSelection = (shiftId: string) => {
    if (selectedIds.includes(shiftId)) {
      setSelectedIds(selectedIds.filter((id) => id !== shiftId));
    } else {
      setSelectedIds([...selectedIds, shiftId]);
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprobaciones Pendientes</h1>
          <p className="text-muted-foreground">Revisa y aprueba turnos antes de que sean visibles para los empleados</p>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleBulkReject}>
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar ({selectedIds.length})
            </Button>
            <Button onClick={handleBulkApprove}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aprobar ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 @xl/main:grid-cols-3">
        <Card className="to-card bg-gradient-to-t from-amber-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Aprobación</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
            <p className="text-muted-foreground text-xs">Turnos esperando revisión</p>
          </CardContent>
        </Card>

        <Card className="to-card bg-gradient-to-t from-blue-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seleccionados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedIds.length}</div>
            <p className="text-muted-foreground text-xs">Para acción en lote</p>
          </CardContent>
        </Card>

        <Card className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Más Antiguo</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts.length > 0 && shifts[0].requestedPublishAt
                ? format(new Date(shifts[0].requestedPublishAt), "d MMM", { locale: es })
                : "-"}
            </div>
            <p className="text-muted-foreground text-xs">Primera solicitud</p>
          </CardContent>
        </Card>
      </div>

      {/* Shifts list */}
      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Cargando turnos pendientes...</p>
        </div>
      ) : shifts.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="mt-4 text-lg font-semibold">No hay turnos pendientes</h3>
              <p className="text-muted-foreground text-sm">Todos los turnos han sido revisados</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => {
            const isSelected = selectedIds.includes(shift.id);
            const coveragePercentage = (shift.assignments.length / shift.requiredHeadcount) * 100;

            return (
              <Card key={shift.id} className={`transition-all ${isSelected ? "ring-primary ring-2" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(shift.id)}
                      className="mt-1 h-4 w-4 cursor-pointer"
                    />

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="text-muted-foreground h-4 w-4" />
                            <span className="font-medium">
                              {format(new Date(shift.date), "EEEE d 'de' MMMM yyyy", {
                                locale: es,
                              })}
                            </span>
                          </div>
                          <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3" />
                            {shift.startTime} - {shift.endTime} ({Math.floor(shift.durationMinutes / 60)}h{" "}
                            {shift.durationMinutes % 60}m)
                          </div>
                        </div>

                        <Badge variant="secondary">
                          {format(new Date(shift.requestedPublishAt), "d MMM HH:mm", {
                            locale: es,
                          })}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 gap-2 @xl/main:grid-cols-3">
                        {shift.position && (
                          <div className="text-sm">
                            <span className="font-medium">{shift.position.title}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="text-muted-foreground h-3 w-3" />
                          {shift.costCenter.name}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="text-muted-foreground h-3 w-3" />
                          {shift.requestedPublishBy?.name ?? "Desconocido"}
                        </div>
                      </div>

                      {/* Coverage */}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">Cobertura:</span>
                        <Badge variant={coveragePercentage >= 100 ? "default" : "destructive"}>
                          {shift.assignments.length} / {shift.requiredHeadcount} ({coveragePercentage.toFixed(0)}%)
                        </Badge>
                        {shift.assignments.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {shift.assignments.map((assignment: any) => (
                              <Badge key={assignment.id} variant="outline" className="text-xs">
                                {assignment.employee.firstName} {assignment.employee.lastName}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleReject(shift.id)}>
                        <XCircle className="mr-1 h-3 w-3" />
                        Rechazar
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(shift.id)}>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Aprobar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Turno(s)</DialogTitle>
            <DialogDescription>
              Proporciona un motivo para rechazar {selectedIds.length} turno(s). Los turnos volverán a estado borrador.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo del rechazo..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason("");
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Rechazar Turnos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
