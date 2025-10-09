"use client";

import { useEffect } from "react";

import Link from "next/link";

import { Bell, EllipsisVertical, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { getInitials } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { useNotificationsStore } from "@/stores/notifications-store";

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

  // Cargar contador de notificaciones al montar
  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground relative"
            >
              {/* Badge de notificaciones */}
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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
            <DropdownMenuItem onClick={() => logoutAction()}>
              <LogOut />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
