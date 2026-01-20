"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Loader2, Filter, ExternalLink, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { getMyApprovals, type PendingApprovalItem } from "@/server/actions/approvals";

import { ApprovalDialog } from "./_components/approval-dialog";
import { ApprovalsKpiCards } from "./_components/approvals-kpi-cards";
import { ApprovalsTable } from "./_components/approvals-table";

type GetMyApprovalsResult = Awaited<ReturnType<typeof getMyApprovals>>;

function collectAdditionalOrgItems(results: PromiseSettledResult<GetMyApprovalsResult>[]): {
  items: PendingApprovalItem[];
  partialFailure: boolean;
} {
  const items: PendingApprovalItem[] = [];
  let partialFailure = false;

  for (const settled of results) {
    const fulfilled = settled.status === "fulfilled";
    if (!fulfilled || !settled.value.success) {
      partialFailure = true;
      const errorMessage = fulfilled ? settled.value.error : settled.reason;
      console.error("Error al cargar aprobaciones de otra organización:", errorMessage);
      continue;
    }

    items.push(...settled.value.items);
  }

  return { items, partialFailure };
}

export default function ApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();
  const rawOrgIdFromQuery = searchParams.get("orgId");
  const orgIdFromQuery = rawOrgIdFromQuery?.trim() ? rawOrgIdFromQuery : null;
  const searchParamsString = searchParams.toString();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"pending" | "history">("pending");
  const [filterType, setFilterType] = useState("all");
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>(orgIdFromQuery ?? "all");
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  // Estado para el diálogo de aprobación
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const canViewAllExpenses = hasPermission("view_expense_approvals_all");
  const includeAllExpenses = canViewAllExpenses && showAllExpenses;

  const normalizedOrgId = useMemo(
    () => (selectedOrganization === "all" ? undefined : selectedOrganization),
    [selectedOrganization],
  );

  useEffect(() => {
    const nextSelection = orgIdFromQuery ?? "all";
    setSelectedOrganization((prev) => (prev === nextSelection ? prev : nextSelection));
  }, [orgIdFromQuery]);

  useEffect(() => {
    if (!canViewAllExpenses && showAllExpenses) {
      setShowAllExpenses(false);
    }
  }, [canViewAllExpenses, showAllExpenses]);

  useEffect(() => {
    const currentOrgId = orgIdFromQuery;
    if (selectedOrganization === "all" && !currentOrgId) {
      return;
    }
    if (selectedOrganization !== "all" && currentOrgId === selectedOrganization) {
      return;
    }

    const params = new URLSearchParams(searchParamsString);
    if (selectedOrganization === "all") {
      params.delete("orgId");
    } else {
      params.set("orgId", selectedOrganization);
    }

    const queryString = params.toString();
    router.replace(queryString ? `/dashboard/approvals?${queryString}` : "/dashboard/approvals");
  }, [orgIdFromQuery, router, searchParamsString, selectedOrganization]);

  const loadApprovals = useCallback(
    async (orgOverride?: string) => {
      setLoading(true);
      try {
        const targetOrgId = orgOverride ?? normalizedOrgId;
        const options = includeAllExpenses ? { includeAllExpenses: true } : undefined;
        const result = await getMyApprovals(selectedTab, targetOrgId, options);

        if (!result.success) {
          setItems([]);
          setError(result.error ?? "Error al cargar aprobaciones");
          return;
        }

        const availableOrganizations = result.organizations ?? [];
        setOrganizations(availableOrganizations);

        if (selectedOrganization !== "all" && !availableOrganizations.some((org) => org.id === selectedOrganization)) {
          setSelectedOrganization("all");
        }

        let aggregatedItems = [...result.items];
        let hadPartialFailures = false;
        const resolvedBaseOrgId = result.activeOrgId ?? targetOrgId ?? availableOrganizations[0]?.id ?? null;
        const shouldLoadAll = selectedOrganization === "all" && availableOrganizations.length > 0;

        if (shouldLoadAll) {
          const otherOrgIds = availableOrganizations
            .map((org) => org.id)
            .filter((orgId) => (resolvedBaseOrgId ? orgId !== resolvedBaseOrgId : true));

          if (otherOrgIds.length > 0) {
            const otherResults = await Promise.allSettled(
              otherOrgIds.map((orgId) => getMyApprovals(selectedTab, orgId, options)),
            );
            const { items: additionalItems, partialFailure } = collectAdditionalOrgItems(otherResults);
            if (partialFailure) {
              hadPartialFailures = true;
            }
            if (additionalItems.length > 0) {
              aggregatedItems = aggregatedItems.concat(additionalItems);
            }
          }
        }

        aggregatedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(aggregatedItems);
        setError(
          hadPartialFailures ? "Algunas organizaciones no se pudieron cargar por completo. Intenta nuevamente." : null,
        );
      } catch (error) {
        console.error("Error al cargar aprobaciones:", error);
        setItems([]);
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    },
    [includeAllExpenses, normalizedOrgId, selectedOrganization, selectedTab],
  );

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleReview = (item: PendingApprovalItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    // Recargar la lista tras aprobar/rechazar
    // Forzamos refresco de router para invalidar caché de servidor
    router.refresh();
    // Y recargamos los datos locales
    loadApprovals();
  };

  const organizationOptions = useMemo(() => {
    if (organizations.length === 0) {
      return [];
    }
    return organizations.map((org) => ({
      value: org.id,
      label: org.name,
    }));
  }, [organizations]);

  return (
    <PermissionGuard
      permission="approve_requests"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Bandeja de Aprobaciones"
            description="Revisa y gestiona las solicitudes pendientes de tu equipo."
          />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            title="Bandeja de Aprobaciones"
            description="Revisa y gestiona las solicitudes pendientes de tu equipo."
          />
          <Button variant="outline" size="sm" asChild className="hidden shrink-0 gap-2 sm:flex">
            <Link href="/dashboard/approvals/expenses">
              <ExternalLink className="h-4 w-4" />
              Gestión Avanzada Gastos
            </Link>
          </Button>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <Card className="border-destructive bg-destructive/10 p-4">
            <p className="text-destructive text-sm font-medium">Error al cargar datos</p>
            <p className="text-destructive/80 text-sm">{error}</p>
          </Card>
        )}

        {/* KPIs (Solo mostrar en Pendientes para no confundir, o mostrar estadísticas diferentes) */}
        {selectedTab === "pending" && <ApprovalsKpiCards items={items} loading={loading} />}

        {/* Tabs y Filtros */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "pending" | "history")} className="w-full">
          <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
            {/* Selector Tabs (Pendientes / Historial) */}
            <div className="flex items-center gap-3">
              {/* Móvil */}
              <Select value={selectedTab} onValueChange={(v) => setSelectedTab(v as "pending" | "history")}>
                <SelectTrigger className="w-[200px] @4xl/main:hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="history">Historial</SelectItem>
                </SelectContent>
              </Select>

              {/* Desktop */}
              <TabsList className="hidden @4xl/main:flex">
                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
              </TabsList>
            </div>

            {/* Filtro Tipo */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="text-muted-foreground hidden h-4 w-4 sm:block" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="PTO">Ausencias</SelectItem>
                    <SelectItem value="MANUAL_TIME_ENTRY">Fichajes</SelectItem>
                    <SelectItem value="TIME_BANK">Bolsa de horas</SelectItem>
                    <SelectItem value="EXPENSE">Gastos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {organizationOptions.length > 1 && (
                <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Selecciona empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las organizaciones</SelectItem>
                    {organizationOptions.map((org) => (
                      <SelectItem key={org.value} value={org.value}>
                        {org.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {canViewAllExpenses && (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Switch id="show-all-expenses" checked={showAllExpenses} onCheckedChange={setShowAllExpenses} />
                  <div className="flex flex-col">
                    <Label htmlFor="show-all-expenses" className="text-xs font-medium">
                      Ver gastos no asignados
                    </Label>
                    <span className="text-muted-foreground text-[11px]">Solo afecta a gastos</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contenido Pendientes */}
          <TabsContent value="pending" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ApprovalsTable items={items} filterType={filterType} onReview={handleReview} onSuccess={handleSuccess} />
            )}
          </TabsContent>

          {/* Contenido Historial */}
          <TabsContent value="history" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ApprovalsTable items={items} filterType={filterType} onReview={handleReview} onSuccess={handleSuccess} />
            )}
          </TabsContent>
        </Tabs>

        {/* Diálogo de Aprobación */}
        <ApprovalDialog item={selectedItem} open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleSuccess} />
      </div>
    </PermissionGuard>
  );
}
