"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Briefcase,
  DollarSign,
  Clock,
  MapPin,
  User,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { EmployeeStatusBadge } from "@/components/employees/employee-status-select";

interface Position {
  id: string;
  title: string;
  level: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface CostCenter {
  id: string;
  name: string;
  code: string | null;
}

interface Manager {
  firstName: string;
  lastName: string;
}

interface EmploymentContract {
  id: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  weeklyHours: number;
  grossSalary: number | null;
  active: boolean;
  position: Position | null;
  department: Department | null;
  costCenter: CostCenter | null;
  manager: Manager | null;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  employmentStatus: "PENDING_CONTRACT" | "ACTIVE" | "ON_LEAVE" | "VACATION" | "SUSPENDED" | "TERMINATED" | "RETIRED";
  employmentContracts: EmploymentContract[];
}

const CONTRACT_TYPES = {
  INDEFINIDO: "Indefinido",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas",
  FORMACION: "Formación",
  OBRA_SERVICIO: "Obra o Servicio",
  EVENTUAL: "Eventual",
  INTERINIDAD: "Interinidad",
} as const;

export default function EmployeeContractsPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/employees/${params.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al cargar empleado");
      }

      const employeeData = await response.json();
      setEmployee(employeeData);
    } catch (error: any) {
      console.error("Error fetching employee:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchEmployee();
    }
  }, [params.id]);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "No especificado";
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const getContractTypeBadge = (type: string) => {
    switch (type) {
      case "INDEFINIDO":
        return (
          <Badge variant="default" className="border-green-200 bg-green-100 text-green-800">
            Indefinido
          </Badge>
        );
      case "TEMPORAL":
        return (
          <Badge variant="default" className="border-blue-200 bg-blue-100 text-blue-800">
            Temporal
          </Badge>
        );
      case "PRACTICAS":
        return (
          <Badge variant="default" className="border-purple-200 bg-purple-100 text-purple-800">
            Prácticas
          </Badge>
        );
      default:
        return <Badge variant="secondary">{CONTRACT_TYPES[type as keyof typeof CONTRACT_TYPES] || type}</Badge>;
    }
  };

  const activeContracts = employee?.employmentContracts?.filter((contract) => contract.active) || [];
  const inactiveContracts = employee?.employmentContracts?.filter((contract) => !contract.active) || [];

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Cargando contratos..."
          backButton={{
            href: `/dashboard/employees/${params.id}`,
            label: "Volver al perfil",
          }}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando contratos del empleado...</span>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Error"
          backButton={{
            href: `/dashboard/employees/${params.id}`,
            label: "Volver al perfil",
          }}
        />
        <EmptyState
          icon={<AlertCircle className="text-destructive mx-auto h-12 w-12" />}
          title="Error al cargar contratos"
          description={error || "No se pudieron cargar los contratos del empleado"}
        />
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-semibold">Contratos</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-sm">{fullName}</p>
              <EmployeeStatusBadge status={employee.employmentStatus} />
            </div>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Contrato
        </Button>
      </div>

      {/* Tabs de contratos */}
      <Tabs defaultValue="active" className="w-full">
        <div className="mb-6 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active" className="relative">
              Contratos Activos
              {activeContracts.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeContracts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inactive" className="relative">
              Historial
              {inactiveContracts.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {inactiveContracts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active">
          {activeContracts.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="text-muted-foreground mx-auto h-12 w-12" />}
              title="No hay contratos activos"
              description="Este empleado no tiene contratos activos en este momento"
              action={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Contrato
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:gap-6">
              {activeContracts.map((contract) => (
                <Card key={contract.id} className="from-primary/5 to-card bg-gradient-to-t shadow-xs">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getContractTypeBadge(contract.contractType)}
                          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                            Activo
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{contract.position?.title || "Sin puesto asignado"}</CardTitle>
                        <CardDescription>
                          {contract.department?.name || "Sin departamento"} •{" "}
                          {contract.costCenter?.name || "Sin centro de coste"}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground h-4 w-4" />
                        <div className="text-sm">
                          <p className="font-medium">Fecha de inicio</p>
                          <p className="text-muted-foreground">{formatDate(contract.startDate)}</p>
                        </div>
                      </div>
                      {contract.endDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground h-4 w-4" />
                          <div className="text-sm">
                            <p className="font-medium">Fecha de fin</p>
                            <p className="text-muted-foreground">{formatDate(contract.endDate)}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="text-muted-foreground h-4 w-4" />
                        <div className="text-sm">
                          <p className="font-medium">Horas semanales</p>
                          <p className="text-muted-foreground">{contract.weeklyHours}h</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="text-muted-foreground h-4 w-4" />
                        <div className="text-sm">
                          <p className="font-medium">Salario bruto anual</p>
                          <p className="text-muted-foreground">{formatCurrency(contract.grossSalary)}</p>
                        </div>
                      </div>
                    </div>
                    {contract.manager && (
                      <div className="flex items-center gap-2 border-t pt-2">
                        <User className="text-muted-foreground h-4 w-4" />
                        <div className="text-sm">
                          <p className="font-medium">Responsable</p>
                          <p className="text-muted-foreground">
                            {contract.manager.firstName} {contract.manager.lastName}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {inactiveContracts.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="text-muted-foreground mx-auto h-12 w-12" />}
              title="No hay contratos anteriores"
              description="Este empleado no tiene contratos en el historial"
            />
          ) : (
            <div className="grid gap-4 md:gap-6">
              {inactiveContracts.map((contract) => (
                <Card key={contract.id} className="opacity-75">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getContractTypeBadge(contract.contractType)}
                          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
                            Finalizado
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{contract.position?.title || "Sin puesto asignado"}</CardTitle>
                        <CardDescription>
                          {contract.department?.name || "Sin departamento"} •{" "}
                          {contract.costCenter?.name || "Sin centro de coste"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground h-4 w-4" />
                        <div className="text-sm">
                          <p className="font-medium">Fecha de inicio</p>
                          <p className="text-muted-foreground">{formatDate(contract.startDate)}</p>
                        </div>
                      </div>
                      {contract.endDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground h-4 w-4" />
                          <div className="text-sm">
                            <p className="font-medium">Fecha de fin</p>
                            <p className="text-muted-foreground">{formatDate(contract.endDate)}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="text-muted-foreground h-4 w-4" />
                        <div className="text-sm">
                          <p className="font-medium">Horas semanales</p>
                          <p className="text-muted-foreground">{contract.weeklyHours}h</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="text-muted-foreground h-4 w-4" />
                        <div className="text-sm">
                          <p className="font-medium">Salario bruto anual</p>
                          <p className="text-muted-foreground">{formatCurrency(contract.grossSalary)}</p>
                        </div>
                      </div>
                    </div>
                    {contract.manager && (
                      <div className="flex items-center gap-2 border-t pt-2">
                        <User className="text-muted-foreground h-4 w-4" />
                        <div className="text-sm">
                          <p className="font-medium">Responsable</p>
                          <p className="text-muted-foreground">
                            {contract.manager.firstName} {contract.manager.lastName}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
