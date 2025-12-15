"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Role } from "@prisma/client";
import { Building2, CirclePlus, Loader2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";

import { OrganizationFormDialog, type OrganizationFormValues } from "./_components/organization-form-dialog";
import { OrganizationSetupDrawer } from "./_components/organization-setup-drawer";
import { OrganizationsTable } from "./_components/organizations-table";
import type { OrganizationItem } from "./_components/types";

interface OrganizationsResponse {
  organizations?: OrganizationItem[];
}

async function requestOrganizationAction<TResponse>(
  action: "create" | "update" | "toggle-active",
  data: unknown,
  errorMessage: string,
): Promise<TResponse> {
  const response = await fetch("/api/admin/organizations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      data,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? errorMessage);
  }

  return payload as TResponse;
}

export default function OrganizationsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupDrawerOpen, setSetupDrawerOpen] = useState(false);
  const [setupOrganization, setSetupOrganization] = useState<OrganizationItem | null>(null);
  const [isSeedingBasics, setIsSeedingBasics] = useState(false);

  const userRole = session?.user.role as Role | undefined;
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const fetchOrganizations = useCallback(
    async (options?: { showLoader?: boolean }): Promise<OrganizationItem[] | null> => {
      const shouldShowLoader = options?.showLoader ?? true;

      try {
        if (shouldShowLoader) {
          setIsLoading(true);
        }
        setError(null);
        const response = await fetch("/api/admin/organizations", { cache: "no-store" });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudieron obtener las organizaciones");
        }

        const data = payload as OrganizationsResponse;
        const list = data.organizations ?? [];
        setOrganizations(list);
        return list;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error inesperado";
        setError(message);
        return null;
      } finally {
        if (shouldShowLoader) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (status === "authenticated" && isSuperAdmin) {
      void fetchOrganizations();
    }
  }, [status, isSuperAdmin, fetchOrganizations]);

  const organizationCount = useMemo(() => organizations.length, [organizations]);

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedOrganization(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (organization: OrganizationItem) => {
    setDialogMode("edit");
    setSelectedOrganization(organization);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: OrganizationFormValues) => {
    try {
      setIsSubmitting(true);

      const isCreating = dialogMode === "create";
      const action = isCreating ? "create" : "update";

      if (!isCreating && !selectedOrganization) {
        throw new Error("No se ha seleccionado ninguna organización para editar");
      }

      const payloadData = isCreating
        ? values
        : {
            id: selectedOrganization!.id,
            ...values,
          };

      await requestOrganizationAction<unknown>(action, payloadData, "No se pudo guardar la organización");

      const successMessage = isCreating
        ? "Organización creada correctamente"
        : "Organización actualizada correctamente";

      toast.success(successMessage);

      setDialogOpen(false);
      setSelectedOrganization(null);
      await fetchOrganizations();
      router.refresh();
    } catch (error) {
      console.error("Error guardando organización", error);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la organización");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSetup = (organization: OrganizationItem) => {
    setSetupOrganization(organization);
    setSetupDrawerOpen(true);
  };

  const handleSeedBasics = async () => {
    if (!setupOrganization) {
      return;
    }

    try {
      setIsSeedingBasics(true);
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "seed-basics",
          data: {
            id: setupOrganization.id,
          },
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudieron crear los catálogos base");
      }

      const created = (payload?.created ?? {}) as {
        costCenter?: boolean;
        department?: boolean;
        scheduleTemplate?: boolean;
      };

      const summaryParts: string[] = [];
      if (created.costCenter) summaryParts.push("centro de trabajo");
      if (created.department) summaryParts.push("departamento");
      if (created.scheduleTemplate) summaryParts.push("horario");

      const refreshed = await fetchOrganizations({ showLoader: false });
      if (refreshed) {
        const updatedOrganization = refreshed.find((item) => item.id === setupOrganization.id);
        if (updatedOrganization) {
          setSetupOrganization(updatedOrganization);
        }
      }

      router.refresh();

      const successMessage =
        summaryParts.length > 0
          ? `Listo: ${summaryParts.join(", ")} ${summaryParts.length === 1 ? "creado" : "creados"} automáticamente.`
          : "Todo estaba preparado, no se generaron nuevos catálogos.";

      toast.success(successMessage);
    } catch (error) {
      console.error("Error al crear catálogos base", error);
      toast.error(error instanceof Error ? error.message : "No se pudieron crear los catálogos base");
    } finally {
      setIsSeedingBasics(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <EmptyState
        icon={<Building2 className="mx-auto h-12 w-12" />}
        title="Acceso exclusivo para SUPER_ADMIN"
        description="Solo los super administradores pueden gestionar las organizaciones."
      />
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Organizaciones"
        subtitle={
          organizationCount === 0
            ? "Aún no hay organizaciones registradas"
            : `${organizationCount} organización${organizationCount !== 1 ? "es" : ""} registradas`
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleOpenCreate} className="gap-2">
              <CirclePlus className="h-4 w-4" />
              Nueva organización
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/dashboard/admin/organizations/wizard")}
            >
              <Sparkles className="h-4 w-4" />
              Organización guiada
            </Button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-lg border shadow-xs">
        <OrganizationsTable
          organizations={organizations}
          isLoading={isLoading}
          error={error}
          onRetry={() => {
            void fetchOrganizations();
          }}
          onEdit={handleOpenEdit}
          onSetup={handleOpenSetup}
        />
      </div>

      <OrganizationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        mode={dialogMode}
        isSubmitting={isSubmitting}
        initialValues={
          selectedOrganization
            ? {
                name: selectedOrganization.name,
                vat: selectedOrganization.vat,
                active: selectedOrganization.active,
                hierarchyType: selectedOrganization.hierarchyType,
                employeeNumberPrefix: selectedOrganization.employeeNumberPrefix,
                allowedEmailDomains: selectedOrganization.allowedEmailDomains,
              }
            : undefined
        }
      />

      <OrganizationSetupDrawer
        open={setupDrawerOpen}
        onOpenChange={(open) => {
          setSetupDrawerOpen(open);
          if (!open) {
            setSetupOrganization(null);
          }
        }}
        organization={setupOrganization}
        onSeedBasics={handleSeedBasics}
        isSeeding={isSeedingBasics}
      />
    </div>
  );
}
