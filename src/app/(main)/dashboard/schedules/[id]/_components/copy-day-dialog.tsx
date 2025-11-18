"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { copyWorkDayPattern } from "@/server/actions/schedules-v2";

interface CopyDayDialogProps {
  periodId: string;
  sourceDayOfWeek: number;
  sourceDayLabel: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function CopyDayDialog({ periodId, sourceDayOfWeek, sourceDayLabel }: CopyDayDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const router = useRouter();

  const availableDays = DAYS_OF_WEEK.filter((day) => day.value !== sourceDayOfWeek);

  function toggleDay(dayValue: number) {
    setSelectedDays((prev) => (prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]));
  }

  function selectWeekdays() {
    const weekdays = [1, 2, 3, 4, 5].filter((d) => d !== sourceDayOfWeek);
    setSelectedDays(weekdays);
  }

  function selectAll() {
    setSelectedDays(availableDays.map((d) => d.value));
  }

  function clearAll() {
    setSelectedDays([]);
  }

  async function handleCopy() {
    if (selectedDays.length === 0) {
      toast.error("Selecciona al menos un día", {
        description: "Debes seleccionar al menos un día de destino",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await copyWorkDayPattern(periodId, sourceDayOfWeek, selectedDays);

      if (result.success) {
        toast.success("Horario copiado", {
          description: `El horario de ${sourceDayLabel} se ha copiado a ${selectedDays.length} día${selectedDays.length > 1 ? "s" : ""}`,
        });
        setOpen(false);
        setSelectedDays([]);
        router.refresh();
      } else {
        toast.error("Error al copiar horario", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch (error) {
      console.error("Error copying day pattern:", error);
      toast.error("Error al copiar horario", {
        description: "Ha ocurrido un error al copiar el horario",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copiar día</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Copiar Horario de {sourceDayLabel}</DialogTitle>
          <DialogDescription>
            Selecciona los días a los que quieres copiar el horario de {sourceDayLabel}. Esto sobrescribirá la
            configuración existente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botones de acceso rápido */}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectWeekdays}>
              L-V
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              Todos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              Limpiar
            </Button>
          </div>

          {/* Lista de días */}
          <div className="space-y-3 rounded-lg border p-4">
            {availableDays.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={selectedDays.includes(day.value)}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <Label htmlFor={`day-${day.value}`} className="flex-1 cursor-pointer text-sm font-normal">
                  {day.label}
                </Label>
              </div>
            ))}
          </div>

          {selectedDays.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Se copiarán los horarios a:{" "}
                <strong className="text-foreground">
                  {selectedDays.length} día{selectedDays.length > 1 ? "s" : ""}
                </strong>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleCopy} disabled={isLoading || selectedDays.length === 0}>
            {isLoading ? "Copiando..." : "Copiar Horario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
