"use client";

import { useMemo } from "react";

import { Download, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Contract, ContractPauseHistoryEntry } from "@/stores/contracts-store";

interface PauseHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getActionLabel = (entry: ContractPauseHistoryEntry) => (entry.action === "PAUSE" ? "Pausa" : "Reanudación");

const getActionClasses = (entry: ContractPauseHistoryEntry) =>
  entry.action === "PAUSE"
    ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
    : "bg-green-500/10 text-green-700 dark:text-green-400";

const getPeriodLabel = (entry: ContractPauseHistoryEntry) => {
  if (entry.action !== "PAUSE") return "—";
  const startLabel = formatDate(entry.startDate);
  if (!entry.endDate) return `${startLabel} — En curso`;
  return `${startLabel} — ${formatDate(entry.endDate)}`;
};

const getPerformerLabel = (entry: ContractPauseHistoryEntry) =>
  entry.performedByName ?? entry.performedByEmail ?? entry.performedBy;

export function PauseHistoryDialog({ open, onOpenChange, contract }: PauseHistoryDialogProps) {
  const historyEntries = useMemo(() => {
    if (!contract?.pauseHistory?.length) return [];
    return [...contract.pauseHistory].sort(
      (a, b) => new Date(b.performedAt ?? b.startDate).getTime() - new Date(a.performedAt ?? a.startDate).getTime(),
    );
  }, [contract]);

  const handleExport = () => {
    if (!contract) return;
    const link = document.createElement("a");
    link.href = `/api/contracts/${contract.id}/pause-history/export`;
    link.rel = "noopener";
    link.click();
    link.remove();
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[880px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="text-muted-foreground h-5 w-5" />
            Historial de pausas
            <Badge variant="secondary" className="ml-2 text-xs">
              {historyEntries.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>Registro de pausas y reanudaciones del contrato fijo discontinuo.</DialogDescription>
        </DialogHeader>

        {historyEntries.length === 0 ? (
          <div className="bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
            No hay pausas registradas para este contrato.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="secondary" className={getActionClasses(entry)}>
                        {getActionLabel(entry)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(entry.performedAt ?? entry.startDate)}</TableCell>
                    <TableCell className="text-sm">{getPeriodLabel(entry)}</TableCell>
                    <TableCell className="text-sm">{entry.reason ?? "—"}</TableCell>
                    <TableCell className="text-sm">{getPerformerLabel(entry)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar XLSX
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
