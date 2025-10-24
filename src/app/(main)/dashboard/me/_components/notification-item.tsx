"use client";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
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
          ? "border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 bg-white dark:bg-white/5"
          : "hover:bg-accent dark:hover:bg-accent bg-white dark:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{notification.message}</p>
        {!notification.read && (
          <Badge variant="default" className="flex-shrink-0 text-xs">
            Nueva
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {format(new Date(notification.createdAt), "d 'de' MMMM 'a las' HH:mm", {
          locale: es,
        })}
      </p>
    </Link>
  );
}
