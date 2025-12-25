"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";

import { Check, ChevronsUpDown, Factory, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { switchActiveOrganization } from "@/server/actions/org-switcher";

type SidebarOrgMembership = {
  orgId: string;
  orgName: string | null;
  isDefault: boolean;
};

interface SidebarOrganizationSwitcherProps {
  currentOrgId: string;
  memberships: SidebarOrgMembership[];
  showManageLink?: boolean;
}

export function SidebarOrganizationSwitcher({
  currentOrgId,
  memberships,
  showManageLink = false,
}: SidebarOrganizationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState(currentOrgId);
  const [isSwitching, startTransition] = useTransition();

  useEffect(() => {
    setSelectedOrgId(currentOrgId);
  }, [currentOrgId]);

  const organizations = useMemo(
    () =>
      memberships.map((membership) => ({
        id: membership.orgId,
        name: membership.orgName ?? "Organización",
      })),
    [memberships],
  );

  const currentOrganization = useMemo(() => {
    return organizations.find((org) => org.id === selectedOrgId) ?? organizations[0] ?? null;
  }, [organizations, selectedOrgId]);

  const handleSwitch = (orgId: string) => {
    if (orgId === selectedOrgId) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      try {
        await switchActiveOrganization(orgId);
        setSelectedOrgId(orgId);
        setOpen(false);
        toast.success("Organización cambiada correctamente");
        window.location.reload();
      } catch (error) {
        console.error("Error switching organization", error);
        toast.error(error instanceof Error ? error.message : "No se pudo cambiar de organización");
      }
    });
  };

  if (organizations.length <= 1) {
    return null;
  }

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
            <span className="truncate text-xs font-medium">
              {currentOrganization?.name ?? "Selecciona una organización"}
            </span>
          </div>
          {isSwitching ? (
            <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronsUpDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end" side="right" sideOffset={8}>
        <Command>
          <CommandInput placeholder="Buscar organización..." />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>No se encontró ninguna organización.</CommandEmpty>
            <CommandGroup heading="Organizaciones">
              {organizations.map((organization) => {
                const isActive = organization.id === selectedOrgId;
                return (
                  <CommandItem
                    key={organization.id}
                    value={organization.name}
                    onSelect={() => handleSwitch(organization.id)}
                    disabled={isSwitching}
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", isActive ? "opacity-100" : "opacity-0")} />
                    <span className="truncate font-medium">{organization.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {showManageLink && (
            <>
              <CommandSeparator />
              <div className="p-1">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start text-xs"
                  disabled={isSwitching}
                >
                  <Link href="/dashboard/admin/organizations">
                    <Settings2 className="mr-2 h-3 w-3" />
                    Gestionar organizaciones
                  </Link>
                </Button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
