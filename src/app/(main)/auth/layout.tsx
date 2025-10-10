import { ReactNode } from "react";

import Image from "next/image";

import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-white via-gray-300 to-gray-700 dark:from-gray-950 dark:via-gray-700 dark:to-gray-500">
      {/* Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Image
          src="/logo/cutnobacklight.png"
          alt="Timenow Cloud Logo"
          width={180}
          height={60}
          className="object-contain dark:hidden"
          priority
        />
        <Image
          src="/logo/cutnobackdark.png"
          alt="Timenow Cloud Logo"
          width={180}
          height={60}
          className="hidden object-contain dark:block"
          priority
        />
      </div>

      {/* Contenedor principal centrado hacia la derecha */}
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-end px-6">{children}</div>

      {/* Footer */}
      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-muted-foreground text-sm">{APP_CONFIG.copyright}</div>
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <Globe className="size-4" />
          ESP
        </div>
      </div>
    </main>
  );
}
