"use client";

import { useEffect } from "react";

import { usePathname } from "next/navigation";

import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificationsStore } from "@/stores/notifications-store";

import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const pathname = usePathname();
  const { unreadCount, loadNotifications, loadUnreadCount } = useNotificationsStore();

  // Cargar al montar el componente
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Recargar al cambiar de ruta
  useEffect(() => {
    loadUnreadCount();
    loadNotifications();
  }, [loadUnreadCount, loadNotifications, pathname]);

  // Recargar al hacer foco en la ventana
  useEffect(() => {
    const handleFocus = () => {
      loadUnreadCount();
      loadNotifications();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadNotifications, loadUnreadCount]);

  // Auto-refresh cada 30 minutos (solo si la pestaña está activa)
  useEffect(() => {
    const interval = setInterval(
      () => {
        if (!document.hidden) {
          loadUnreadCount();
          loadNotifications();
        }
      },
      30 * 60 * 1000,
    ); // 30 minutos

    return () => clearInterval(interval);
  }, [loadNotifications, loadUnreadCount]);

  return (
    <Popover
      onOpenChange={(isOpen) => {
        if (isOpen) {
          loadUnreadCount();
          loadNotifications();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="group border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:text-foreground relative rounded-lg border transition-colors"
        >
          <Bell
            className="text-muted-foreground group-hover:text-foreground h-5 w-5 transition-colors"
            aria-hidden="true"
          />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
}
