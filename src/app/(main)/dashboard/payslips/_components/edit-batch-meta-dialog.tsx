"use client";

import { useMemo, useState } from "react";

import { Calendar, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updatePayslipBatchMeta, type PayslipBatchListItem } from "@/server/actions/payslips";

interface EditBatchMetaDialogProps {
  batch: PayslipBatchListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, index) => {
    const year = currentYear - index;
    return { value: year.toString(), label: year.toString() };
  });
}

export function EditBatchMetaDialog({ batch, open, onOpenChange, onSuccess }: EditBatchMetaDialogProps) {
  const EMPTY_VALUE = "none";

  const [month, setMonth] = useState<string>(batch.month ? batch.month.toString() : EMPTY_VALUE);
  const [year, setYear] = useState<string>(batch.year ? batch.year.toString() : EMPTY_VALUE);
  const [label, setLabel] = useState(batch.label ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const yearOptions = useMemo(() => buildYearOptions(), []);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const normalizedMonth = month === EMPTY_VALUE ? null : parseInt(month, 10);
      const normalizedYear = year === EMPTY_VALUE ? null : parseInt(year, 10);

      if ((normalizedMonth && !normalizedYear) || (normalizedYear && !normalizedMonth)) {
        toast.error("Define mes y año para el periodo completo");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        month: normalizedMonth,
        year: normalizedYear,
        label: label.trim() ? label.trim() : null,
      };
      const result = await updatePayslipBatchMeta(batch.id, payload);
      if (result.success) {
        toast.success("Metadatos actualizados correctamente");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error ?? "No se pudieron guardar los cambios");
      }
    } catch {
      toast.error("Error al guardar los cambios");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setMonth(batch.month ? batch.month.toString() : EMPTY_VALUE);
    setYear(batch.year ? batch.year.toString() : EMPTY_VALUE);
    setLabel(batch.label ?? "");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleReset();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Editar periodo del lote
          </DialogTitle>
          <DialogDescription>
            Ajusta el mes, el año o la etiqueta del lote antes de publicar las nóminas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_VALUE}>Sin periodo</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_VALUE}>Sin año</SelectItem>
                  {yearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Etiqueta (opcional)</Label>
            <div className="flex items-center gap-2">
              <Tag className="text-muted-foreground h-4 w-4" />
              <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Paga extra 2024" />
            </div>
            <p className="text-muted-foreground text-xs">La etiqueta ayuda a identificar lotes especiales.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
