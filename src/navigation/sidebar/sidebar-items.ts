import {
  Fingerprint,
  ChartBar,
  Banknote,
  Settings,
  ClipboardCheck,
  Bell,
  FileSignature,
  FileText,
  Network,
  Receipt,
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
        title: "Organigrama",
        url: "/dashboard/organization-chart",
        icon: Network,
        isNew: true,
      },
      {
        title: "Aprobaciones",
        url: "/dashboard/approvals",
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
        title: "Mis Gastos",
        url: "/dashboard/me/expenses",
        icon: Receipt,
        isNew: true,
      },
      {
        title: "Notificaciones",
        url: "/dashboard/notifications",
        icon: Bell,
      },
      {
        title: "Informes y KPIs",
        url: "/dashboard/reports",
        icon: FileText,
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
