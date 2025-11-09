"use client";

import { useEffect } from "react";

import Link from "next/link";

import { Bell, EllipsisVertical, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { getInitials } from "@/lib/utils";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useTimeTrackingStore } from "@/stores/time-tracking-store";

export function NavUser({
  user,
}: {
  readonly user: {
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const t = useTranslations("user");
  const { unreadCount, loadUnreadCount } = useNotificationsStore();
  const { resetStore } = useTimeTrackingStore();

  // Cargar contador de notificaciones al montar
  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  const handleLogout = async () => {
    // Obtener URL actual del navegador para redirect
    const currentOrigin = window.location.origin;

    try {
      // Cerrar sesión de NextAuth
      await signOut({ redirect: false });
    } finally {
      // Siempre limpia stores y navega, incluso si signOut falla
      resetStore();
      // Usa assign en lugar de href para no dejar /dashboard en el historial
      window.location.assign(`${currentOrigin}/auth/login`);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-full">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <div className="relative ml-auto">
                <EllipsisVertical className="size-4" />
                {/* {unreadCount > 0 && (
                  <span className="bg-destructive absolute -right-0.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full z-10" />
                )} */}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/me/profile">
                  <User />
                  {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/notifications" className="relative">
                  <Bell />
                  {t("notifications")}
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 min-w-5 rounded-full px-1 text-xs">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
