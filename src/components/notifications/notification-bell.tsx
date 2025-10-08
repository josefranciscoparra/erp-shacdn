"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationsStore } from "@/stores/notifications-store";
import { NotificationList } from "./notification-list";
import { usePathname } from "next/navigation";

export function NotificationBell() {
  const pathname = usePathname();
  const { unreadCount, loadNotifications, loadUnreadCount } = useNotificationsStore();

  // Cargar al montar el componente
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  // Recargar al cambiar de ruta
  useEffect(() => {
    loadUnreadCount();
  }, [pathname]);

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
  }, []);

  // Auto-refresh cada 30 minutos (solo si la pestaña está activa)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadUnreadCount();
        loadNotifications();
      }
    }, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
            >
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
