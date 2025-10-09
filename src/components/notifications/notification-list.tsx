"use client";

import { useNotificationsStore } from "@/stores/notifications-store";
import { Button } from "@/components/ui/button";
import { CheckCheck, Loader2, Calendar, Check, X, Ban, Bell } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const notificationIcons = {
  PTO_SUBMITTED: Calendar,
  PTO_APPROVED: Check,
  PTO_REJECTED: X,
  PTO_CANCELLED: Ban,
  PTO_REMINDER: Calendar,
  DOCUMENT_UPLOADED: Calendar,
  SYSTEM_ANNOUNCEMENT: Calendar,
};

export function NotificationList() {
  const router = useRouter();
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotificationsStore();

  const handleNotificationClick = async (notificationId: string, ptoRequestId?: string | null) => {
    await markAsRead(notificationId);

    // Navegar a la solicitud si existe
    if (ptoRequestId) {
      router.push(`/dashboard/me/pto?request=${ptoRequestId}`);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Notificaciones</h3>
        {(isLoading || notifications.some((n) => !n.isRead)) && (
          <div className="flex items-center gap-2">
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {notifications.some((n) => !n.isRead) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
              >
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
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No tienes notificaciones
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Calendar;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.ptoRequestId)}
                  className={cn(
                    "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent",
                    !notification.isRead && "bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-2",
                      notification.type === "PTO_APPROVED" && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                      notification.type === "PTO_REJECTED" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                      notification.type === "PTO_SUBMITTED" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                      notification.type === "PTO_CANCELLED" && "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-medium", !notification.isRead && "font-semibold")}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => router.push("/dashboard/notifications")}
          >
            Ver todas las notificaciones
          </Button>
        </div>
      )}
    </div>
  );
}
