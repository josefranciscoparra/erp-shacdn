"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyPayslips, getMyPayslipYears } from "@/server/actions/payslips";

import { PayslipsTable } from "./_components/payslips-table";

interface Payslip {
  id: string;
  fileName: string;
  month: number | null;
  year: number | null;
  createdAt: Date;
}

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar años disponibles
  useEffect(() => {
    async function loadYears() {
      const result = await getMyPayslipYears();
      if (result.success && result.years) {
        setYears(result.years);
      }
    }
    loadYears();
  }, []);

  // Cargar nóminas
  const loadPayslips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const yearParam = selectedYear === "all" ? undefined : parseInt(selectedYear);
      const result = await getMyPayslips({ year: yearParam, page: 1, pageSize: 1000 });
      if (result.success && result.payslips) {
        setPayslips(result.payslips);
      } else {
        setError(result.error ?? "Error desconocido");
      }
    } catch {
      setError("Error al cargar tus nóminas");
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Mis Nóminas" description="Consulta y descarga tus nóminas fácilmente." />

      {/* Mostrar error si existe */}
      {error && (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-destructive text-sm font-medium">Error al cargar datos</p>
          <p className="text-destructive/80 text-sm">{error}</p>
        </Card>
      )}

      {/* Filtro de año */}
      <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los años</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : (
        <PayslipsTable payslips={payslips} yearFilter={selectedYear === "all" ? undefined : parseInt(selectedYear)} />
      )}
    </div>
  );
}
