/**
 * Aviso de Vista Solo Disponible en PC
 *
 * Componente reutilizable que muestra un mensaje indicando que la vista
 * solo está disponible en dispositivos con pantalla grande.
 */

"use client";

import { Monitor } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MobileViewWarningProps {
  title?: string;
  description?: string;
}

export function MobileViewWarning({
  title = "Vista disponible solo en PC",
  description = "Esta sección requiere una pantalla más grande. Por favor, accede desde un ordenador o tablet para ver el contenido completo.",
}: MobileViewWarningProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="bg-muted mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
          <Monitor className="text-muted-foreground size-8" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="mx-auto max-w-md">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
