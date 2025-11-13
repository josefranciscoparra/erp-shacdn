"use client";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MySpaceDashboard } from "@/server/actions/my-space";

interface RecentNotificationsProps {
  notifications: MySpaceDashboard["recentNotifications"];
}

export function RecentNotifications({ notifications }: RecentNotificationsProps) {
  if (notifications.length === 0) {
    return (
      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Notificaciones recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center text-sm">No tienes notificaciones recientes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones recientes</CardTitle>
        <CardAction>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" asChild>
                  <Link href="/dashboard/notifications">
                    <ChevronRight />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver todas</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.slice(0, 5).map((notification) => (
            <Link
              key={notification.id}
              href="/dashboard/notifications"
              className="hover:bg-accent flex items-start justify-between gap-4 rounded-lg border p-3 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm font-medium ${notification.read ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {notification.message}
                  </p>
                  {!notification.read && (
                    <Badge variant="default" className="flex-shrink-0 text-xs">
                      Nueva
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {format(new Date(notification.createdAt), "d MMM 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
