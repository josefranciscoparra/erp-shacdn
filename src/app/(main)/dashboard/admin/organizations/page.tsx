"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Role } from "@prisma/client";
import { Building2, CirclePlus, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";

import { OrganizationFormDialog, type OrganizationFormValues } from "./_components/organization-form-dialog";
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
  const [togglingOrgId, setTogglingOrgId] = useState<string | null>(null);

  const userRole = session?.user.role as Role | undefined;
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const fetchOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/admin/organizations", { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudieron obtener las organizaciones");
      }

      const data = payload as OrganizationsResponse;
      setOrganizations(data.organizations ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && isSuperAdmin) {
      fetchOrganizations();
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

  const handleToggleActive = async (organization: OrganizationItem) => {
    try {
      setTogglingOrgId(organization.id);
      const { organization: updated } = await requestOrganizationAction<{ organization: OrganizationItem }>(
        "toggle-active",
        {
          id: organization.id,
          active: !organization.active,
        },
        "No se pudo cambiar el estado",
      );
      setOrganizations((prev) =>
        prev.map((item) => (item.id === organization.id ? { ...item, active: updated.active } : item)),
      );

      toast.success(
        updated.active
          ? `La organización "${organization.name}" se ha activado`
          : `La organización "${organization.name}" se ha desactivado`,
      );

      router.refresh();
    } catch (error) {
      console.error("Error al cambiar estado", error);
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado de la organización");
    } finally {
      setTogglingOrgId(null);
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
        actionLabel="Nueva organización"
        onAction={handleOpenCreate}
        actionIcon={<CirclePlus className="h-4 w-4" />}
      />

      <div className="overflow-hidden rounded-lg border shadow-xs">
        <OrganizationsTable
          organizations={organizations}
          isLoading={isLoading}
          error={error}
          onRetry={fetchOrganizations}
          onEdit={handleOpenEdit}
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
              }
            : undefined
        }
      />
    </div>
  );
}
