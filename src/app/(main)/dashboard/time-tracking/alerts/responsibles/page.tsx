import Link from "next/link";

import { ArrowRight, MoveRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Página de transición para redirigir a la nueva ubicación de gestión de responsables.
 * Mantenemos esta ruta para evitar enlaces rotos y educar al usuario sobre el cambio.
 */
export default function AlertsResponsiblesRedirectPage() {
  // Opción A: Redirección automática (descomentar si se prefiere)
  // redirect("/dashboard/organization/responsibles");

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <MoveRight className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Hemos movido esta sección</CardTitle>
          <CardDescription>
            La gestión de responsables y destinatarios de alertas ahora se encuentra centralizada en la configuración de
            la Organización.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Desde la nueva sección &quot;Matriz de Responsabilidades&quot; podrás definir quién gestiona cada
            departamento y qué alertas recibe.
          </p>
          <Button asChild className="w-full">
            <Link href="/dashboard/organization/responsibles">
              Ir a Matriz de Responsabilidades
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
