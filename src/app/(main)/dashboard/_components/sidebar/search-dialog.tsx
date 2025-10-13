"use client";
import * as React from "react";

import { useRouter } from "next/navigation";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSidebarItems, type NavMainItem, type NavSubItem } from "@/navigation/sidebar/sidebar-items-translated";

interface SearchItem {
  group: string;
  label: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

function flattenSidebarItems(items: ReturnType<typeof useSidebarItems>): SearchItem[] {
  const flatItems: SearchItem[] = [];

  items.forEach((group) => {
    const groupLabel = group.label ?? "General";

    group.items.forEach((item: NavMainItem) => {
      // Agregar el item principal
      flatItems.push({
        group: groupLabel,
        label: item.title,
        url: item.url,
        icon: item.icon,
        comingSoon: item.comingSoon,
      });

      // Agregar los sub-items si existen
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((subItem: NavSubItem) => {
          flatItems.push({
            group: groupLabel,
            label: subItem.title,
            url: subItem.url,
            icon: subItem.icon,
            comingSoon: subItem.comingSoon,
          });
        });
      }
    });
  });

  return flatItems;
}

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const t = useTranslations("header");
  const router = useRouter();
  const sidebarItems = useSidebarItems();
  const searchItems = React.useMemo(() => flattenSidebarItems(sidebarItems), [sidebarItems]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (item: SearchItem) => {
    setOpen(false);
    if (!item.comingSoon) {
      router.push(item.url);
    }
  };

  return (
    <>
      <Button
        variant="link"
        className="text-muted-foreground !px-0 font-normal hover:no-underline"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        {t("search")}
        <kbd className="bg-muted inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>
          {[...new Set(searchItems.map((item) => item.group))].map((group, i) => (
            <React.Fragment key={group}>
              {i !== 0 && <CommandSeparator />}
              <CommandGroup heading={group} key={group}>
                {searchItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        className="!py-1.5"
                        key={`${item.group}-${item.label}-${item.url}`}
                        onSelect={() => handleSelect(item)}
                        disabled={item.comingSoon}
                      >
                        {Icon && <Icon className="mr-2 size-4" />}
                        <span>{item.label}</span>
                        {item.comingSoon && (
                          <span className="text-muted-foreground ml-auto text-xs">(Próximamente)</span>
                        )}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
