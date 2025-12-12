"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificationsStore } from "@/stores/notifications-store";

import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, loadNotifications, loadUnreadCount } = useNotificationsStore();
  const canLoadNotifications = Boolean(session?.user && session.user.role !== "SUPER_ADMIN");

  if (session?.user?.role === "SUPER_ADMIN") {
    return null;
  }

  // Cargar al montar el componente
  useEffect(() => {
    if (!canLoadNotifications) {
      return;
    }

    loadNotifications();
    loadUnreadCount();
  }, [canLoadNotifications, loadNotifications, loadUnreadCount]);

  // Recargar al cambiar de ruta
  useEffect(() => {
    if (!canLoadNotifications) {
      return;
    }

    loadUnreadCount();
    loadNotifications();
  }, [canLoadNotifications, loadUnreadCount, loadNotifications, pathname]);

  // Recargar al hacer foco en la ventana
  useEffect(() => {
    if (!canLoadNotifications) {
      return;
    }

    const handleFocus = () => {
      loadUnreadCount();
      loadNotifications();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [canLoadNotifications, loadNotifications, loadUnreadCount]);

  // Auto-refresh cada 30 minutos (solo si la pestaña está activa)
  useEffect(() => {
    if (!canLoadNotifications) {
      return;
    }

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
  }, [canLoadNotifications, loadNotifications, loadUnreadCount]);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open && canLoadNotifications) {
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
      <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-96" align="end">
        <NotificationList onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
