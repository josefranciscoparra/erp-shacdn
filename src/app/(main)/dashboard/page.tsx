import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Building, FileText, Calendar, TrendingUp, Plus } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard ERP</h1>
          <p className="text-sm text-muted-foreground">
            Panel de control del sistema de gestión empresarial
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/employees/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo empleado
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Empleados</CardDescription>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">0</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">
                <TrendingUp className="h-3 w-3" />
                Inicial
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              empleados registrados
            </p>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Departamentos</CardDescription>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">0</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">
                <TrendingUp className="h-3 w-3" />
                Configuración
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              departamentos configurados
            </p>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Contratos</CardDescription>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">0</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">
                <TrendingUp className="h-3 w-3" />
                Activos
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              contratos vigentes
            </p>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Eventos</CardDescription>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">0</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">
                <Calendar className="h-3 w-3" />
                Próximos
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              eventos programados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
            <CardDescription>
              Funciones más utilizadas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="ghost" className="w-full justify-start h-auto p-3" asChild>
              <Link href="/dashboard/employees/new">
                <Users className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Registrar empleado</div>
                  <div className="text-xs text-muted-foreground">Añadir nuevo empleado al sistema</div>
                </div>
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start h-auto p-3" asChild>
              <Link href="/dashboard/departments">
                <Building className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Gestionar departamentos</div>
                  <div className="text-xs text-muted-foreground">Configurar estructura organizativa</div>
                </div>
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start h-auto p-3" asChild>
              <Link href="/dashboard/contracts">
                <FileText className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Contratos laborales</div>
                  <div className="text-xs text-muted-foreground">Gestionar contratos y documentos</div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>
              Últimas acciones realizadas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium mb-1 text-foreground">No hay actividad reciente</h3>
              <p className="text-xs">Las acciones del sistema aparecerán aquí</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
