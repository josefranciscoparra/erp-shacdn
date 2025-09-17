"use client";

import {
  Fingerprint,
  LayoutDashboard,
  ChartBar,
  Banknote,
  Users,
  Building2,
  FileText,
  Calendar,
  Settings,
  UserPlus,
  Building,
  MapPin,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePermissions } from "@/hooks/use-permissions";
import { type Permission } from "@/lib/permissions";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  permission?: Permission;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  permission?: Permission;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export function useSidebarItems(): NavGroup[] {
  const t = useTranslations('navigation');
  const { hasPermission, isAuthenticated } = usePermissions();
  
  const allItems = [
    {
      id: 1,
      label: t('dashboards'),
      items: [
        {
          title: t('default'),
          url: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      id: 2,
      label: "Organización",
      items: [
        {
          title: "Centros de coste",
          url: "/dashboard/cost-centers",
          icon: Building,
          permission: "manage_organization",
        },
        {
          title: "Departamentos", 
          url: "/dashboard/departments",
          icon: Building2,
          permission: "view_departments",
        },
        {
          title: "Puestos",
          url: "/dashboard/positions", 
          icon: Briefcase,
          permission: "manage_organization",
        },
      ],
    },
    {
      id: 3,
      label: "RRHH",
      items: [
        {
          title: "Empleados",
          url: "/dashboard/employees",
          icon: Users,
          permission: "view_employees",
        },
        {
          title: "Contratos",
          url: "/dashboard/contracts",
          icon: FileText,
          permission: "view_contracts",
        },
        {
          title: "Documentos",
          url: "/dashboard/documents", 
          icon: FileText,
          permission: "view_documents",
        },
      ],
    },
    {
      id: 4,
      label: "Configuración",
      items: [
        {
          title: "Calendarios",
          url: "/dashboard/calendars",
          icon: Calendar,
          permission: "manage_organization",
        },
        {
          title: "Configuración",
          url: "/dashboard/settings",
          icon: Settings,
          permission: "manage_organization",
        },
      ],
    },
    {
      id: 5,
      label: t('pages'),
      items: [
        {
          title: t('authentication'),
          url: "/auth",
          icon: Fingerprint,
          subItems: [
            { title: t('login'), url: "/auth/login", newTab: true },
          ],
        },
      ],
    },
  ];

  // Filtrar elementos basándose en permisos
  if (!isAuthenticated) return [];

  return allItems.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Si no tiene permiso requerido, mostrar siempre
      if (!item.permission) return true;
      // Si tiene permiso requerido, verificar que el usuario lo tenga
      return hasPermission(item.permission);
    }).map(item => ({
      ...item,
      subItems: item.subItems?.filter(subItem => {
        // Si no tiene permiso requerido, mostrar siempre
        if (!subItem.permission) return true;
        // Si tiene permiso requerido, verificar que el usuario lo tenga
        return hasPermission(subItem.permission);
      })
    }))
  })).filter(group => group.items.length > 0); // Filtrar grupos vacíos
}