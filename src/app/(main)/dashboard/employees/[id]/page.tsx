"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FileText,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Badge as BadgeIcon,
  Building2,
  Clock,
  User,
  Shield,
  FolderOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { TemporaryPasswordManager } from "@/components/employees/temporary-password-manager";

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  nifNie: string;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  country: string;
  birthDate: string | null;
  nationality: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyRelationship: string | null;
  active: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    active: boolean;
    temporaryPasswords?: Array<{
      id: string;
      password: string;
      createdAt: string;
      expiresAt: string;
      reason: string | null;
      usedAt: string | null;
      createdBy: {
        name: string;
      };
    }>;
  } | null;
  employmentContracts: Array<{
    id: string;
    contractType: string;
    startDate: string;
    endDate: string | null;
    weeklyHours: number;
    grossSalary: number | null;
    active: boolean;
    position: {
      title: string;
      level: string | null;
    } | null;
    department: {
      name: string;
    } | null;
    costCenter: {
      name: string;
      code: string | null;
    } | null;
  }>;
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const response = await fetch(`/api/employees/${params.id}`);
      if (!response.ok) {
        throw new Error("Empleado no encontrado");
      }
      const data = await response.json();
      setEmployee(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchEmployee();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Cargando empleado..."
          backButton={{
            href: "/dashboard/employees",
            label: "Volver a empleados",
          }}
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse">Cargando perfil del empleado...</div>
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
            href: "/dashboard/employees",
            label: "Volver a empleados",
          }}
        />
        <EmptyState
          icon={<AlertCircle className="text-destructive mx-auto h-12 w-12" />}
          title="Empleado no encontrado"
          description={error || "El empleado que buscas no existe o no tienes permisos para verlo"}
        />
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;
  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  const activeContract = employee.employmentContracts.find((c) => c.active);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-foreground text-2xl font-semibold">{fullName}</h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={employee.active ? "default" : "destructive"}>
                  {employee.active ? "Activo" : "Inactivo"}
                </Badge>
                {employee.employeeNumber && (
                  <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/employees/${employee.id}/contracts`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Contratos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/employees/${employee.id}/documents`)}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Documentos
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/employees/${employee.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="information" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="information">Información</TabsTrigger>
          <TabsTrigger value="contract">Contrato Actual</TabsTrigger>
          <TabsTrigger value="access">Acceso</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Información Personal */}
        <TabsContent value="information" className="space-y-6">
          <div className="grid gap-6 @4xl/main:grid-cols-2">
            {/* Datos Personales */}
            <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <User className="mr-2 h-5 w-5" />
                  Datos Personales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center text-sm">
                    <BadgeIcon className="text-muted-foreground mr-2 h-4 w-4" />
                    <span className="text-muted-foreground w-20">NIF/NIE:</span>
                    <span className="font-mono">{employee.nifNie}</span>
                  </div>

                  {employee.birthDate && (
                    <div className="flex items-center text-sm">
                      <Calendar className="text-muted-foreground mr-2 h-4 w-4" />
                      <span className="text-muted-foreground w-20">Nacimiento:</span>
                      <span>{formatDate(employee.birthDate)}</span>
                    </div>
                  )}

                  {employee.nationality && (
                    <div className="flex items-center text-sm">
                      <span className="text-muted-foreground w-24">Nacionalidad:</span>
                      <span>{employee.nationality}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Datos de Contacto */}
            <Card className="rounded-lg border shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {employee.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="text-muted-foreground mr-2 h-4 w-4" />
                      <span className="text-muted-foreground w-16">Email:</span>
                      <span className="text-blue-600">{employee.email}</span>
                    </div>
                  )}

                  {employee.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="text-muted-foreground mr-2 h-4 w-4" />
                      <span className="text-muted-foreground w-16">Teléfono:</span>
                      <span>{employee.phone}</span>
                    </div>
                  )}

                  {employee.mobilePhone && (
                    <div className="flex items-center text-sm">
                      <Phone className="text-muted-foreground mr-2 h-4 w-4" />
                      <span className="text-muted-foreground w-16">Móvil:</span>
                      <span>{employee.mobilePhone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dirección */}
            {(employee.address || employee.city) && (
              <Card className="rounded-lg border shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">
                    <MapPin className="mr-2 inline h-5 w-5" />
                    Dirección
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {employee.address && <div>{employee.address}</div>}
                    <div>
                      {employee.postalCode} {employee.city}
                    </div>
                    {employee.province && <div>{employee.province}</div>}
                    <div>{employee.country === "ES" ? "España" : employee.country}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacto de Emergencia */}
            {employee.emergencyContactName && (
              <Card className="rounded-lg border shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-orange-600">
                    <AlertCircle className="mr-2 inline h-5 w-5" />
                    Contacto de Emergencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">{employee.emergencyContactName}</span>
                    {employee.emergencyRelationship && (
                      <span className="text-muted-foreground ml-2">({employee.emergencyRelationship})</span>
                    )}
                  </div>
                  {employee.emergencyContactPhone && (
                    <div className="text-muted-foreground text-sm">{employee.emergencyContactPhone}</div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </TabsContent>

        {/* Contrato Actual */}
        <TabsContent value="contract" className="space-y-6">
          {activeContract ? (
            <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">
                  <Building2 className="mr-2 inline h-5 w-5" />
                  Contrato Vigente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 @4xl/main:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Tipo:</span>
                      <Badge variant="outline">{activeContract.contractType}</Badge>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Inicio:</span>
                      <span className="text-sm">{formatDate(activeContract.startDate)}</span>
                    </div>

                    {activeContract.endDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Fin:</span>
                        <span className="text-sm">{formatDate(activeContract.endDate)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Jornada:</span>
                      <span className="text-sm">{activeContract.weeklyHours}h/semana</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeContract.position && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Puesto:</span>
                        <span className="text-sm font-medium">{activeContract.position.title}</span>
                      </div>
                    )}

                    {activeContract.department && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Departamento:</span>
                        <span className="text-sm">{activeContract.department.name}</span>
                      </div>
                    )}

                    {activeContract.costCenter && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Centro:</span>
                        <span className="text-sm">{activeContract.costCenter.name}</span>
                      </div>
                    )}

                    {activeContract.grossSalary && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Salario bruto:</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(activeContract.grossSalary)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<FileText className="mx-auto h-12 w-12" />}
              title="Sin contrato activo"
              description="Este empleado no tiene un contrato laboral activo"
            />
          )}
        </TabsContent>

        {/* Acceso */}
        <TabsContent value="access" className="space-y-6">
          {employee.user ? (
            <div className="space-y-6">
              {/* Usuario del Sistema */}
              <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">
                    <Shield className="mr-2 inline h-5 w-5" />
                    Usuario del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Email:</span>
                    <span className="font-mono text-sm">{employee.user.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Rol:</span>
                    <Badge variant="outline">{employee.user.role}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Estado:</span>
                    <Badge variant={employee.user.active ? "default" : "destructive"}>
                      {employee.user.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Contraseñas Temporales */}
              <TemporaryPasswordManager
                userId={employee.user.id}
                temporaryPasswords={employee.user.temporaryPasswords || []}
                onPasswordReset={() => fetchEmployee(true)}
              />
            </div>
          ) : (
            <EmptyState
              icon={<Shield className="mx-auto h-12 w-12" />}
              title="Sin usuario de sistema"
              description="Este empleado no tiene un usuario asociado en el sistema"
            />
          )}
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documents">
          <Card className="rounded-lg border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg">
                <FolderOpen className="mr-2 inline h-5 w-5" />
                Gestión de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Accede a la gestión completa de documentos del empleado
                </p>
                <Button 
                  onClick={() => router.push(`/dashboard/employees/${employee.id}/documents`)}
                  className="w-full @md/main:w-auto"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Ver Documentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial */}
        <TabsContent value="history">
          <Card className="rounded-lg border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg">
                <Clock className="mr-2 inline h-5 w-5" />
                Información del Registro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Creado:</span>
                  <span>{formatDate(employee.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contratos totales:</span>
                  <span>{employee.employmentContracts.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
