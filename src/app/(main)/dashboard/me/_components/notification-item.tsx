"use client";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";

import type { MySpaceDashboard } from "@/server/actions/my-space";

interface NotificationItemProps {
  notification: MySpaceDashboard["recentNotifications"][number];
}

export function NotificationItem({ notification }: NotificationItemProps) {
  return (
    <Link
      href="/dashboard/notifications"
      className={`block rounded-lg border p-3 transition-colors ${
        !notification.read
          ? "border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 bg-white dark:bg-white/5"
          : "hover:bg-accent dark:hover:bg-accent bg-white dark:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="flex-1 text-sm font-medium">{notification.message}</p>
        {!notification.read && <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        {format(new Date(notification.createdAt), "d 'de' MMMM 'a las' HH:mm", {
          locale: es,
        })}
      </p>
    </Link>
  );
}
