"use client";

import { useCallback, useEffect, useState } from "react";

import { FileText, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMyPayslips, getMyPayslipYears } from "@/server/actions/payslips";

import { PayslipList } from "./_components/payslip-list";

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
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [yearsLoaded, setYearsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Cargar años disponibles
  useEffect(() => {
    async function loadYears() {
      const result = await getMyPayslipYears();
      if (result.success && result.years) {
        setYears(result.years);
        if (result.years.length > 0) {
          setSelectedYear(result.years[0]);
        }
      }
      setYearsLoaded(true);
    }
    loadYears();
  }, []);

  // Cargar nóminas
  const loadPayslips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyPayslips({ year: selectedYear, page, pageSize: 20 });
      if (result.success && result.payslips) {
        setPayslips(result.payslips);
        setTotal(result.total ?? 0);
      } else {
        setError(result.error ?? "Error desconocido");
      }
    } catch {
      setError("Error al cargar tus nóminas");
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, page]);

  useEffect(() => {
    // Cargar nóminas cuando se selecciona un año O cuando ya cargamos años y no hay ninguno
    if (selectedYear !== undefined || (yearsLoaded && years.length === 0)) {
      loadPayslips();
    }
  }, [loadPayslips, selectedYear, yearsLoaded, years.length]);

  if (isLoading && payslips.length === 0) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Mis Nóminas" subtitle="Consulta y descarga tus nóminas" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando nóminas...</span>
        </div>
      </div>
    );
  }

  if (error && payslips.length === 0) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Mis Nóminas" subtitle="Consulta y descarga tus nóminas" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis Nóminas"
        subtitle="Consulta y descarga tus nóminas"
        action={
          years.length > 0 && (
            <Select
              value={selectedYear?.toString()}
              onValueChange={(v) => {
                setSelectedYear(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {payslips.length === 0 ? (
        <EmptyState
          icon={<FileText className="mx-auto h-12 w-12" />}
          title="No tienes nóminas"
          description={
            selectedYear
              ? `No hay nóminas disponibles para el año ${selectedYear}`
              : "Aún no tienes nóminas disponibles"
          }
        />
      ) : (
        <PayslipList payslips={payslips} total={total} page={page} onPageChange={setPage} isLoading={isLoading} />
      )}
    </div>
  );
}
