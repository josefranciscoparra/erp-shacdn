"use client";

import { useEffect, useMemo, useState } from "react";

import { FileSignature, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mis Firmas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Documentos que requieren tu firma electrónica</p>
        </div>
        {urgentCount > 0 && (
          <Badge variant="destructive" className="gap-1.5">
            <FileSignature className="h-3.5 w-3.5" />
            {urgentCount} urgente{urgentCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr,1fr,auto]">
        <div className="space-y-1">
          <Label htmlFor="my-signatures-search">Buscar</Label>
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
        <div className="space-y-1">
          <Label>Categoría</Label>
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
        <div className="flex items-end justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setCategoryFilter("all");
            }}
          >
            Limpiar filtros
          </Button>
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
              <SelectItem value="pending">Pendientes ({filtered.pending.length})</SelectItem>
              <SelectItem value="signed">Firmadas ({filtered.signed.length})</SelectItem>
              <SelectItem value="rejected">Rechazadas ({filtered.rejected.length})</SelectItem>
              <SelectItem value="expired">Expiradas ({filtered.expired.length})</SelectItem>
              <SelectItem value="all">Todas ({allSignatures.length})</SelectItem>
            </SelectContent>
          </Select>

          {/* TabsList para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="pending" className="gap-2">
              Pendientes
              {filtered.pending.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filtered.pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signed" className="gap-2">
              Firmadas
              {filtered.signed.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filtered.signed.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              Rechazadas
              {filtered.rejected.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filtered.rejected.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-2">
              Expiradas
              {filtered.expired.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filtered.expired.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              Todas
              {allSignatures.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {allSignatures.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Pendientes */}
        <TabsContent value="pending" className="space-y-4">
          <MySignaturesDataTable data={filtered.pending} />
        </TabsContent>

        {/* Firmadas */}
        <TabsContent value="signed" className="space-y-4">
          <MySignaturesDataTable data={filtered.signed} />
        </TabsContent>

        {/* Rechazadas */}
        <TabsContent value="rejected" className="space-y-4">
          <MySignaturesDataTable data={filtered.rejected} />
        </TabsContent>

        {/* Expiradas */}
        <TabsContent value="expired" className="space-y-4">
          <MySignaturesDataTable data={filtered.expired} />
        </TabsContent>

        {/* Todas */}
        <TabsContent value="all" className="space-y-4">
          <MySignaturesDataTable data={allSignatures} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
