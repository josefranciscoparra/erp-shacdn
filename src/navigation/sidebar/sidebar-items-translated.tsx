"use client";

import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Calendar,
  Settings,
  FolderOpen,
  Clock,
  CalendarDays,
  Timer,
  CheckSquare,
  UserCog,
  FileSignature,
  Receipt,
  MessageSquare,
  CalendarClock,
  Banknote,
  ClipboardList,
  History,
  Calculator,
  FileArchive,
  Shield,
  TriangleAlert,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

import { features } from "@/config/features";
import { useGroupUserManagement } from "@/hooks/use-group-user-management";
import { usePermissions } from "@/hooks/use-permissions";
import { type Permission } from "@/services/permissions";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

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
  const { hasPermission, isAuthenticated, userRole } = usePermissions();
  const { hasGroups: hasGroupUserAccess } = useGroupUserManagement();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const chatEnabled = useOrganizationFeaturesStore((state) => state.features.chatEnabled);
  const shiftsEnabled = useOrganizationFeaturesStore((state) => state.features.shiftsEnabled);
  const expenseMode = useOrganizationFeaturesStore((state) => state.features.expenseMode);
  const whistleblowingEnabled = useOrganizationFeaturesStore((state) => state.features.whistleblowingEnabled);
  const moduleAvailability = useOrganizationFeaturesStore((state) => state.features.moduleAvailability);
  const showProcedures = expenseMode === "PUBLIC" || expenseMode === "MIXED";
  const showExpenses = expenseMode === "PRIVATE" || expenseMode === "MIXED";

  const documentsEnabled = features.documents && moduleAvailability.documents;
  const signaturesEnabled = features.signatures && moduleAvailability.signatures;
  const expensesEnabled = moduleAvailability.expenses;
  const payrollEnabled = moduleAvailability.payroll;
  const projectsEnabled = moduleAvailability.projects;
  const chatAvailable = moduleAvailability.chat && chatEnabled;
  const shiftsAvailable = moduleAvailability.shifts && shiftsEnabled;
  const whistleblowingAvailable = moduleAvailability.whistleblowing && whistleblowingEnabled;

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
          title: "Mis Fichajes",
          url: "/dashboard/me/clock/requests",
          icon: History,
        },
        // "Mi Bolsa de Horas" REMOVED from here (Merged into Mis Fichajes)
        {
          title: "Mis ausencias",
          url: "/dashboard/me/pto",
          icon: CalendarDays,
        },
        // "Mis Responsabilidades" REMOVED from here
        {
          title: "Mi Horario",
          url: "/dashboard/me/shifts",
          icon: CalendarClock,
        },
        {
          title: "Mi Calendario",
          url: "/dashboard/me/calendar",
          icon: Calendar,
        },
        // PÚBLICO: Mis Expedientes (Para el empleado)
        ...(expensesEnabled && showProcedures
          ? [
              {
                title: "Expedientes de Gasto",
                url: "/dashboard/my-procedures",
                icon: ClipboardList,
              },
            ]
          : []),
        // PRIVADO/MIXTO: Mis Gastos
        ...(expensesEnabled && showExpenses
          ? [
              {
                title: "Mis Gastos",
                url: "/dashboard/me/expenses",
                icon: Receipt,
              },
            ]
          : []),
        ...(chatAvailable
          ? [
              {
                title: "Chat",
                url: "/dashboard/chat",
                icon: MessageSquare,
              },
            ]
          : []),
        ...(payrollEnabled
          ? [
              {
                title: "Mis Nóminas",
                url: "/dashboard/me/payslips",
                icon: FileArchive,
                isNew: true,
                permission: "view_own_payslips",
              },
            ]
          : []),
        ...(documentsEnabled
          ? [
              {
                title: "Mis Documentos",
                url: "/dashboard/me/documents",
                icon: FileText,
              },
            ]
          : []),
        ...(signaturesEnabled
          ? [
              {
                title: "Mis Firmas",
                url: "/dashboard/me/signatures",
                icon: FileSignature,
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
          title: "Gestión de Personal",
          url: "/dashboard/employees",
          icon: Users,
          permission: "view_employees",
          subItems: [
            {
              title: "Empleados",
              url: "/dashboard/employees",
              permission: "view_employees",
            },
          ],
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
        ...(payrollEnabled
          ? [
              {
                title: "Nóminas",
                url: "/dashboard/payslips",
                icon: FileArchive,
                permission: "view_payroll",
                isNew: true,
              },
            ]
          : []),
        {
          title: "Aprobaciones",
          url: "/dashboard/approvals",
          icon: CheckSquare,
          permission: "approve_requests",
        },
        {
          title: "Alertas",
          url: "/dashboard/time-tracking/alerts",
          icon: TriangleAlert,
          permission: "view_time_tracking",
          isNew: true,
        },
        {
          title: "Mis áreas",
          url: "/dashboard/me/responsibilities",
          icon: ClipboardList,
          permission: "view_employees",
        },
        ...(signaturesEnabled
          ? [
              {
                title: "Gestión de Firmas",
                url: "/dashboard/signatures",
                icon: FileSignature,
                permission: "manage_documents" as Permission,
              },
            ]
          : []),
      ],
    },
    {
      id: 6,
      label: "Finanzas",
      items: [
        ...(expensesEnabled
          ? [
              {
                title: "Gestión de Gastos",
                url: "/dashboard/expenses",
                icon: Banknote,
                permission: "approve_requests",
                subItems: [
                  // PÚBLICO: Gestión de Expedientes (RRHH/Managers)
                  ...(showProcedures
                    ? [
                        {
                          title: "Expedientes",
                          url: "/dashboard/procedures", // Reutilizamos la vista, filtrada por permisos
                          permission: "approve_requests",
                        },
                      ]
                    : []),
                  ...(showExpenses
                    ? [
                        {
                          title: "Control de Gastos",
                          url: "/dashboard/expenses",
                          permission: "approve_requests",
                        },
                        {
                          title: "Reembolsos",
                          url: "/dashboard/expenses/reimbursements",
                          permission: "manage_payroll",
                        },
                      ]
                    : []),
                  {
                    title: "Políticas",
                    url: "/dashboard/expenses/policies",
                    permission: "manage_organization",
                  },
                ],
              },
            ]
          : []),
      ],
    },
    {
      id: 4,
      label: "Organización",
      items: [
        {
          title: "Estructura",
          url: "/dashboard/departments",
          icon: Building2,
          permission: "view_departments",
          subItems: [
            {
              title: "Departamentos",
              url: "/dashboard/departments",
              permission: "view_departments",
            },
            {
              title: "Puestos",
              url: "/dashboard/positions",
              permission: "view_positions",
            },
            {
              title: "Centros de coste",
              url: "/dashboard/cost-centers",
              permission: "view_cost_centers",
            },
            {
              title: "Equipos",
              url: "/dashboard/teams",
              permission: "view_teams",
            },
            ...(projectsEnabled
              ? [
                  {
                    title: "Proyectos",
                    url: "/dashboard/projects",
                    permission: "view_projects",
                  },
                ]
              : []),
          ],
        },
        {
          title: "Calendarios",
          url: "/dashboard/calendars",
          icon: Calendar,
          permission: "manage_organization",
        },
        {
          title: "Administración",
          url: "/dashboard/admin/users",
          icon: UserCog,
          permission: "view_all_users",
          subItems: [
            {
              title: "Usuarios y Roles",
              url: "/dashboard/admin/users",
              permission: "view_all_users",
            },
            ...(hasGroupUserAccess
              ? [
                  {
                    title: "Usuarios por grupo",
                    url: "/dashboard/admin/group-users",
                    permission: "view_all_users",
                  },
                ]
              : []),
            {
              title: "Matriz de Responsabilidades",
              url: "/dashboard/organization/responsibles",
              permission: "manage_organization",
            },
          ],
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
            {
              title: "Bolsa de Horas",
              url: "/dashboard/time-tracking/time-bank",
              permission: "approve_requests",
              isNew: true,
            },
          ],
        },
        ...(payrollEnabled
          ? [
              {
                title: "Liquidaciones",
                url: "/dashboard/settlements",
                icon: Calculator,
                permission: "manage_payroll",
                isNew: true,
              },
            ]
          : []),
        ...(whistleblowingAvailable
          ? [
              {
                title: "Canal de Denuncias",
                url: "/dashboard/whistleblowing",
                icon: Shield,
                permission: "manage_organization" as Permission,
                isNew: true,
              },
            ]
          : []),
        {
          title: "Gestión de Horarios",
          url: "/dashboard/schedules",
          icon: CalendarClock,
          permission: "view_contracts",
          subItems: [
            {
              title: "Plantillas de Horarios",
              url: "/dashboard/schedules",
              permission: "view_contracts",
            },
            ...(shiftsAvailable
              ? [
                  {
                    title: "Cuadrante de Turnos",
                    url: "/dashboard/shifts",
                    permission: "manage_organization" as Permission,
                  },
                ]
              : []),
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
        ...(isSuperAdmin
          ? [
              {
                title: "Ajustes superadmin",
                url: "/dashboard/settings/superadmin",
                icon: UserCog,
                permission: "manage_organization",
              },
            ]
          : []),
        {
          title: "Centro de Ayuda",
          url: "https://timenow.notion.site/2d6e46a7af0f80faae3bfd60e00ba3e6?v=2d6e46a7af0f803c8779000c0afc6bfa",
          icon: HelpCircle,
          newTab: true,
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
