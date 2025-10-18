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
import { Loader2, Bell, Calendar, Check, X, Ban, CheckCheck, ExternalLink } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
};

const notificationTypeLabels = {
  PTO_SUBMITTED: "Solicitud enviada",
  PTO_APPROVED: "Solicitud aprobada",
  PTO_REJECTED: "Solicitud rechazada",
  PTO_CANCELLED: "Solicitud cancelada",
  PTO_REMINDER: "Recordatorio",
  DOCUMENT_UPLOADED: "Documento subido",
  SYSTEM_ANNOUNCEMENT: "Anuncio del sistema",
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
  const [selectedTab, setSelectedTab] = useState("unread");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [totals, setTotals] = useState<NotificationTotals>({ all: 0, unread: 0 });
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const loadNotifications = async (unreadOnly: boolean = false, page: number = 1) => {
    setIsLoading(true);
    try {
      const data = await getAllMyNotifications(page, 20, unreadOnly);
      setNotifications(data.notifications as Notification[]);
      setPagination(data.pagination);
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
    loadNotifications(selectedTab === "unread");
  }, [selectedTab]);

  useEffect(() => {
    if (highlightedNotificationId && selectedTab !== "all") {
      setSelectedTab("all");
    }
  }, [highlightedNotificationId, selectedTab]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      toast.success("Todas las notificaciones marcadas como leídas");
      await loadNotifications(selectedTab === "unread");
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
          if (selectedTab === "unread") {
            return prev.filter((n) => n.id !== notification.id);
          }

          return prev.map((n) => (n.id === notification.id ? updatedNotification : n));
        }

        return prev.map((n) => (n.id === notification.id ? updatedNotification : n));
      });

      if (wasUnread) {
        setTotals((prev) => ({ ...prev, unread: Math.max(prev.unread - 1, 0) }));
        if (selectedTab === "unread") {
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
    [router, selectedTab],
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
                  type === "PTO_CANCELLED" && "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
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
    state: {
      sorting,
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

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex items-center justify-between">
          {/* Select para móvil */}
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger className="w-[200px] @4xl/main:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unread">No leídas {unreadCount > 0 && `(${unreadCount})`}</SelectItem>
              <SelectItem value="all">Todas ({totalCount})</SelectItem>
            </SelectContent>
          </Select>

          {/* Tabs para desktop */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="unread">
              No leídas
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">
              Todas
              <Badge variant="secondary" className="ml-2">
                {totalCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

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
        ) : (
          <>
            <TabsContent value="unread">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
                  <Bell className="text-muted-foreground h-12 w-12" />
                  <div>
                    <h3 className="font-semibold">No hay notificaciones sin leer</h3>
                    <p className="text-muted-foreground text-sm">¡Estás al día con todas tus notificaciones!</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(header.column.columnDef.header, header.getContext())}
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
                                <TableCell key={cell.id}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                              No hay notificaciones sin leer
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <DataTablePagination table={table} />
                </>
              )}
            </TabsContent>

            <TabsContent value="all">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-12 text-center">
                  <Bell className="text-muted-foreground h-12 w-12" />
                  <div>
                    <h3 className="font-semibold">No tienes notificaciones</h3>
                    <p className="text-muted-foreground text-sm">Cuando recibas notificaciones, aparecerán aquí</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(header.column.columnDef.header, header.getContext())}
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
                                <TableCell key={cell.id}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
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
                </>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

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
            {selectedNotification?.ptoRequestId && (
              <Button onClick={() => selectedNotification && handleNavigate(selectedNotification)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Ir a la solicitud
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
