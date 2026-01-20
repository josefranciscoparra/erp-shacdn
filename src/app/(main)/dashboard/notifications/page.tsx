"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Loader2,
  Bell,
  Calendar,
  Check,
  X,
  Ban,
  CheckCheck,
  FileCheck,
  FileSignature,
  FileClock,
  FileX,
  FileText,
  Clock,
  Receipt,
  Mail,
  MailOpen,
  ExternalLink,
  Banknote,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getAllMyNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
} from "@/server/actions/notifications";
import { formatWorkingDays } from "@/services/pto/pto-helpers-client";
import { useNotificationsStore } from "@/stores/notifications-store";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  orgId: string;
  organization?: {
    id: string;
    name: string;
  };
  ptoRequestId?: string | null;
  manualTimeEntryRequestId?: string | null;
  expenseId?: string | null;
  ptoRequest?: {
    id: string;
    startDate: Date;
    endDate: Date;
    workingDays: number;
    status: string;
    employee?: {
      firstName: string;
      lastName: string;
    } | null;
    absenceType?: {
      name: string;
      color: string;
    } | null;
  } | null;
}

interface NotificationTotals {
  all: number;
  unread: number;
}

const notificationIcons = {
  PTO_SUBMITTED: Calendar,
  PTO_APPROVED: Check,
  PTO_REJECTED: X,
  PTO_CANCELLED: Ban,
  PTO_REMINDER: Calendar,
  DOCUMENT_UPLOADED: FileText,
  PAYSLIP_AVAILABLE: FileText,
  SYSTEM_ANNOUNCEMENT: Calendar,
  SIGNATURE_PENDING: FileSignature,
  SIGNATURE_COMPLETED: FileCheck,
  SIGNATURE_REJECTED: FileX,
  SIGNATURE_EXPIRED: FileClock,
  MANUAL_TIME_ENTRY_SUBMITTED: Clock,
  MANUAL_TIME_ENTRY_APPROVED: Check,
  MANUAL_TIME_ENTRY_REJECTED: X,
  EXPENSE_SUBMITTED: Receipt,
  EXPENSE_APPROVED: Check,
  EXPENSE_REJECTED: X,
  EXPENSE_REIMBURSED: Banknote,
  TIME_BANK_REQUEST_SUBMITTED: Calendar,
  TIME_BANK_REQUEST_APPROVED: Check,
  TIME_BANK_REQUEST_REJECTED: X,
};

const notificationTypeLabels = {
  PTO_SUBMITTED: "Solicitud enviada",
  PTO_APPROVED: "Solicitud aprobada",
  PTO_REJECTED: "Solicitud rechazada",
  PTO_CANCELLED: "Solicitud cancelada",
  PTO_REMINDER: "Recordatorio",
  DOCUMENT_UPLOADED: "Documento subido",
  PAYSLIP_AVAILABLE: "Nómina disponible",
  SYSTEM_ANNOUNCEMENT: "Anuncio del sistema",
  SIGNATURE_PENDING: "Firma pendiente",
  SIGNATURE_COMPLETED: "Firma completada",
  SIGNATURE_REJECTED: "Firma rechazada",
  SIGNATURE_EXPIRED: "Firma expirada",
  MANUAL_TIME_ENTRY_SUBMITTED: "Fichaje manual solicitado",
  MANUAL_TIME_ENTRY_APPROVED: "Fichaje manual aprobado",
  MANUAL_TIME_ENTRY_REJECTED: "Fichaje manual rechazado",
  EXPENSE_SUBMITTED: "Gasto enviado",
  EXPENSE_APPROVED: "Gasto aprobado",
  EXPENSE_REJECTED: "Gasto rechazado",
  EXPENSE_REIMBURSED: "Gasto reembolsado",
  TIME_BANK_REQUEST_SUBMITTED: "Bolsa: solicitud enviada",
  TIME_BANK_REQUEST_APPROVED: "Bolsa: solicitud aprobada",
  TIME_BANK_REQUEST_REJECTED: "Bolsa: solicitud rechazada",
};

function getNotificationActionLabel(notification: Notification): string {
  if (notification.type === "EXPENSE_SUBMITTED") {
    return "Ir a revisar gastos";
  }
  if (
    notification.type === "EXPENSE_APPROVED" ||
    notification.type === "EXPENSE_REJECTED" ||
    notification.type === "EXPENSE_REIMBURSED"
  ) {
    return "Ver mis gastos";
  }
  if (notification.type.startsWith("TIME_BANK_REQUEST_")) {
    if (notification.type === "TIME_BANK_REQUEST_SUBMITTED") {
      return "Ir a Aprobaciones";
    }
    return "Ir a Mi Bolsa de Horas";
  }
  if (notification.type === "DOCUMENT_UPLOADED") {
    return "Ir a Mis Documentos";
  }
  if (notification.type === "PAYSLIP_AVAILABLE") {
    return "Ir a Mis Nóminas";
  }
  if (notification.type === "MANUAL_TIME_ENTRY_SUBMITTED") {
    return "Ir a revisar solicitud";
  }
  if (notification.type === "SIGNATURE_PENDING") {
    return "Ir a firmar";
  }
  if (
    notification.type === "SIGNATURE_COMPLETED" ||
    notification.type === "SIGNATURE_REJECTED" ||
    notification.type === "SIGNATURE_EXPIRED"
  ) {
    if (
      notification.title === "Documento completamente firmado" ||
      notification.title === "Documento rechazado por firmante"
    ) {
      return "Ver gestión de firmas";
    }
    return "Ver mis firmas";
  }
  return "Ir a la solicitud";
}

export default function NotificationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const searchParamsString = searchParams.toString();
  const highlightedNotificationId = searchParams.get("notification");
  const handledHighlightRef = useRef<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [totals, setTotals] = useState<NotificationTotals>({ all: 0, unread: 0 });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const activeOrgId = session?.user?.activeOrgId ?? session?.user?.orgId ?? null;

  // Store de Zustand para sincronizar la campanita
  const { loadUnreadCount } = useNotificationsStore();
  const showOrgBadges = useMemo(() => {
    const orgIds = new Set<string>();
    for (const notification of notifications) {
      if (notification.orgId) {
        orgIds.add(notification.orgId);
      }
    }
    return orgIds.size > 1;
  }, [notifications]);

  const needsOrgSwitch = useCallback(
    (notification: Notification) => {
      if (
        notification.type === "PTO_SUBMITTED" ||
        notification.type === "MANUAL_TIME_ENTRY_SUBMITTED" ||
        notification.type === "TIME_BANK_REQUEST_SUBMITTED"
      ) {
        return false;
      }

      return Boolean(activeOrgId && notification.orgId && notification.orgId !== activeOrgId);
    },
    [activeOrgId],
  );

  const loadNotifications = async (unreadOnly: boolean = false, page: number = 1, pageSize: number = 20) => {
    setIsLoading(true);
    try {
      const data = await getAllMyNotifications(page, pageSize, unreadOnly);
      setNotifications(data.notifications as Notification[]);
      // Solo actualizar total y totalPages, no page/pageSize para evitar loops
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
      if (data.totals) {
        setTotals({ all: data.totals.all, unread: data.totals.unread });
      }
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
      toast.error("Error al cargar notificaciones");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Resetear a página 1 cuando cambia el filtro
    if (pagination.page !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      loadNotifications(filterMode === "unread", 1, pagination.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode]);

  useEffect(() => {
    loadNotifications(filterMode === "unread", pagination.page, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    if (highlightedNotificationId && filterMode !== "all") {
      setFilterMode("all");
    }
  }, [highlightedNotificationId, filterMode]);

  const handleMarkAllAsRead = async () => {
    // Actualización optimista: actualizar estado local primero (sin esperar al servidor)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setTotals((prev) => ({ ...prev, unread: 0 }));

    try {
      // Llamar al servidor en background
      await markAllNotificationsAsRead();
      toast.success("Todas las notificaciones marcadas como leídas");

      // Actualizar el contador de la campanita
      void loadUnreadCount();

      // Si estamos en modo "solo no leídas", recargar para mostrar mensaje vacío
      if (filterMode === "unread") {
        await loadNotifications(true, pagination.page, pagination.pageSize);
      }
    } catch {
      // En caso de error, recargar para obtener el estado correcto del servidor
      toast.error("Error al marcar notificaciones como leídas");
      await loadNotifications(filterMode === "unread", pagination.page, pagination.pageSize);
      void loadUnreadCount();
    }
  };

  const handleToggleRead = useCallback(
    async (notification: Notification, event: React.MouseEvent) => {
      event.stopPropagation();

      // Actualización optimista: actualizar estado local primero
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: !n.isRead } : n)));
      setTotals((prev) => ({
        ...prev,
        unread: notification.isRead ? prev.unread + 1 : Math.max(prev.unread - 1, 0),
      }));

      try {
        // Llamar al servidor en background
        if (notification.isRead) {
          await markNotificationAsUnread(notification.id);
          toast.success("Notificación marcada como no leída");
        } else {
          await markNotificationAsRead(notification.id);
          toast.success("Notificación marcada como leída");
        }

        // Actualizar el contador de la campanita
        void loadUnreadCount();
      } catch {
        // En caso de error, recargar para obtener el estado correcto
        toast.error("Error al actualizar notificación");
        await loadNotifications(filterMode === "unread", pagination.page, pagination.pageSize);
        void loadUnreadCount();
      }
    },
    [filterMode, loadNotifications, pagination.page, pagination.pageSize, loadUnreadCount],
  );

  const handleNotificationClick = useCallback(
    async (notification: Notification, options?: { skipNavigation?: boolean }) => {
      const { skipNavigation = false } = options ?? {};

      const wasUnread = !notification.isRead;
      let updatedNotification = notification;

      if (wasUnread) {
        try {
          await markNotificationAsRead(notification.id);
          updatedNotification = { ...notification, isRead: true };

          // Actualizar el contador de la campanita
          void loadUnreadCount();
        } catch (error) {
          console.error("Error al marcar notificación:", error);
        }
      }

      setSelectedNotification(updatedNotification);
      setIsDetailOpen(true);

      setNotifications((prev) => {
        if (wasUnread) {
          if (filterMode === "unread") {
            return prev.filter((n) => n.id !== notification.id);
          }

          return prev.map((n) => (n.id === notification.id ? updatedNotification : n));
        }

        return prev.map((n) => (n.id === notification.id ? updatedNotification : n));
      });

      if (wasUnread) {
        setTotals((prev) => ({ ...prev, unread: Math.max(prev.unread - 1, 0) }));
        if (filterMode === "unread") {
          setPagination((prev) => {
            const newTotal = Math.max(prev.total - 1, 0);
            const newTotalPages = Math.ceil(newTotal / prev.pageSize);
            return {
              ...prev,
              total: newTotal,
              totalPages: newTotalPages,
            };
          });
        }
      }

      if (!skipNavigation && needsOrgSwitch(notification)) {
        toast.info(
          `Cambia a ${notification.organization?.name ?? "esa organización"} antes de gestionar esta notificación.`,
        );
        return;
      }

      if (!skipNavigation && notification.ptoRequestId) {
        if (notification.type === "PTO_SUBMITTED") {
          const orgQuery = notification.orgId ? `?orgId=${notification.orgId}` : "";
          router.push(`/dashboard/approvals${orgQuery}`);
        } else {
          router.push(`/dashboard/me/pto?request=${notification.ptoRequestId}`);
        }
        setIsDetailOpen(false);
      }
    },
    [needsOrgSwitch, router, filterMode, loadUnreadCount],
  );

  useEffect(() => {
    if (!highlightedNotificationId) {
      handledHighlightRef.current = null;
      return;
    }

    if (isLoading) {
      return;
    }

    if (handledHighlightRef.current === highlightedNotificationId) {
      return;
    }

    const target = notifications.find((n) => n.id === highlightedNotificationId);

    if (!target) {
      return;
    }

    handledHighlightRef.current = highlightedNotificationId;

    void (async () => {
      await handleNotificationClick(target, { skipNavigation: true });

      const params = new URLSearchParams(searchParamsString);
      params.delete("notification");
      const query = params.toString();

      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    })();
  }, [
    handleNotificationClick,
    highlightedNotificationId,
    isLoading,
    notifications,
    pathname,
    router,
    searchParamsString,
  ]);

  const handleNavigate = useCallback(
    (notification: Notification) => {
      if (needsOrgSwitch(notification)) {
        toast.info(
          `Cambia a ${notification.organization?.name ?? "esa organización"} antes de gestionar esta notificación.`,
        );
        return;
      }

      // Manejar notificaciones de documentos subidos
      if (notification.type === "DOCUMENT_UPLOADED") {
        router.push(`/dashboard/me/documents`);
        setIsDetailOpen(false);
        return;
      }

      // Manejar notificaciones de nóminas disponibles
      if (notification.type === "PAYSLIP_AVAILABLE") {
        router.push(`/dashboard/me/payslips`);
        setIsDetailOpen(false);
        return;
      }

      // Manejar notificaciones de gastos
      if (notification.expenseId ?? notification.type.startsWith("EXPENSE_")) {
        if (notification.type === "EXPENSE_SUBMITTED") {
          router.push(`/dashboard/approvals/expenses`);
        } else if (notification.type === "EXPENSE_REIMBURSED") {
          router.push(`/dashboard/me/expenses`);
        } else {
          router.push(`/dashboard/me/expenses`);
        }
        setIsDetailOpen(false);
        return;
      }

      // Manejar notificaciones de fichaje manual
      if (notification.manualTimeEntryRequestId) {
        if (notification.type === "MANUAL_TIME_ENTRY_SUBMITTED") {
          const orgQuery = notification.orgId ? `?orgId=${notification.orgId}` : "";
          router.push(`/dashboard/approvals${orgQuery}`);
        } else {
          router.push(`/dashboard/me/clock/requests`);
        }
        setIsDetailOpen(false);
        return;
      }

      // Manejar notificaciones de firma
      if (
        notification.type === "SIGNATURE_PENDING" ||
        notification.type === "SIGNATURE_COMPLETED" ||
        notification.type === "SIGNATURE_REJECTED" ||
        notification.type === "SIGNATURE_EXPIRED"
      ) {
        // Distinguir entre notificaciones para HR/Admin vs empleados según el título
        if (
          notification.title === "Documento completamente firmado" ||
          notification.title === "Documento rechazado por firmante"
        ) {
          // HR/Admin: ver todos los documentos de firma
          router.push(`/dashboard/signatures?refresh=true`);
        } else {
          // Empleado: ver mis propias firmas
          router.push(`/dashboard/me/signatures?refresh=true`);
        }
        setIsDetailOpen(false);
        return;
      }

      // Manejar Bolsa de Horas
      if (notification.type === "TIME_BANK_REQUEST_SUBMITTED") {
        const orgQuery = notification.orgId ? `?orgId=${notification.orgId}` : "";
        router.push(`/dashboard/approvals${orgQuery}`);
        setIsDetailOpen(false);
        return;
      }

      if (notification.type === "TIME_BANK_REQUEST_APPROVED" || notification.type === "TIME_BANK_REQUEST_REJECTED") {
        router.push(`/dashboard/me/time-bank`);
        setIsDetailOpen(false);
        return;
      }

      // Manejar notificaciones de PTO
      if (!notification.ptoRequestId) {
        router.push(`/dashboard/notifications?notification=${notification.id}`);
        setIsDetailOpen(false);
        return;
      }

      if (notification.type === "PTO_SUBMITTED") {
        const orgQuery = notification.orgId ? `?orgId=${notification.orgId}` : "";
        router.push(`/dashboard/approvals${orgQuery}`);
      } else {
        router.push(`/dashboard/me/pto?request=${notification.ptoRequestId}`);
      }
      setIsDetailOpen(false);
    },
    [needsOrgSwitch, router],
  );

  const columns: ColumnDef<Notification>[] = useMemo(
    () => [
      {
        id: "status",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => handleToggleRead(row.original, e)}
              title={row.original.isRead ? "Marcar como no leída" : "Marcar como leída"}
            >
              {row.original.isRead ? (
                <MailOpen className="text-muted-foreground h-4 w-4" />
              ) : (
                <Mail className="text-primary h-4 w-4" />
              )}
            </Button>
          </div>
        ),
        size: 60,
      },
      {
        accessorKey: "type",
        header: "",
        cell: ({ row }) => {
          const type = row.original.type;
          const Icon = notificationIcons[type as keyof typeof notificationIcons] || Calendar;
          const label = notificationTypeLabels[type as keyof typeof notificationTypeLabels] || type;

          return (
            <div className="flex items-center justify-center">
              <div
                className={cn(
                  "rounded-full p-2",
                  type === "PTO_APPROVED" && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  type === "PTO_REJECTED" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                  type === "PTO_SUBMITTED" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                  type === "PTO_CANCELLED" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                  type === "SIGNATURE_PENDING" &&
                    "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                  type === "SIGNATURE_COMPLETED" &&
                    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  type === "SIGNATURE_REJECTED" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                  type === "SIGNATURE_EXPIRED" &&
                    "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
                  type === "MANUAL_TIME_ENTRY_SUBMITTED" &&
                    "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                  type === "MANUAL_TIME_ENTRY_APPROVED" &&
                    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  type === "MANUAL_TIME_ENTRY_REJECTED" &&
                    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                  type === "EXPENSE_SUBMITTED" &&
                    "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
                  type === "EXPENSE_APPROVED" && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  type === "EXPENSE_REJECTED" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                  type === "EXPENSE_REIMBURSED" &&
                    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                  type === "DOCUMENT_UPLOADED" &&
                    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
                  type === "PAYSLIP_AVAILABLE" &&
                    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  type === "TIME_BANK_REQUEST_SUBMITTED" &&
                    "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                  type === "TIME_BANK_REQUEST_APPROVED" &&
                    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  type === "TIME_BANK_REQUEST_REJECTED" &&
                    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                )}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
          );
        },
        size: 60,
      },
      {
        accessorKey: "title",
        header: "Título",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-medium", !row.original.isRead && "font-semibold")}>{row.original.title}</span>
            {showOrgBadges && row.original.organization && (
              <Badge variant="outline" className="text-[10px] font-medium">
                {row.original.organization.name}
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "message",
        header: "Mensaje",
        cell: ({ row }) => <span className="text-muted-foreground line-clamp-1 text-sm">{row.original.message}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "Fecha",
        cell: ({ row }) => (
          <span
            className="text-muted-foreground text-sm"
            title={format(new Date(row.original.createdAt), "PPp", { locale: es })}
          >
            {format(new Date(row.original.createdAt), "dd/MM/yy HH:mm", { locale: es })}
          </span>
        ),
      },
    ],
    [handleToggleRead, showOrgBadges],
  );

  const renderActionButton = () => {
    const notification = selectedNotification;
    if (
      !notification ||
      (!notification.ptoRequestId &&
        !notification.manualTimeEntryRequestId &&
        !notification.expenseId &&
        !notification.type.startsWith("EXPENSE_") &&
        !notification.type.startsWith("TIME_BANK_REQUEST_") &&
        notification.type !== "DOCUMENT_UPLOADED" &&
        notification.type !== "PAYSLIP_AVAILABLE" &&
        notification.type !== "SIGNATURE_PENDING" &&
        notification.type !== "SIGNATURE_COMPLETED" &&
        notification.type !== "SIGNATURE_REJECTED" &&
        notification.type !== "SIGNATURE_EXPIRED")
    ) {
      return null;
    }

    const requiresSwitch = needsOrgSwitch(notification);
    const button = (
      <Button onClick={() => handleNavigate(notification)}>
        <ExternalLink className="mr-2 h-4 w-4" />
        {getNotificationActionLabel(notification)}
      </Button>
    );

    if (!requiresSwitch) {
      return button;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            Cambia a {notification.organization?.name ?? "esa organización"} para continuar.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const table = useReactTable({
    data: notifications,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function"
          ? updater({ pageIndex: pagination.page - 1, pageSize: pagination.pageSize })
          : updater;

      setPagination((prev) => ({
        ...prev,
        page: newPagination.pageIndex + 1,
        pageSize: newPagination.pageSize,
      }));
    },
    state: {
      sorting,
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      },
    },
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const unreadCount = totals.unread;
  const totalCount = totals.all;

  const selectedType = selectedNotification?.type ?? null;
  const selectedTypeLabel =
    selectedType !== null
      ? (notificationTypeLabels[selectedType as keyof typeof notificationTypeLabels] ?? selectedType)
      : null;
  const SelectedIcon =
    selectedType !== null ? notificationIcons[selectedType as keyof typeof notificationIcons] || Calendar : null;
  const selectedCreatedAt =
    selectedNotification !== null ? format(new Date(selectedNotification.createdAt), "PPpp", { locale: es }) : "";

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Notificaciones" />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Contador de no leídas */}
          {unreadCount > 0 && (
            <Badge variant="secondary" className="gap-1.5">
              <div className="bg-primary h-2 w-2 rounded-full" />
              {unreadCount} sin leer
            </Badge>
          )}

          {/* Filtro */}
          <Select value={filterMode} onValueChange={(value) => setFilterMode(value as "all" | "unread")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Solo no leídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botón marcar todas como leídas */}
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
          <Bell className="text-muted-foreground h-12 w-12" />
          <div>
            <h3 className="font-semibold">
              {filterMode === "unread" ? "No hay notificaciones sin leer" : "No tienes notificaciones"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {filterMode === "unread"
                ? "¡Estás al día con todas tus notificaciones!"
                : "Cuando recibas notificaciones, aparecerán aquí"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn("cursor-pointer", !row.original.isRead && "bg-muted/50")}
                      onClick={() => handleNotificationClick(row.original, { skipNavigation: true })}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No hay notificaciones
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </div>
      )}

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setSelectedNotification(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{selectedNotification?.title ?? "Detalle de la notificación"}</DialogTitle>
              {showOrgBadges && selectedNotification?.organization && (
                <Badge variant="outline" className="text-[10px] font-medium">
                  {selectedNotification.organization.name}
                </Badge>
              )}
            </div>
            {selectedNotification && (
              <DialogDescription>
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  {SelectedIcon && <SelectedIcon className="h-4 w-4" />}
                  <span>{selectedTypeLabel ?? selectedNotification.type}</span>
                  <span className="ml-auto text-xs">{selectedCreatedAt}</span>
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedNotification && (
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed whitespace-pre-line">{selectedNotification.message}</p>

              {selectedNotification.ptoRequest && (
                <div className="bg-muted/40 rounded-md border p-4 text-sm">
                  <p className="text-muted-foreground mb-3 text-xs tracking-wide uppercase">Solicitud de ausencia</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Inicio</span>
                      <p className="font-medium">
                        {format(new Date(selectedNotification.ptoRequest.startDate), "PP", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fin</span>
                      <p className="font-medium">
                        {format(new Date(selectedNotification.ptoRequest.endDate), "PP", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Días hábiles</span>
                      <p className="font-semibold">
                        {formatWorkingDays(Number(selectedNotification.ptoRequest.workingDays))}
                      </p>
                    </div>
                    {selectedNotification.ptoRequest.absenceType && (
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="flex items-center gap-2 font-medium">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: selectedNotification.ptoRequest.absenceType.color ?? "#3b82f6" }}
                          />
                          {selectedNotification.ptoRequest.absenceType.name}
                        </span>
                      </div>
                    )}
                    {selectedNotification.ptoRequest.employee && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Empleado</span>
                        <p className="font-medium">
                          {`${selectedNotification.ptoRequest.employee.firstName} ${selectedNotification.ptoRequest.employee.lastName}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            {renderActionButton()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
