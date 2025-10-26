"use client";

import { useEffect, useMemo, useState } from "react";

import { FileSignature, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { signableDocumentCategoryLabels } from "@/lib/validations/signature";
import { useSignaturesStore } from "@/stores/signatures-store";

import { MySignaturesDataTable } from "./_components/my-signatures-data-table";
import { SegmentedControl } from "./_components/segmented-control";

export default function MySignaturesPage() {
  const {
    myPendingSignatures,
    mySignedSignatures,
    myRejectedSignatures,
    myExpiredSignatures,
    urgentCount,
    isLoadingMySignatures,
    fetchMyPendingSignatures,
  } = useSignaturesStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("pending");

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filtered = useMemo(() => {
    const matchesSearch = (value: string) => {
      if (normalizedSearch.length < 2) return true;
      return value.toLowerCase().includes(normalizedSearch);
    };

    const matchSignature = (signature: (typeof myPendingSignatures)[number]) => {
      const { document } = signature;
      const searchTargets = [document.title, document.category, document.description ?? ""];
      const passesSearch = normalizedSearch.length < 2 || searchTargets.some(matchesSearch);
      const passesCategory = categoryFilter === "all" || document.category === categoryFilter;
      return passesSearch && passesCategory;
    };

    return {
      pending: myPendingSignatures.filter(matchSignature),
      signed: mySignedSignatures.filter(matchSignature),
      rejected: myRejectedSignatures.filter(matchSignature),
      expired: myExpiredSignatures.filter(matchSignature),
    };
  }, [
    myPendingSignatures,
    mySignedSignatures,
    myRejectedSignatures,
    myExpiredSignatures,
    normalizedSearch,
    categoryFilter,
  ]);

  const allSignatures = useMemo(
    () => [...filtered.pending, ...filtered.signed, ...filtered.rejected, ...filtered.expired],
    [filtered.pending, filtered.signed, filtered.rejected, filtered.expired],
  );

  const categoryOptions = [
    { value: "all", label: "Todas las categorías" },
    ...Object.entries(signableDocumentCategoryLabels).map(([value, label]) => ({ value, label })),
  ];

  useEffect(() => {
    fetchMyPendingSignatures();
  }, [fetchMyPendingSignatures]);

  if (isLoadingMySignatures) {
    return (
      <div className="@container/main flex min-h-[400px] items-center justify-center">
        <div className="space-y-2 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando mis firmas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mis Firmas</h1>
          <p className="text-muted-foreground">
            Aquí puedes ver y gestionar todos los documentos que has firmado o tienes pendientes de firmar.
          </p>
        </div>
        {urgentCount > 0 && (
          <Badge variant="destructive" className="gap-1.5 text-sm">
            <FileSignature className="h-4 w-4" />
            {urgentCount} urgente{urgentCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Filtros y Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-xs">
              <Label htmlFor="my-signatures-search" className="sr-only">
                Buscar
              </Label>
              <Input
                id="my-signatures-search"
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 pl-9"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <FileSignature className="text-muted-foreground h-4 w-4" />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SegmentedControl
            options={[
              { label: "Pendientes", value: "pending", badge: filtered.pending.length },
              { label: "Firmadas", value: "signed", badge: filtered.signed.length },
              { label: "Rechazadas", value: "rejected", badge: filtered.rejected.length },
              { label: "Expiradas", value: "expired", badge: filtered.expired.length },
              { label: "Todas", value: "all", badge: allSignatures.length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Pendientes */}
        <TabsContent value="pending">
          <MySignaturesDataTable data={filtered.pending} />
        </TabsContent>

        {/* Firmadas */}
        <TabsContent value="signed">
          <MySignaturesDataTable data={filtered.signed} />
        </TabsContent>

        {/* Rechazadas */}
        <TabsContent value="rejected">
          <MySignaturesDataTable data={filtered.rejected} />
        </TabsContent>

        {/* Expiradas */}
        <TabsContent value="expired">
          <MySignaturesDataTable data={filtered.expired} />
        </TabsContent>

        {/* Todas */}
        <TabsContent value="all">
          <MySignaturesDataTable data={allSignatures} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
