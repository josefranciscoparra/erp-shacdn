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

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export function useSidebarItems(): NavGroup[] {
  const t = useTranslations('navigation');
  
  return [
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
        },
        {
          title: "Departamentos", 
          url: "/dashboard/departments",
          icon: Building2,
        },
        {
          title: "Puestos",
          url: "/dashboard/positions", 
          icon: Briefcase,
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
        },
        {
          title: "Contratos",
          url: "/dashboard/contracts",
          icon: FileText,
        },
        {
          title: "Documentos",
          url: "/dashboard/documents", 
          icon: FileText,
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
        },
        {
          title: "Configuración",
          url: "/dashboard/settings",
          icon: Settings,
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
            { title: t('loginV1'), url: "/auth/v1/login", newTab: true },
            { title: t('loginV2'), url: "/auth/v2/login", newTab: true },
            { title: t('registerV1'), url: "/auth/v1/register", newTab: true },
            { title: t('registerV2'), url: "/auth/v2/register", newTab: true },
          ],
        },
      ],
    },
  ];
}