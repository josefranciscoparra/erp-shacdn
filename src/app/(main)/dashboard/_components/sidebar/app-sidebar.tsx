"use client";

import Image from "next/image";
import Link from "next/link";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { useSidebarItems } from "@/navigation/sidebar/sidebar-items-translated";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { SidebarOrganizationSwitcher } from "./organization-switcher";

type AppSidebarUser = {
  readonly name: string;
  readonly email: string;
  readonly avatar: string;
  readonly role?: string;
  readonly orgId?: string;
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: AppSidebarUser;
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const sidebarItems = useSidebarItems();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLogoClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:text-foreground! h-auto hover:bg-transparent! data-[slot=sidebar-menu-button]:!p-2"
            >
              <Link href="/dashboard/me" className="flex items-center py-1" onClick={handleLogoClick}>
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
        <ScrollArea className="h-full">
          <NavMain items={sidebarItems} />
          {/* <NavDocuments items={data.documents} /> */}
          {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        {user?.role === "SUPER_ADMIN" && user.orgId && (
          <>
            <div className="px-2 py-1.5">
              <SidebarOrganizationSwitcher currentOrgId={user.orgId} />
            </div>
            <Separator className="mx-2" />
          </>
        )}
        {user && <NavUser user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
