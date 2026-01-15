"use client";

import { useEffect, useMemo, useState } from "react";

import { useParams, useRouter, useSearchParams } from "next/navigation";

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
  Upload,
  Search,
  Filter,
  Loader2,
  CreditCard,
  Send,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DocumentListTable } from "@/components/employees/document-list-table";
import { DocumentUploadDialog } from "@/components/employees/document-upload-dialog";
import { EmployeeIbanDisplay } from "@/components/employees/employee-iban-display";
import { TemporaryPasswordManager } from "@/components/employees/temporary-password-manager";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { features } from "@/config/features";
import { usePermissions } from "@/hooks/use-permissions";
import { type DocumentKind } from "@/lib/validations/document";
import { type EmployeeAdditionalField, type EmployeeGender } from "@/lib/validations/employee";
import { getEmployeePtoBalance, getEmployeePtoRequests } from "@/server/actions/admin-pto";
import { resendInviteEmail } from "@/server/actions/auth-tokens";
import { getCurrentUserRole } from "@/server/actions/get-current-user-role";
import { getEmployeeCurrentAssignment } from "@/server/actions/schedules-v2";
import { getEmployeeSettlements, type SettlementListItem } from "@/server/actions/vacation-settlement";
import { useDocumentsStore, useDocumentsByKind, useDocumentStats } from "@/stores/documents-store";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

import { EmployeeExpenseApprover } from "./_components/employee-expense-approver";
import { EmployeePtoRequestsTable } from "./_components/employee-pto-requests-table";
import { EmployeePtoSummary } from "./_components/employee-pto-summary";
import { EmployeeSignedDocuments } from "./_components/employee-signed-documents";

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

const MAIN_TABS = [
  { value: "information", label: "Información" },
  { value: "contract", label: "Laboral" },
  { value: "access", label: "Acceso" },
  { value: "documents", label: "Documentos", requiresDocuments: true },
  { value: "expenses", label: "Gastos" },
  { value: "pto", label: "Vacaciones" },
  { value: "settlements", label: "Liquidaciones" },
  { value: "history", label: "Historial" },
] as const;

type MainTabValue = (typeof MAIN_TABS)[number]["value"];

// Mapeo de roles a español
const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Empleado",
  MANAGER: "Responsable",
  HR_ASSISTANT: "Asistente RRHH",
  HR_ADMIN: "Admin RRHH",
  ORG_ADMIN: "Admin Organización",
  SUPER_ADMIN: "Super Admin",
};

const GENDER_LABELS: Record<EmployeeGender, string> = {
  MALE: "Hombre",
  FEMALE: "Mujer",
  NON_BINARY: "No binario",
  NOT_SPECIFIED: "No especificado",
};

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
  gender: EmployeeGender;
  iban: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyRelationship: string | null;
  photoUrl: string | null;
  additionalFields: EmployeeAdditionalField[] | null;
  active: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    active: boolean;
    mustChangePassword: boolean;
    temporaryPasswords?: Array<{
      id: string;
      password: string;
      createdAt: string;
      expiresAt: string;
      reason: string | null;
      usedAt: string | null;
      active: boolean;
      invalidatedAt: string | null;
      invalidatedReason: string | null;
      notes: string | null;
      createdBy: {
        name: string;
      };
    }>;
  } | null;
  inviteStatus?: "PENDING" | "SENT" | "FAILED";
  inviteLastAttemptAt?: string | null;
  inviteHistory?: Array<{
    id: string;
    createdAt: string;
    status: string;
    errorMessage?: string | null;
    subject?: string | null;
  }>;
  team: {
    id: string;
    name: string;
    code: string | null;
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
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Empleado" subtitle="Detalle del empleado" />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );
  const { hasPermission } = usePermissions();
  const canManageEmployees = hasPermission("manage_employees");
  const canViewContracts = hasPermission("view_contracts") || hasPermission("manage_contracts");
  const canViewSchedules = canViewContracts;
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const documentsAvailable = useOrganizationFeaturesStore((state) => state.features.moduleAvailability.documents);
  const documentsEnabled = features.documents && documentsAvailable;

  // Estado para PTO
  const [ptoBalance, setPtoBalance] = useState<any>(null);
  const [ptoRequests, setPtoRequests] = useState<any[]>([]);
  const [isPtoLoading, setIsPtoLoading] = useState(false);
  const [canManagePto, setCanManagePto] = useState(false);

  // Estado para asignación de horario V2
  const [scheduleAssignment, setScheduleAssignment] = useState<any>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  // Estado para liquidaciones
  const [settlements, setSettlements] = useState<SettlementListItem[]>([]);
  const [isSettlementsLoading, setIsSettlementsLoading] = useState(false);

  // Estado para reenvío de invitación
  const [isResendingInvite, setIsResendingInvite] = useState(false);
  const [inviteResendResult, setInviteResendResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const [activeMainTab, setActiveMainTab] = useState<MainTabValue>("information");
  const [activeDocTab, setActiveDocTab] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const availableMainTabs = useMemo(() => {
    if (documentsEnabled) return MAIN_TABS;
    return MAIN_TABS.filter((tab) => !tab.requiresDocuments);
  }, [documentsEnabled]);

  // Leer tab desde URL query param
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && availableMainTabs.some((tab) => tab.value === tabParam)) {
      setActiveMainTab(tabParam as MainTabValue);
    }
  }, [searchParams, availableMainTabs]);

  useEffect(() => {
    if (!availableMainTabs.some((tab) => tab.value === activeMainTab) && availableMainTabs.length) {
      setActiveMainTab(availableMainTabs[0].value);
    }
  }, [activeMainTab, availableMainTabs]);

  const currentMainTabLabel =
    availableMainTabs.find((tab) => tab.value === activeMainTab)?.label ??
    availableMainTabs[0]?.label ??
    "Selecciona una sección";

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

  const loadScheduleAssignment = async () => {
    if (!params.id) return;
    setIsScheduleLoading(true);
    try {
      const assignment = await getEmployeeCurrentAssignment(params.id as string);
      setScheduleAssignment(assignment);
    } catch (error) {
      console.error("Error al cargar asignación de horario:", error);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const loadSettlements = async () => {
    if (!params.id) return;
    setIsSettlementsLoading(true);
    try {
      const data = await getEmployeeSettlements(params.id as string);
      setSettlements(data);
    } catch (error) {
      console.error("Error al cargar liquidaciones:", error);
    } finally {
      setIsSettlementsLoading(false);
    }
  };

  const handleResendInvite = async () => {
    if (!employee?.user?.id) return;

    setIsResendingInvite(true);
    setInviteResendResult(null);

    try {
      const result = await resendInviteEmail(employee.user.id);
      if (result.success) {
        const inviteQueued = result.data?.queued ?? false;
        setInviteResendResult({
          success: true,
          message: inviteQueued
            ? "Invitación en cola. El correo se enviará en unos minutos."
            : "Email de invitación enviado correctamente",
        });
      } else {
        setInviteResendResult({
          success: false,
          message: result.error ?? "Error al enviar el email",
        });
      }
    } catch {
      setInviteResendResult({
        success: false,
        message: "Error al enviar el email de invitación",
      });
    } finally {
      setIsResendingInvite(false);
    }
  };

  const handleMainTabChange = (value: string) => {
    const matchedTab = availableMainTabs.find((tab) => tab.value === value);
    const fallbackValue: MainTabValue = availableMainTabs[0]?.value ?? "information";
    const nextValue = matchedTab?.value ?? fallbackValue;

    if (nextValue === activeMainTab) {
      return;
    }

    setActiveMainTab(nextValue);

    if (nextValue === "pto" && ptoRequests.length === 0) {
      loadPtoData();
    }
    if (nextValue === "documents" && documents.length === 0) {
      loadDocuments();
    }
    if (nextValue === "contract" && !scheduleAssignment) {
      loadScheduleAssignment();
    }
    if (nextValue === "settlements" && settlements.length === 0) {
      loadSettlements();
    }
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
      <PermissionGuard permissions={["view_employees", "manage_employees"]} fallback={permissionFallback}>
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
      </PermissionGuard>
    );
  }

  if (error || !employee) {
    return (
      <PermissionGuard permissions={["view_employees", "manage_employees"]} fallback={permissionFallback}>
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
      </PermissionGuard>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;
  const photoUrl = employee.photoUrl ?? null;

  // Calcular iniciales para el fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const profileAvatar = (
    <Avatar className="h-12 w-12">
      {photoUrl ? <AvatarImage src={photoUrl} alt={fullName} /> : null}
      <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(fullName)}</AvatarFallback>
    </Avatar>
  );
  const activeContract = employee.employmentContracts.find((c) => c.active);
  const additionalFields = Array.isArray(employee.additionalFields) ? employee.additionalFields : [];
  const genderLabel = GENDER_LABELS[employee.gender ?? "NOT_SPECIFIED"] ?? "No especificado";
  const onboardingChecks = [
    {
      key: "phone",
      label: "Teléfono",
      completed: Boolean(employee.phone ?? employee.mobilePhone),
    },
    {
      key: "email",
      label: "Email",
      completed: Boolean(employee.email),
    },
    {
      key: "contract",
      label: "Contrato activo",
      completed: Boolean(activeContract),
    },
    {
      key: "schedule",
      label: "Horario asignado",
      completed: Boolean(scheduleAssignment),
      isLoading: isScheduleLoading,
    },
    {
      key: "user",
      label: "Usuario de sistema",
      completed: Boolean(employee.user?.id),
    },
  ];
  const completedOnboardingChecks = onboardingChecks.filter((check) => check.completed).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatAdditionalFieldValue = (field: EmployeeAdditionalField) => {
    const value = field.value;
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (field.type === "BOOLEAN") {
      return value === true ? "Sí" : "No";
    }

    if (field.type === "DATE" && typeof value === "string") {
      return formatDate(value);
    }

    return String(value);
  };

  const inviteStatus = employee.inviteStatus ?? "PENDING";
  const inviteStatusLabel = inviteStatus === "SENT" ? "Enviada" : inviteStatus === "FAILED" ? "Fallida" : "Pendiente";
  const inviteStatusVariant =
    inviteStatus === "SENT" ? "success" : inviteStatus === "FAILED" ? "destructive" : "warning";
  const inviteLastAttemptAt = employee.inviteLastAttemptAt ? formatDateTime(employee.inviteLastAttemptAt) : "—";
  const inviteHistory = employee.inviteHistory ?? [];

  return (
    <PermissionGuard permissions={["view_employees", "manage_employees"]} fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/employees")}>
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

          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:justify-end">
            {canViewContracts && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/employees/${employee.id}/contracts`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Contratos
              </Button>
            )}
            {canViewSchedules && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/employees/${employee.id}/schedules`)}
              >
                <Clock className="mr-2 h-4 w-4" />
                Horarios
              </Button>
            )}
            {canManageEmployees && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/employees/${employee.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Selector móvil */}
        <div className="mb-6 md:hidden">
          <Select value={activeMainTab} onValueChange={handleMainTabChange}>
            <SelectTrigger aria-label="Selector de pestañas" className="w-full">
              <span className="flex-1 text-left">{currentMainTabLabel}</span>
            </SelectTrigger>
            <SelectContent position="popper" className="min-w-[var(--radix-select-trigger-width)]">
              {availableMainTabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeMainTab} onValueChange={handleMainTabChange} className="w-full">
          {/* Tabs desktop */}
          <TabsList className={`mb-6 hidden w-full md:grid ${documentsEnabled ? "grid-cols-8" : "grid-cols-7"}`}>
            {availableMainTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
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

                    <div className="flex items-center text-sm">
                      <User className="text-muted-foreground mr-2 h-4 w-4" />
                      <span className="text-muted-foreground w-20">Género:</span>
                      <span>{genderLabel}</span>
                    </div>
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

              {/* Datos Bancarios */}
              <Card className="rounded-lg border shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">
                    <CreditCard className="mr-2 inline h-5 w-5" />
                    Datos Bancarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-16">IBAN:</span>
                    <EmployeeIbanDisplay
                      iban={employee.iban}
                      employeeId={employee.id}
                      requirePassword={process.env.NEXT_PUBLIC_REQUIRE_PASSWORD_FOR_IBAN === "true"}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg border shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Campos adicionales</CardTitle>
                  <CardDescription>Datos personalizados de la empresa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {additionalFields.length ? (
                    <div className="space-y-2">
                      {additionalFields.map((field, index) => (
                        <div key={`${field.id ?? field.label}-${index}`} className="flex items-center justify-between">
                          <span className="text-muted-foreground text-sm">{field.label}</span>
                          <span className="text-sm font-medium">{formatAdditionalFieldValue(field)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sin campos adicionales registrados.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Checklist de onboarding</CardTitle>
                  <CardDescription>
                    {completedOnboardingChecks} de {onboardingChecks.length} completados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {onboardingChecks.map((check) => {
                    const statusLabel = check.isLoading ? "Cargando" : check.completed ? "Completado" : "Pendiente";
                    const statusVariant = check.completed ? "success" : check.isLoading ? "secondary" : "warning";

                    return (
                      <div key={check.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {check.isLoading ? (
                            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                          ) : check.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          <span>{check.label}</span>
                        </div>
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contrato Actual */}
          <TabsContent value="contract" className="space-y-6">
            {activeContract ? (
              <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      <Building2 className="mr-2 inline h-5 w-5" />
                      Situación Laboral
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/employees/${employee.id}/schedules`)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Gestionar Horario
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Grid de 3 columnas en desktop */}
                  <div className="grid gap-6 @2xl/main:grid-cols-3">
                    {/* Columna 1: Contrato */}
                    <div className="space-y-4">
                      <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Contrato</h4>
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

                    {/* Columna 2: Organización */}
                    <div className="space-y-4">
                      <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        Organización
                      </h4>
                      <div className="space-y-3">
                        {activeContract.position ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Puesto:</span>
                            <span className="text-sm font-medium">{activeContract.position.title}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Puesto:</span>
                            <span className="text-muted-foreground text-sm">—</span>
                          </div>
                        )}
                        {activeContract.department ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Departamento:</span>
                            <span className="text-sm">{activeContract.department.name}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Departamento:</span>
                            <span className="text-muted-foreground text-sm">—</span>
                          </div>
                        )}
                        {activeContract.costCenter ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Centro:</span>
                            <span className="text-sm">{activeContract.costCenter.name}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Centro:</span>
                            <span className="text-muted-foreground text-sm">—</span>
                          </div>
                        )}
                        {employee.team && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Equipo:</span>
                            <span className="text-sm font-medium">{employee.team.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 3: Jornada y Horario */}
                    <div className="space-y-4">
                      <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Jornada</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Horas/semana:</span>
                          <span className="text-sm font-medium">{activeContract.weeklyHours}h</span>
                        </div>
                        {isScheduleLoading ? (
                          <div className="flex items-center justify-end">
                            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground ml-2 text-xs">Cargando...</span>
                          </div>
                        ) : scheduleAssignment ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Tipo horario:</span>
                              <Badge variant="outline" className="text-xs">
                                {scheduleAssignment.assignmentType === "FIXED"
                                  ? "Fijo"
                                  : scheduleAssignment.assignmentType === "SHIFT"
                                    ? "Turnos"
                                    : scheduleAssignment.assignmentType}
                              </Badge>
                            </div>
                            {scheduleAssignment.scheduleTemplate && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground text-sm">Plantilla:</span>
                                <span className="text-sm">{scheduleAssignment.scheduleTemplate.name}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Desde:</span>
                              <span className="text-sm">{formatDate(scheduleAssignment.validFrom)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Horario:</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-primary h-auto p-0 text-sm"
                              onClick={() => router.push(`/dashboard/employees/${employee.id}/schedules/edit`)}
                            >
                              Asignar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Aviso de turnos (solo si es SHIFT) */}
                  {scheduleAssignment?.assignmentType === "SHIFT" && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:bg-purple-950/30">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Los turnos se gestionan desde{" "}
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-purple-700 underline dark:text-purple-300"
                          onClick={() => router.push("/dashboard/shifts")}
                        >
                          Gestión de Turnos
                        </Button>
                      </p>
                    </div>
                  )}
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        <Shield className="mr-2 inline h-5 w-5" />
                        Usuario del Sistema
                      </CardTitle>
                      {employee.user.mustChangePassword && (
                        <Button variant="outline" size="sm" onClick={handleResendInvite} disabled={isResendingInvite}>
                          {isResendingInvite ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Reenviar invitación
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Resultado del reenvío */}
                    {inviteResendResult && (
                      <div
                        className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                          inviteResendResult.success
                            ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        }`}
                      >
                        {inviteResendResult.success ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        {inviteResendResult.message}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Mail className="text-muted-foreground h-4 w-4" />
                        <span className="text-muted-foreground text-sm">Invitación:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={inviteStatusVariant}>{inviteStatusLabel}</Badge>
                        <span className="text-muted-foreground text-xs">Último intento: {inviteLastAttemptAt}</span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Historial
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Historial de invitaciones</DialogTitle>
                            </DialogHeader>
                            {inviteHistory.length ? (
                              <div className="max-h-[320px] space-y-2 overflow-auto">
                                {inviteHistory.map((log) => (
                                  <div
                                    key={log.id}
                                    className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant={log.status === "SUCCESS" ? "success" : "destructive"}>
                                        {log.status === "SUCCESS" ? "Enviada" : "Fallida"}
                                      </Badge>
                                      <span className="text-muted-foreground text-xs">
                                        {formatDateTime(log.createdAt)}
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground text-xs">
                                      {log.errorMessage ?? log.subject ?? "Sin detalles"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <EmptyState
                                icon={<Mail className="text-muted-foreground mx-auto h-10 w-10" />}
                                title="Sin historial"
                                description="Aún no se ha enviado ninguna invitación."
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Email:</span>
                      <span className="font-mono text-sm">{employee.user.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Rol:</span>
                      <Badge variant="outline">{ROLE_LABELS[employee.user.role] ?? employee.user.role}</Badge>
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

          {/* Gastos */}
          <TabsContent value="expenses" className="space-y-6">
            <EmployeeExpenseApprover employeeId={employee.id} employeeName={fullName} />
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

              {/* Sección de documentos firmados */}
              <div className="mt-6">
                <EmployeeSignedDocuments employeeId={employee.id} />
              </div>

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

          {/* Liquidaciones */}
          <TabsContent value="settlements" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Liquidaciones de Vacaciones</h3>
              {canManagePto && (
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/settlements")}>
                  Ver todas
                </Button>
              )}
            </div>

            {isSettlementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                <span className="text-muted-foreground ml-2">Cargando liquidaciones...</span>
              </div>
            ) : settlements.length > 0 ? (
              <div className="space-y-4">
                {settlements.map((settlement) => (
                  <Card key={settlement.id} className="rounded-lg border shadow-xs">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {new Date(settlement.settlementDate).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                            <Badge
                              variant={
                                settlement.status === "PAID"
                                  ? "default"
                                  : settlement.status === "COMPENSATED"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {settlement.status === "PAID"
                                ? "Pagada"
                                : settlement.status === "COMPENSATED"
                                  ? "Compensada"
                                  : "Pendiente"}
                            </Badge>
                            {settlement.isAutoGenerated && (
                              <Badge variant="outline" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground flex gap-4 text-sm">
                            <span>Devengados: {settlement.accruedDays.toFixed(2)} días</span>
                            <span>Disfrutados: {settlement.usedDays.toFixed(2)} días</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-mono text-lg font-bold ${
                              settlement.balanceDays >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {settlement.balanceDays >= 0 ? "+" : ""}
                            {settlement.balanceDays.toFixed(2)} días
                          </div>
                          <div className="text-muted-foreground text-xs">Saldo</div>
                        </div>
                      </div>
                      {settlement.notes && (
                        <p className="text-muted-foreground mt-2 border-t pt-2 text-sm">{settlement.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="mx-auto h-12 w-12" />}
                title="Sin liquidaciones"
                description="Este empleado no tiene liquidaciones de vacaciones registradas"
              />
            )}
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
    </PermissionGuard>
  );
}
