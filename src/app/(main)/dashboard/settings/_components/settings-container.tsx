"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { Role } from "@prisma/client";
import {
  Blocks,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  Cpu,
  Database,
  FileCheck,
  Fingerprint,
  MapPin,
  Megaphone,
  MessageSquare,
  PiggyBank,
  Receipt,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_MODULE_AVAILABILITY, type ModuleAvailability } from "@/lib/organization-modules";

import { AbsenceTypesTab } from "./absence-types-tab";
import { AdminTab } from "./admin-tab";
import { ApprovalSettingsTab } from "./approval-settings-tab";
import { ChatTab } from "./chat-tab";
import { ExpensesTab } from "./expenses-tab";
import { GeolocationTab } from "./geolocation-tab";
import { ModulesTab } from "./modules-tab";
import { OrganizationTab } from "./organization-tab";
import { PermissionOverridesTab } from "./permission-overrides-tab";
import { SettingsSidebar } from "./settings-sidebar";
import { ShiftsTab } from "./shifts-tab";
import { StorageTab } from "./storage-tab";
import { SystemInfoTab } from "./system-info-tab";
import { TimeBankTab } from "./time-bank-tab";
import { TimeClockValidationsTab } from "./time-clock-validations-tab";
import { VacationsTab } from "./vacations-tab";
import { WhistleblowingTab } from "./whistleblowing-tab";

interface OrgSettings {
  geolocationEnabled: boolean;
  chatEnabled: boolean;
  shiftsEnabled: boolean;
  whistleblowingEnabled: boolean;
  expenseMode: string;
}

interface SettingsContainerProps {
  userRole: Role;
  orgSettings: OrgSettings;
  moduleAvailability?: ModuleAvailability;
  variant?: "hr" | "superadmin";
}

const ROLES_WITH_PERMISSION_OVERRIDES: Role[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"];

export function SettingsContainer({
  userRole,
  orgSettings,
  moduleAvailability,
  variant = "hr",
}: SettingsContainerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const canManagePermissionOverrides = ROLES_WITH_PERMISSION_OVERRIDES.includes(userRole);
  const availability = moduleAvailability ?? DEFAULT_MODULE_AVAILABILITY;
  const isSuperadminView = variant === "superadmin";

  // Definición de la estructura del menú
  const menuStructure = useMemo(() => {
    if (isSuperadminView) {
      const moduleItems = [
        {
          label: "Módulos",
          value: "modules",
          icon: <Blocks className="h-4 w-4" />,
          show: true,
        },
      ];

      const systemItems = [
        {
          label: "Storage",
          value: "storage",
          icon: <Database className="h-4 w-4" />,
          show: isSuperAdmin,
        },
        {
          label: "Sistema",
          value: "system",
          icon: <Cpu className="h-4 w-4" />,
          show: isSuperAdmin,
        },
        {
          label: "Admin Zone",
          value: "admin",
          icon: <UserCog className="h-4 w-4" />,
          show: isSuperAdmin,
        },
      ];

      const categories = [
        {
          category: "Módulos",
          items: moduleItems.filter((item) => item.show),
        },
      ];

      const activeSystem = systemItems.filter((item) => item.show);
      if (activeSystem.length > 0) {
        categories.push({
          category: "Administración",
          items: activeSystem,
        });
      }

      return categories;
    }

    // 1. BLOQUE NEGOCIO / OPERATIVA (Visible para RRHH y Admins)
    const businessItems = [
      {
        label: "Organización",
        value: "organization",
        icon: <Building2 className="h-4 w-4" />,
        show: true, // Siempre visible
      },
    ];

    const timeManagementItems = [
      {
        label: "Tipos de Ausencia",
        value: "absence-types",
        icon: <Briefcase className="h-4 w-4" />,
        show: true, // Core
      },
      {
        label: "Vacaciones",
        value: "vacations",
        icon: <CalendarDays className="h-4 w-4" />,
        show: true, // Core
      },
      {
        label: "Turnos",
        value: "shifts",
        icon: <Clock className="h-4 w-4" />,
        show: availability.shifts, // Solo si módulo disponible
      },
      {
        label: "Bolsa de Horas",
        value: "time-bank",
        icon: <PiggyBank className="h-4 w-4" />,
        show: true, // Core (o podría ser toggleable en futuro)
      },
      {
        label: "Geolocalización",
        value: "geolocation",
        icon: <MapPin className="h-4 w-4" />,
        show: true, // Core siempre disponible
      },
      {
        label: "Fichajes",
        value: "validations",
        icon: <Fingerprint className="h-4 w-4" />,
        show: true, // Core
      },
    ];

    const workflowItems = [
      {
        label: "Aprobaciones",
        value: "approvals",
        icon: <FileCheck className="h-4 w-4" />,
        show: true, // Core
      },
      {
        label: "Gastos",
        value: "expenses",
        icon: <Receipt className="h-4 w-4" />,
        show: availability.expenses,
      },
      {
        label: "Canal Ético",
        value: "whistleblowing",
        icon: <Megaphone className="h-4 w-4" />,
        show: availability.whistleblowing,
      },
      {
        label: "Chat",
        value: "chat",
        icon: <MessageSquare className="h-4 w-4" />,
        show: availability.chat,
      },
    ];

    // 2. BLOQUE SISTEMA (Solo Superadmin)
    const systemItems = [
      {
        label: "Permisos por Rol",
        value: "permissions",
        icon: <ShieldCheck className="h-4 w-4" />,
        show: canManagePermissionOverrides, // Solo ciertos roles
      },
    ];

    // Construir categorías
    const categories = [];

    // CATEGORÍA 1: GENERAL & TIEMPO (RRHH)
    categories.push({
      category: "Gestión",
      items: [...businessItems.filter((i) => i.show), ...timeManagementItems.filter((i) => i.show)],
    });

    // CATEGORÍA 2: FLUJOS (RRHH)
    const activeWorkflows = workflowItems.filter((i) => i.show);
    if (activeWorkflows.length > 0) {
      categories.push({
        category: "Flujos & Módulos",
        items: activeWorkflows,
      });
    }

    // CATEGORÍA 3: SISTEMA (IT / SUPERADMIN)
    const activeSystem = systemItems.filter((i) => i.show);
    if (activeSystem.length > 0) {
      categories.push({
        category: "Administración",
        items: activeSystem,
      });
    }

    return categories;
  }, [availability, canManagePermissionOverrides, isSuperAdmin, isSuperadminView]);

  // Aplanar items para validación y selección
  const allItems = useMemo(() => menuStructure.flatMap((cat) => cat.items), [menuStructure]);

  const initialTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && allItems.some((item) => item.value === tabParam)) {
      return tabParam;
    }
    // Default fallback: first available item
    const firstItem = allItems[0];
    return firstItem ? firstItem.value : "organization";
  }, [searchParams, allItems]);

  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("tab", value);
    router.replace(`?${params.toString()}`);
  };

  useEffect(() => {
    const isActiveValid = allItems.some((item) => item.value === activeTab);
    if (!isActiveValid) {
      const firstItem = allItems[0];
      const fallbackTab = firstItem ? firstItem.value : "organization";
      setActiveTab(fallbackTab);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", fallbackTab);
      router.replace(`?${params.toString()}`);
    }
  }, [activeTab, allItems, router, searchParams]);

  // Renderizado condicional del contenido
  const renderContent = () => {
    switch (activeTab) {
      // Gestión
      case "organization":
        return <OrganizationTab />;
      case "absence-types":
        return <AbsenceTypesTab />;
      case "vacations":
        return <VacationsTab />;
      case "shifts":
        return <ShiftsTab />;
      case "time-bank":
        return <TimeBankTab />;
      case "geolocation":
        return <GeolocationTab />;
      case "validations":
        return <TimeClockValidationsTab />;

      // Flujos
      case "approvals":
        return <ApprovalSettingsTab />;
      case "expenses":
        return <ExpensesTab />;
      case "whistleblowing":
        return <WhistleblowingTab />;
      case "chat":
        return <ChatTab />;

      case "modules":
        return (
          <ModulesTab
            initialAvailability={availability}
            initialEnabled={{
              chatEnabled: orgSettings.chatEnabled,
              shiftsEnabled: orgSettings.shiftsEnabled,
              geolocationEnabled: orgSettings.geolocationEnabled,
              whistleblowingEnabled: orgSettings.whistleblowingEnabled,
            }}
          />
        );

      // Admin
      case "permissions":
        return <PermissionOverridesTab />;
      case "storage":
        return <StorageTab />;
      case "system":
        return <SystemInfoTab />;
      case "admin":
        return <AdminTab />;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* Navegación Desktop */}
      <aside className="hidden min-h-[calc(100vh-200px)] w-64 shrink-0 border-r pr-6 md:block">
        <SettingsSidebar items={menuStructure} activeTab={activeTab} onTabChange={handleTabChange} />
      </aside>

      {/* Navegación Móvil */}
      <div className="mb-4 w-full md:hidden">
        <Select value={activeTab} onValueChange={handleTabChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona una sección" />
          </SelectTrigger>
          <SelectContent>
            {menuStructure.map((group) => (
              <div key={group.category}>
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-semibold opacity-50">
                  {group.category}
                </div>
                {group.items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contenido Principal */}
      <main className="min-w-0 flex-1">
        <div className="max-w-4xl space-y-6">
          <SectionHeader
            title={allItems.find((i) => i.value === activeTab)?.label ?? "Configuración"}
            subtitle="Gestiona las preferencias y reglas"
          />

          <div className="mt-6">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
}
