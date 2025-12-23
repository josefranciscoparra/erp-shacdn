"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
  items: {
    category: string;
    items: {
      label: string;
      value: string;
      icon?: React.ReactNode;
    }[];
  }[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function SettingsSidebar({ items, activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <nav className="w-full shrink-0 flex-col space-y-8 md:w-64">
      {items.map((section) => (
        <div key={section.category} className="flex flex-col space-y-2">
          <h3 className="text-muted-foreground px-4 text-xs font-semibold tracking-wider uppercase">
            {section.category}
          </h3>
          <div className="flex flex-col space-y-1">
            {section.items.map((item) => (
              <Button
                key={item.value}
                variant={activeTab === item.value ? "secondary" : "ghost"}
                className={cn(
                  "h-9 justify-start px-4 font-normal",
                  activeTab === item.value
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onTabChange(item.value)}
              >
                {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
