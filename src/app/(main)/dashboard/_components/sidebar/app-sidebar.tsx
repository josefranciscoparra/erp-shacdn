"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { useSidebarItems } from "@/navigation/sidebar/sidebar-items-translated";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: {
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
  };
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const sidebarItems = useSidebarItems();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-auto data-[slot=sidebar-menu-button]:!p-2">
              <Link href="/dashboard/me" className="flex items-center py-1">
                <Image
                  src="/logo/cutnobacklight.png"
                  alt={APP_CONFIG.name}
                  width={140}
                  height={50}
                  className="object-contain dark:hidden"
                  priority
                />
                <Image
                  src="/logo/cutnobackdark.png"
                  alt={APP_CONFIG.name}
                  width={140}
                  height={50}
                  className="hidden object-contain dark:block"
                  priority
                />
                <span className="sr-only">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
