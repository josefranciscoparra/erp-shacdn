"use client";

import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Calendar,
  Settings,
  Building,
  Briefcase,
  FolderOpen,
  Clock,
  CalendarDays,
  Timer,
  CheckSquare,
  UserCog,
  type LucideIcon,
} from "lucide-react";

import { features } from "@/config/features";
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
  permission?: Permission;
}

export function useSidebarItems(): NavGroup[] {
  const { hasPermission, isAuthenticated } = usePermissions();
  const documentsEnabled = features.documents;

  const allItems = [
    {
      id: 2,
      label: "Mi día a día",
      permission: "has_employee_profile",
      items: [
        {
          title: "Resumen",
          url: "/dashboard/me",
          icon: LayoutDashboard,
        },
        {
          title: "Fichar",
          url: "/dashboard/me/clock",
          icon: Clock,
        },
        {
          title: "Mis Vacaciones",
          url: "/dashboard/me/pto",
          icon: CalendarDays,
        },
        {
          title: "Mi Calendario",
          url: "/dashboard/me/calendar",
          icon: Calendar,
        },
        ...(documentsEnabled
          ? [
              {
                title: "Mis Documentos",
                url: "/dashboard/me/documents",
                icon: FileText,
              },
            ]
          : []),
      ],
    },
    {
      id: 3,
      label: "Equipo",
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
        ...(documentsEnabled
          ? [
              {
                title: "Documentos",
                url: "/dashboard/documents",
                icon: FolderOpen,
                permission: "view_documents",
              },
            ]
          : []),
        {
          title: "Aprobaciones",
          url: "/dashboard/approvals/pto",
          icon: CheckSquare,
          permission: "approve_requests",
        },
      ],
    },
    {
      id: 4,
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
        {
          title: "Usuarios y Roles",
          url: "/dashboard/admin/users",
          icon: UserCog,
          permission: "manage_users",
        },
        {
          title: "Calendarios",
          url: "/dashboard/calendars",
          icon: Calendar,
          permission: "manage_organization",
        },
        {
          title: "Tiempo y presencia",
          url: "/dashboard/time-tracking",
          icon: Timer,
          permission: "view_time_tracking",
          subItems: [
            {
              title: "Fichajes",
              url: "/dashboard/time-tracking",
              permission: "view_time_tracking",
            },
            {
              title: "Monitor en Vivo",
              url: "/dashboard/time-tracking/live",
              permission: "view_time_tracking",
            },
          ],
        },
      ],
    },
    {
      id: 5,
      label: "Configuración",
      items: [
        {
          title: "Ajustes generales",
          url: "/dashboard/settings",
          icon: Settings,
          permission: "manage_organization",
        },
      ],
    },
  ];

  // Filtrar elementos basándose en permisos
  if (!isAuthenticated) return [];

  return allItems
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => {
          // Si no tiene permiso requerido, mostrar siempre
          if (!item.permission) return true;
          // Si tiene permiso requerido, verificar que el usuario lo tenga
          return hasPermission(item.permission);
        })
        .map((item) => ({
          ...item,
          subItems: item.subItems?.filter((subItem) => {
            // Si no tiene permiso requerido, mostrar siempre
            if (!subItem.permission) return true;
            // Si tiene permiso requerido, verificar que el usuario lo tenga
            return hasPermission(subItem.permission);
          }),
        })),
    }))
    .filter((group) => {
      // Filtrar grupo si tiene permiso requerido y el usuario no lo tiene
      if (group.permission && !hasPermission(group.permission)) {
        return false;
      }
      // Filtrar grupos vacíos
      return group.items.length > 0;
    });
}
