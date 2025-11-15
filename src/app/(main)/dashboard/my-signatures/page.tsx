"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signableDocumentCategoryLabels } from "@/lib/validations/signature";
import { useSignaturesStore } from "@/stores/signatures-store";

import { MySignaturesDataTable } from "./_components/my-signatures-data-table";

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
      <SectionHeader title="Firmas digitales" description="Gestiona los documentos que requieren tu firma." />

      {/* Barra de filtros compacta */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1 md:w-[300px]">
          <Label htmlFor="my-signatures-search" className="text-xs">
            Buscar
          </Label>
          <Input
            id="my-signatures-search"
            placeholder="Busca por título o categoría"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {normalizedSearch.length > 0 && normalizedSearch.length < 2 && (
            <p className="text-muted-foreground text-xs">Introduce al menos 2 caracteres para filtrar</p>
          )}
        </div>
        <div className="w-full space-y-1 md:w-[200px]">
          <Label className="text-xs">Categoría</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
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
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          {/* Select para móvil */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-[200px] @4xl/main:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="signed">Firmadas</SelectItem>
              <SelectItem value="rejected">Rechazadas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>

          {/* TabsList para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="signed">Firmadas</TabsTrigger>
            <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
            <TabsTrigger value="expired">Expiradas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </div>

        {/* Pendientes */}
        <TabsContent value="pending">
          <MySignaturesDataTable data={filtered.pending} emptyStateType="pending" />
        </TabsContent>

        {/* Firmadas */}
        <TabsContent value="signed">
          <MySignaturesDataTable data={filtered.signed} emptyStateType="signed" />
        </TabsContent>

        {/* Rechazadas */}
        <TabsContent value="rejected">
          <MySignaturesDataTable data={filtered.rejected} emptyStateType="rejected" />
        </TabsContent>

        {/* Expiradas */}
        <TabsContent value="expired">
          <MySignaturesDataTable data={filtered.expired} emptyStateType="expired" />
        </TabsContent>

        {/* Todas */}
        <TabsContent value="all">
          <MySignaturesDataTable data={allSignatures} emptyStateType="all" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
