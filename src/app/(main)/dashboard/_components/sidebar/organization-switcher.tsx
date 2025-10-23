"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Check, ChevronsUpDown, Factory, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import type { OrganizationItem } from "@/app/(main)/dashboard/admin/organizations/_components/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface OrganizationsResponse {
  organizations: OrganizationItem[];
  activeOrgId: string;
}

interface SidebarOrganizationSwitcherProps {
  currentOrgId: string;
}

export function SidebarOrganizationSwitcher({ currentOrgId }: SidebarOrganizationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(currentOrgId);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (!open || organizations.length > 0) {
      return;
    }

    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/organizations", { cache: "no-store" });
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.error ?? "No se pudieron cargar las organizaciones");
        }

        const data = (await response.json()) as OrganizationsResponse;
        setOrganizations(Array.isArray(data.organizations) ? data.organizations : []);
        setSelectedOrgId(data.activeOrgId || currentOrgId);
      } catch (error) {
        console.error("Error loading organizations", error);
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar las organizaciones");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrganizations();
  }, [open, organizations.length, currentOrgId]);

  const currentOrganization = useMemo(() => {
    return organizations.find((org) => org.id === selectedOrgId) ?? null;
  }, [organizations, selectedOrgId]);

  const handleSwitch = async (orgId: string) => {
    if (orgId === selectedOrgId) {
      setOpen(false);
      return;
    }

    try {
      setIsSwitching(true);
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", data: { orgId } }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo cambiar de organización");
      }

      setSelectedOrgId(orgId);
      setOpen(false);

      if (payload?.organization?.name) {
        toast.success(`Organización activa: ${payload.organization.name}`);
      } else {
        toast.success("Organización cambiada correctamente");
      }

      // Forzar recarga completa de la página para actualizar todos los datos
      window.location.reload();
    } catch (error) {
      console.error("Error switching organization", error);
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar de organización");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-auto w-full justify-between gap-2 px-2 py-1.5"
          disabled={isSwitching}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-medium">
              <Factory className="h-3.5 w-3.5" />
            </div>
            <span className="truncate text-xs font-medium">{currentOrganization?.name ?? "Organización"}</span>
          </div>
          <ChevronsUpDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start" side="right" sideOffset={8}>
        <div className="space-y-2">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium">Cambiar organización</p>
            <p className="text-muted-foreground text-[10px]">Selecciona una organización para gestionar</p>
          </div>
          <Separator />
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Cargando...</span>
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-muted-foreground px-2 py-6 text-center text-xs">
              Aún no tienes organizaciones configuradas.
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-0.5">
                {organizations.map((organization) => {
                  const isActive = organization.id === selectedOrgId;
                  return (
                    <button
                      key={organization.id}
                      onClick={() => handleSwitch(organization.id)}
                      disabled={isSwitching}
                      className={`hover:bg-accent flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors disabled:opacity-50 ${
                        isActive ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Check className={`h-3.5 w-3.5 shrink-0 ${isActive ? "opacity-100" : "opacity-0"}`} />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate leading-tight font-medium">{organization.name}</span>
                          {organization.vat && (
                            <span className="text-muted-foreground truncate text-[10px] leading-tight">
                              {organization.vat}
                            </span>
                          )}
                        </div>
                      </div>
                      {!organization.active && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          Inactiva
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          <Separator />
          <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start text-xs" disabled={isSwitching}>
            <Link href="/dashboard/admin/organizations">
              <Settings2 className="mr-2 h-3 w-3" />
              Gestionar organizaciones
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
