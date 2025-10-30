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
  Upload,
  Search,
  Filter,
  Loader2,
} from "lucide-react";

import { DocumentListTable } from "@/components/employees/document-list-table";
import { DocumentUploadDialog } from "@/components/employees/document-upload-dialog";
import { TemporaryPasswordManager } from "@/components/employees/temporary-password-manager";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { features } from "@/config/features";
import { documentKindLabels, type DocumentKind } from "@/lib/validations/document";
import { getEmployeePtoBalance, getEmployeePtoRequests } from "@/server/actions/admin-pto";
import { getCurrentUserRole } from "@/server/actions/get-current-user-role";
import { useDocumentsStore, useDocumentsByKind, useDocumentStats } from "@/stores/documents-store";

import { EmployeePtoRequestsTable } from "./_components/employee-pto-requests-table";
import { EmployeePtoSummary } from "./_components/employee-pto-summary";

// Tipos de documentos para tabs
const documentTabs: { key: DocumentKind | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "CONTRACT", label: "Contratos" },
  { key: "PAYSLIP", label: "Nóminas" },
  { key: "ID_DOCUMENT", label: "DNI/NIE" },
  { key: "SS_DOCUMENT", label: "Seg. Social" },
  { key: "CERTIFICATE", label: "Certificados" },
  { key: "MEDICAL", label: "Médicos" },
  { key: "OTHER", label: "Otros" },
];

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
  photoUrl: string | null;
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
  const documentsEnabled = features.documents;

  // Estado para PTO
  const [ptoBalance, setPtoBalance] = useState<any>(null);
  const [ptoRequests, setPtoRequests] = useState<any[]>([]);
  const [isPtoLoading, setIsPtoLoading] = useState(false);
  const [canManagePto, setCanManagePto] = useState(false);

  // Estado para documentos
  const {
    documents,
    isLoading: isLoadingDocuments,
    fetchDocuments,
    setFilters,
    clearFilters,
    filters,
  } = useDocumentsStore();
  const documentsByKind = useDocumentsByKind();
  const stats = useDocumentStats();

  const [activeDocTab, setActiveDocTab] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

      // Verificar permisos de gestión de PTO
      const userRole = await getCurrentUserRole();
      setCanManagePto(userRole ? ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(userRole) : false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const loadPtoData = async () => {
    if (!params.id) return;

    setIsPtoLoading(true);
    try {
      const [balance, requests] = await Promise.all([
        getEmployeePtoBalance(params.id as string),
        getEmployeePtoRequests(params.id as string),
      ]);

      setPtoBalance(balance);
      setPtoRequests(requests);
    } catch (error) {
      console.error("Error al cargar datos de PTO:", error);
    } finally {
      setIsPtoLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!params.id || !documentsEnabled) return;
    await fetchDocuments(params.id as string);
  };

  // Manejar cambio de tab de documentos
  const handleDocTabChange = (value: string) => {
    setActiveDocTab(value);
    if (value === "all") {
      clearFilters();
    } else {
      setFilters({ documentKind: value as DocumentKind });
    }
  };

  // Manejar búsqueda de documentos
  const handleDocSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ search: value || undefined });
  };

  // Obtener conteo para cada tab de documentos
  const getDocTabCount = (tabKey: string) => {
    if (tabKey === "all") return stats.total;
    return stats.byKind[tabKey as DocumentKind] ?? 0;
  };

  // Filtrar documentos según tab activo
  const filteredDocuments = activeDocTab === "all" ? documents : (documentsByKind[activeDocTab as DocumentKind] ?? []);

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
          description={error ?? "El empleado que buscas no existe o no tienes permisos para verlo"}
        />
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;
  const photoUrl = employee.photoUrl ?? null;

  const profileAvatar = (
    <Avatar className="h-12 w-12">
      {photoUrl ? <AvatarImage src={photoUrl} alt={fullName} /> : null}
      <AvatarFallback className="bg-muted text-muted-foreground">
        <User className="h-5 w-5" />
      </AvatarFallback>
    </Avatar>
  );
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
            {photoUrl ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="focus:ring-ring rounded-full focus:ring-2 focus:ring-offset-2 focus:outline-none"
                    aria-label="Ver foto ampliada"
                  >
                    {profileAvatar}
                  </button>
                </DialogTrigger>
                <DialogContent className="border-none bg-transparent p-0 shadow-none sm:max-w-2xl" showCloseButton>
                  <DialogHeader className="sr-only">
                    <DialogTitle>Foto de {fullName}</DialogTitle>
                  </DialogHeader>
                  <div className="bg-background rounded-lg">
                    <img
                      src={photoUrl}
                      alt={`Foto de ${fullName}`}
                      className="max-h-[80vh] w-full rounded-lg object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              profileAvatar
            )}
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
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/employees/${employee.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs
        defaultValue="information"
        className="w-full"
        onValueChange={(value) => {
          if (value === "pto" && ptoRequests.length === 0) {
            loadPtoData();
          }
          if (value === "documents" && documents.length === 0) {
            loadDocuments();
          }
        }}
      >
        <TabsList className={`grid w-full ${documentsEnabled ? "grid-cols-6" : "grid-cols-5"}`}>
          <TabsTrigger value="information">Información</TabsTrigger>
          <TabsTrigger value="contract">Contrato Actual</TabsTrigger>
          <TabsTrigger value="access">Acceso</TabsTrigger>
          {documentsEnabled && <TabsTrigger value="documents">Documentos</TabsTrigger>}
          <TabsTrigger value="pto">Vacaciones</TabsTrigger>
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
            {(employee.address ?? employee.city) && (
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
                temporaryPasswords={employee.user.temporaryPasswords ?? []}
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
        {documentsEnabled && (
          <TabsContent value="documents" className="space-y-4">
            {/* Filtros y búsqueda */}
            <Card className="bg-card rounded-lg border">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 @md/main:flex-row @md/main:items-center @md/main:justify-between">
                  <div className="flex flex-1 items-center gap-2">
                    <div className="relative max-w-sm flex-1">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        placeholder="Buscar documentos..."
                        value={searchTerm}
                        onChange={(e) => handleDocSearch(e.target.value)}
                        className="placeholder:text-muted-foreground/50 bg-white pl-9"
                      />
                    </div>
                    {(filters.search ?? filters.documentKind) && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="whitespace-nowrap">
                        <Filter className="mr-2 h-4 w-4" />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>

                  <Button onClick={() => setUploadDialogOpen(true)} className="whitespace-nowrap">
                    <Upload className="mr-2 h-4 w-4" />
                    Subir documento
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabs de documentos */}
            <Tabs value={activeDocTab} onValueChange={handleDocTabChange}>
              <div className="flex items-center justify-between">
                {/* Selector móvil */}
                <Select value={activeDocTab} onValueChange={handleDocTabChange}>
                  <SelectTrigger className="w-48 @4xl/main:hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTabs.map((tab) => (
                      <SelectItem key={tab.key} value={tab.key}>
                        <div className="flex items-center gap-2">
                          {tab.label}
                          <Badge variant="secondary">{getDocTabCount(tab.key)}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Tabs desktop */}
                <TabsList className="hidden @4xl/main:flex">
                  {documentTabs.map((tab) => (
                    <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                      {tab.label}
                      <Badge variant="secondary">{getDocTabCount(tab.key)}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Contenido de tabs */}
              {documentTabs.map((tab) => (
                <TabsContent key={tab.key} value={tab.key}>
                  <Card className="bg-card rounded-lg border">
                    <CardContent className="p-0">
                      {isLoadingDocuments ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                          <span className="text-muted-foreground ml-2">Cargando documentos...</span>
                        </div>
                      ) : filteredDocuments.length > 0 ? (
                        <DocumentListTable documents={filteredDocuments} employeeId={employee.id} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <FileText className="text-muted-foreground mb-4 h-12 w-12" />
                          <h3 className="mb-2 text-lg font-medium">No hay documentos</h3>
                          <p className="text-muted-foreground mb-4 max-w-sm">
                            {tab.key === "all"
                              ? "No se han subido documentos para este empleado"
                              : `No hay documentos de tipo "${tab.label}" para este empleado`}
                          </p>
                          <Button onClick={() => setUploadDialogOpen(true)} variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Subir primer documento
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>

            {/* Dialog de subida */}
            <DocumentUploadDialog
              open={uploadDialogOpen}
              onOpenChange={setUploadDialogOpen}
              employeeId={employee.id}
              employeeName={fullName}
            />
          </TabsContent>
        )}

        {/* Vacaciones */}
        <TabsContent value="pto" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Balance de Vacaciones</h3>
            {canManagePto && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/employees/${employee.id}/pto`)}
              >
                Gestión avanzada
              </Button>
            )}
          </div>

          <EmployeePtoSummary balance={ptoBalance} isLoading={isPtoLoading} />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Historial de Solicitudes</h3>
            <EmployeePtoRequestsTable
              requests={ptoRequests}
              isLoading={isPtoLoading}
              canManage={canManagePto}
              onRefresh={loadPtoData}
            />
          </div>
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
