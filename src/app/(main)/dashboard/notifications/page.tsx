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
  ExternalLink,
  FileCheck,
  FileSignature,
  FileClock,
  FileX,
  Clock,
  Receipt,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  getAllMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/server/actions/notifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
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
  DOCUMENT_UPLOADED: Calendar,
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
};

const notificationTypeLabels = {
  PTO_SUBMITTED: "Solicitud enviada",
  PTO_APPROVED: "Solicitud aprobada",
  PTO_REJECTED: "Solicitud rechazada",
  PTO_CANCELLED: "Solicitud cancelada",
  PTO_REMINDER: "Recordatorio",
  DOCUMENT_UPLOADED: "Documento subido",
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
};

export default function NotificationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
    try {
      await markAllNotificationsAsRead();
      toast.success("Todas las notificaciones marcadas como leídas");
      await loadNotifications(filterMode === "unread", pagination.page, pagination.pageSize);
    } catch (error) {
      toast.error("Error al marcar notificaciones como leídas");
    }
  };

  const handleNotificationClick = useCallback(
    async (notification: Notification, options?: { skipNavigation?: boolean }) => {
      const { skipNavigation = false } = options ?? {};

      const wasUnread = !notification.isRead;
      let updatedNotification = notification;

      if (wasUnread) {
        try {
          await markNotificationAsRead(notification.id);
          updatedNotification = { ...notification, isRead: true };
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

      if (!skipNavigation && notification.ptoRequestId) {
        if (notification.type === "PTO_SUBMITTED") {
          router.push(`/dashboard/approvals/pto`);
        } else {
          router.push(`/dashboard/me/pto?request=${notification.ptoRequestId}`);
        }
        setIsDetailOpen(false);
      }
    },
    [router, filterMode],
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
      // Manejar notificaciones de gastos
      if (notification.expenseId ?? notification.type.startsWith("EXPENSE_")) {
        if (notification.type === "EXPENSE_SUBMITTED") {
          router.push(`/dashboard/approvals/expenses`);
        } else {
          router.push(`/dashboard/me/expenses`);
        }
        setIsDetailOpen(false);
        return;
      }

      // Manejar notificaciones de fichaje manual
      if (notification.manualTimeEntryRequestId) {
        if (notification.type === "MANUAL_TIME_ENTRY_SUBMITTED") {
          router.push(`/dashboard/approvals/time-entries`);
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
          router.push(`/dashboard/signatures`);
        } else {
          // Empleado: ver mis propias firmas
          router.push(`/dashboard/me/signatures`);
        }
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
        router.push(`/dashboard/approvals/pto`);
      } else {
        router.push(`/dashboard/me/pto?request=${notification.ptoRequestId}`);
      }
      setIsDetailOpen(false);
    },
    [router],
  );

  const columns: ColumnDef<Notification>[] = useMemo(
    () => [
      {
        id: "status",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            {!row.original.isRead && <div className="bg-primary h-2 w-2 rounded-full" title="No leída" />}
          </div>
        ),
        size: 40,
      },
      {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => {
          const type = row.original.type;
          const Icon = notificationIcons[type as keyof typeof notificationIcons] || Calendar;
          const label = notificationTypeLabels[type as keyof typeof notificationTypeLabels] || type;

          return (
            <div className="flex items-center gap-2">
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
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: "Título",
        cell: ({ row }) => (
          <span className={cn("font-medium", !row.original.isRead && "font-semibold")}>{row.original.title}</span>
        ),
      },
      {
        accessorKey: "message",
        header: "Mensaje",
        cell: ({ row }) => <span className="text-muted-foreground line-clamp-2 text-sm">{row.original.message}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {format(new Date(row.original.createdAt), "PPp", { locale: es })}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const notification = row.original;

          return (
            <div className="flex gap-2">
              {notification.ptoRequestId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNavigate(notification);
                  }}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Ver solicitud
                </Button>
              )}
              {notification.manualTimeEntryRequestId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNavigate(notification);
                  }}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {notification.type === "MANUAL_TIME_ENTRY_SUBMITTED" ? "Revisar solicitud" : "Ver solicitud"}
                </Button>
              )}
              {(notification.expenseId ?? notification.type.startsWith("EXPENSE_")) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNavigate(notification);
                  }}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {notification.type === "EXPENSE_SUBMITTED" ? "Revisar gasto" : "Ver gasto"}
                </Button>
              )}
              {(notification.type === "SIGNATURE_PENDING" ||
                notification.type === "SIGNATURE_COMPLETED" ||
                notification.type === "SIGNATURE_REJECTED" ||
                notification.type === "SIGNATURE_EXPIRED") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNavigate(notification);
                  }}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {notification.type === "SIGNATURE_PENDING"
                    ? "Ir a firmar"
                    : notification.title === "Documento completamente firmado" ||
                        notification.title === "Documento rechazado por firmante"
                      ? "Ver gestión de firmas"
                      : "Ver mis firmas"}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [handleNavigate],
  );

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
            <DialogTitle>{selectedNotification?.title ?? "Detalle de la notificación"}</DialogTitle>
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
                      <p className="font-semibold">{Number(selectedNotification.ptoRequest.workingDays).toFixed(1)}</p>
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
            {selectedNotification &&
              (!!selectedNotification.ptoRequestId ||
                !!selectedNotification.manualTimeEntryRequestId ||
                !!selectedNotification.expenseId ||
                selectedNotification.type.startsWith("EXPENSE_") ||
                selectedNotification.type === "SIGNATURE_PENDING" ||
                selectedNotification.type === "SIGNATURE_COMPLETED" ||
                selectedNotification.type === "SIGNATURE_REJECTED" ||
                selectedNotification.type === "SIGNATURE_EXPIRED") && (
                <Button onClick={() => handleNavigate(selectedNotification)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {selectedNotification.type === "EXPENSE_SUBMITTED"
                    ? "Ir a revisar gastos"
                    : selectedNotification.type === "EXPENSE_APPROVED" || selectedNotification.type === "EXPENSE_REJECTED"
                      ? "Ver mis gastos"
                      : selectedNotification.type === "MANUAL_TIME_ENTRY_SUBMITTED"
                        ? "Ir a revisar solicitud"
                        : selectedNotification.type === "SIGNATURE_PENDING"
                          ? "Ir a firmar"
                          : selectedNotification.type === "SIGNATURE_COMPLETED" ||
                              selectedNotification.type === "SIGNATURE_REJECTED" ||
                              selectedNotification.type === "SIGNATURE_EXPIRED"
                            ? selectedNotification.title === "Documento completamente firmado" ||
                              selectedNotification.title === "Documento rechazado por firmante"
                              ? "Ver gestión de firmas"
                              : "Ver mis firmas"
                            : "Ir a la solicitud"}
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
