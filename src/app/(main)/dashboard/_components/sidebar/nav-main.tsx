"use client";

import { useMemo } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { type NavGroup, type NavMainItem } from "@/navigation/sidebar/sidebar-items";
import { useChatUnreadStore } from "@/stores/chat-unread-store";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}

const IsComingSoon = () => (
  <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">Soon</span>
);

/**
 * Indicador de mensajes no leídos para el item de Chat en sidebar
 * - Punto rojo cuando hay mensajes no leídos
 * - Se oculta cuando no hay mensajes
 */
const ChatUnreadIndicator = ({ url }: { url: string }) => {
  const totalUnreadCount = useChatUnreadStore((state) => state.totalUnreadCount);

  // Solo mostrar en el item de Chat
  if (url !== "/dashboard/chat" || totalUnreadCount === 0) {
    return null;
  }

  return (
    <span
      className="bg-destructive ml-auto flex size-2 shrink-0 rounded-full"
      aria-label={`${totalUnreadCount} mensajes no leídos`}
    />
  );
};

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
  onLinkClick,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
  onLinkClick?: () => void;
}) => {
  return (
    <Collapsible key={item.title} asChild defaultOpen={isSubmenuOpen(item.subItems)} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {item.subItems ? (
            <SidebarMenuButton
              disabled={item.comingSoon}
              isActive={isActive(item.url, item.subItems)}
              tooltip={item.title}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              {item.comingSoon && <IsComingSoon />}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              asChild
              aria-disabled={item.comingSoon}
              isActive={isActive(item.url)}
              tooltip={item.title}
            >
              <Link href={item.url} target={item.newTab ? "_blank" : undefined} onClick={onLinkClick}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
                {item.comingSoon && <IsComingSoon />}
                <ChatUnreadIndicator url={item.url} />
              </Link>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {item.subItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton aria-disabled={subItem.comingSoon} isActive={isActive(subItem.url)} asChild>
                    <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined} onClick={onLinkClick}>
                      {subItem.icon && <subItem.icon />}
                      <span>{subItem.title}</span>
                      {subItem.comingSoon && <IsComingSoon />}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavItemCollapsed = ({
  item,
  isActive,
  onLinkClick,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  onLinkClick?: () => void;
}) => {
  return (
    <SidebarMenuItem key={item.title}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            disabled={item.comingSoon}
            tooltip={item.title}
            isActive={isActive(item.url, item.subItems)}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            <ChevronRight />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-50 space-y-1" side="right" align="start">
          {item.subItems?.map((subItem) => (
            <DropdownMenuItem key={subItem.title} asChild>
              <SidebarMenuSubButton
                key={subItem.title}
                asChild
                className="focus-visible:ring-0"
                aria-disabled={subItem.comingSoon}
                isActive={isActive(subItem.url)}
              >
                <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined} onClick={onLinkClick}>
                  {subItem.icon && <subItem.icon className="[&>svg]:text-sidebar-foreground" />}
                  <span>{subItem.title}</span>
                  {subItem.comingSoon && <IsComingSoon />}
                </Link>
              </SidebarMenuSubButton>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const normalizedPath = useMemo(() => {
    if (path.startsWith("/g/")) {
      const strippedPath = path.replace(/^\/g\/[^/]+/, "");
      if (strippedPath.startsWith("/dashboard/admin/users")) {
        return "/dashboard/admin/group-users";
      }
      return strippedPath;
    }
    return path;
  }, [path]);

  // 1. Obtener todas las URLs registradas en el menú (items y subItems)
  const allUrls = useMemo(() => {
    const urls: string[] = [];
    items.forEach((group) => {
      group.items.forEach((item) => {
        urls.push(item.url);
        item.subItems?.forEach((sub) => urls.push(sub.url));
      });
    });
    return urls;
  }, [items]);

  // 2. Encontrar la "mejor coincidencia" (la URL más larga que sea prefijo del path actual)
  const bestMatchUrl = useMemo(() => {
    // Filtrar URLs que coinciden con el inicio del path
    // Se usa startsWith con '/' para asegurar coincidencia de segmento completo, o coincidencia exacta
    const matches = allUrls.filter((url) => normalizedPath === url || normalizedPath.startsWith(url + "/"));

    // Ordenar por longitud descendente para obtener la más específica
    return matches.sort((a, b) => b.length - a.length)[0];
  }, [allUrls, normalizedPath]);

  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (!bestMatchUrl) {
      return false;
    }

    if (subItems?.length) {
      // Activo si la coincidencia es la URL del propio item o una de sus rutas hijas
      return bestMatchUrl === url || subItems.some((sub) => sub.url === bestMatchUrl);
    }

    // Items sin submenú: coincidencia exacta
    return url === bestMatchUrl;
  };

  const isSubmenuOpen = (subItems?: NavMainItem["subItems"]) => {
    return subItems?.some((sub) => normalizedPath.startsWith(sub.url)) ?? false;
  };

  // Cerrar sidebar en móvil al hacer clic en un link
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items.map((item) => {
                if (state === "collapsed" && !isMobile) {
                  // If no subItems, just render the button as a link
                  if (!item.subItems) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          aria-disabled={item.comingSoon}
                          tooltip={item.title}
                          isActive={isItemActive(item.url)}
                        >
                          <Link href={item.url} target={item.newTab ? "_blank" : undefined} onClick={handleLinkClick}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChatUnreadIndicator url={item.url} />
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  // Otherwise, render the dropdown as before
                  return (
                    <NavItemCollapsed
                      key={item.title}
                      item={item}
                      isActive={isItemActive}
                      onLinkClick={handleLinkClick}
                    />
                  );
                }
                // Expanded view
                return (
                  <NavItemExpanded
                    key={item.title}
                    item={item}
                    isActive={isItemActive}
                    isSubmenuOpen={isSubmenuOpen}
                    onLinkClick={handleLinkClick}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
