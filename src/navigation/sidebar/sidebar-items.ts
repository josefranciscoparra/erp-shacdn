import {
  Fingerprint,
  ChartBar,
  Banknote,
  Settings,
  ClipboardCheck,
  Bell,
  FileSignature,
  Network,
  Receipt,
  CalendarClock,
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
    label: "HR & Organización",
    items: [
      {
        title: "Organigrama",
        url: "/dashboard/organization-chart",
        icon: Network,
        isNew: true,
      },
      {
        title: "Turnos",
        url: "/dashboard/shifts",
        icon: CalendarClock,
        isNew: true,
        subItems: [
          { title: "Dashboard", url: "/dashboard/shifts" },
          { title: "Calendario", url: "/dashboard/shifts/calendar" },
          { title: "Cobertura", url: "/dashboard/shifts/coverage" },
          { title: "Publicar", url: "/dashboard/shifts/publish" },
          { title: "Aprobaciones", url: "/dashboard/shifts/approvals" },
          { title: "Informes", url: "/dashboard/shifts/reports" },
          { title: "Plantillas", url: "/dashboard/shifts/templates" },
          { title: "Configuración", url: "/dashboard/shifts/settings" },
        ],
      },
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
    ],
  },
  {
    id: 3,
    label: "Mi Espacio",
    items: [
      {
        title: "Mis Turnos",
        url: "/dashboard/me/shifts",
        icon: CalendarClock,
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
    ],
  },
  {
    id: 4,
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
