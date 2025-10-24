"use client";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCheck,
  Loader2,
  Calendar,
  Check,
  X,
  Ban,
  Bell,
  FileCheck,
  FileSignature,
  FileClock,
  FileX,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/stores/notifications-store";

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
};

export function NotificationList() {
  const router = useRouter();
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotificationsStore();

  const handleNotificationClick = async (
    notificationId: string,
    notificationType: string,
    ptoRequestId?: string | null,
  ) => {
    router.push(`/dashboard/notifications`);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Notificaciones</h3>
        {(isLoading || notifications.some((n) => !n.isRead)) && (
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
            {notifications.some((n) => !n.isRead) && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Lista de notificaciones */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <Bell className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground text-sm">No tienes notificaciones</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Calendar;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.type, notification.ptoRequestId)}
                  className={cn(
                    "hover:bg-accent flex w-full items-start gap-3 p-4 text-left transition-colors",
                    !notification.isRead && "bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-2",
                      notification.type === "PTO_APPROVED" &&
                        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                      notification.type === "PTO_REJECTED" &&
                        "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                      notification.type === "PTO_SUBMITTED" &&
                        "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                      notification.type === "PTO_CANCELLED" &&
                        "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                      notification.type === "SIGNATURE_PENDING" &&
                        "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                      notification.type === "SIGNATURE_COMPLETED" &&
                        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                      notification.type === "SIGNATURE_REJECTED" &&
                        "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                      notification.type === "SIGNATURE_EXPIRED" &&
                        "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
                      notification.type === "MANUAL_TIME_ENTRY_SUBMITTED" &&
                        "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                      notification.type === "MANUAL_TIME_ENTRY_APPROVED" &&
                        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                      notification.type === "MANUAL_TIME_ENTRY_REJECTED" &&
                        "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-medium", !notification.isRead && "font-semibold")}>
                        {notification.title}
                      </p>
                      {!notification.isRead && <div className="bg-primary h-2 w-2 rounded-full" />}
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-sm">{notification.message}</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(notification.createdAt), "PPp", { locale: es })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push("/dashboard/notifications")}>
            Ver todas las notificaciones
          </Button>
        </div>
      )}
    </div>
  );
}
