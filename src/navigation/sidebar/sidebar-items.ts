import {
  Fingerprint,
  LayoutDashboard,
  ChartBar,
  Banknote,
  Settings,
  ClipboardCheck,
  Bell,
  FileSignature,
  type LucideIcon,
} from "lucide-react";

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

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        title: "Finance",
        url: "/dashboard/finance",
        icon: Banknote,
      },
    ],
  },
  {
    id: 2,
    label: "Gestión",
    items: [
      {
        title: "Aprobaciones",
        url: "/dashboard/approvals/pto",
        icon: ClipboardCheck,
      },
      {
        title: "Gestión de Firmas",
        url: "/dashboard/signatures",
        icon: FileSignature,
        isNew: true,
      },
      {
        title: "Mis Firmas",
        url: "/dashboard/me/signatures",
        icon: FileSignature,
        isNew: true,
      },
      {
        title: "Notificaciones",
        url: "/dashboard/notifications",
        icon: Bell,
      },
    ],
  },
  {
    id: 3,
    label: "Pages",
    items: [
      {
        title: "Authentication",
        url: "/auth",
        icon: Fingerprint,
        subItems: [{ title: "Login", url: "/auth/login", newTab: true }],
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
