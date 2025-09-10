"use client";

import {
  Fingerprint,
  LayoutDashboard,
  ChartBar,
  Banknote,
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
          url: "/dashboard/default",
          icon: LayoutDashboard,
        },
        {
          title: t('crm'),
          url: "/dashboard/crm",
          icon: ChartBar,
        },
        {
          title: t('finance'),
          url: "/dashboard/finance",
          icon: Banknote,
        },
      ],
    },
    {
      id: 2,
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