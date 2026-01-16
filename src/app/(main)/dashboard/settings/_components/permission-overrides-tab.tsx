"use client";

import { useEffect, useState, useTransition } from "react";

import { Role } from "@prisma/client";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Minus,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getOrgRoleOverrides,
  type OverrideData,
  resetOrgRoleOverride,
  upsertOrgRoleOverride,
} from "@/server/actions/permission-overrides";
import {
  ALL_PERMISSIONS,
  isValidPermission,
  type Permission,
  SENSITIVE_PERMISSIONS,
} from "@/services/permissions/permissions";

// ============================================
// CONSTANTES
// ============================================

const ROLE_INFO: Record<Role, { label: string; description: string }> = {
  SUPER_ADMIN: { label: "Super Admin", description: "No editable" },
  ORG_ADMIN: { label: "Admin Org", description: "Gestión completa de la organización" },
  HR_ADMIN: { label: "Admin RRHH", description: "Gestión de recursos humanos" },
  HR_ASSISTANT: { label: "Asistente RRHH", description: "Operativo sin datos sensibles" },
  MANAGER: { label: "Manager", description: "Supervisor de equipo" },
  EMPLOYEE: { label: "Empleado", description: "Acceso básico" },
};

// Información completa de cada permiso: label, descripción y nombre técnico
const PERMISSION_INFO: Record<string, { label: string; description: string }> = {
  view_employees: {
    label: "Ver empleados",
    description: "Acceder al listado de empleados y sus datos básicos",
  },
  manage_employees: {
    label: "Gestionar empleados",
    description: "Crear, editar y archivar fichas de empleados",
  },
  view_departments: {
    label: "Ver departamentos",
    description: "Ver la estructura de departamentos de la organización",
  },
  manage_departments: {
    label: "Gestionar departamentos",
    description: "Crear, editar y eliminar departamentos",
  },
  view_cost_centers: {
    label: "Ver centros de coste",
    description: "Ver los centros de coste configurados",
  },
  manage_cost_centers: {
    label: "Gestionar centros de coste",
    description: "Crear, editar y eliminar centros de coste",
  },
  view_teams: {
    label: "Ver equipos",
    description: "Ver la estructura de equipos de trabajo",
  },
  manage_teams: {
    label: "Gestionar equipos",
    description: "Crear, editar y eliminar equipos de trabajo",
  },
  view_projects: {
    label: "Ver proyectos",
    description: "Ver los proyectos configurados para fichajes",
  },
  manage_projects: {
    label: "Gestionar proyectos",
    description: "Crear, editar y eliminar proyectos",
  },
  view_positions: {
    label: "Ver puestos",
    description: "Ver los puestos de trabajo definidos",
  },
  manage_positions: {
    label: "Gestionar puestos",
    description: "Crear, editar y eliminar puestos de trabajo",
  },
  view_contracts: {
    label: "Ver contratos",
    description: "Acceder a información contractual de empleados",
  },
  manage_contracts: {
    label: "Gestionar contratos",
    description: "Crear y modificar contratos de empleados",
  },
  view_documents: {
    label: "Ver documentos",
    description: "Acceder al gestor documental y firmas",
  },
  manage_documents: {
    label: "Gestionar documentos",
    description: "Subir documentos y crear solicitudes de firma",
  },
  view_reports: {
    label: "Ver reportes",
    description: "Acceder a reportes y estadísticas de la organización",
  },
  manage_organization: {
    label: "Gestionar organización",
    description: "Configurar ajustes generales de la organización",
  },
  view_own_profile: {
    label: "Ver perfil propio",
    description: "Ver mi propia ficha de empleado",
  },
  edit_own_profile: {
    label: "Editar perfil propio",
    description: "Modificar mis datos personales",
  },
  view_own_documents: {
    label: "Ver mis documentos",
    description: "Acceder a documentos y firmas asignados a mí",
  },
  view_payroll: {
    label: "Ver nóminas (todos)",
    description: "Ver información de nóminas de todos los empleados",
  },
  view_own_payslips: {
    label: "Ver mis nóminas",
    description: "Descargar mis propias nóminas",
  },
  manage_payroll: {
    label: "Gestionar nóminas",
    description: "Configurar períodos de nómina y exportar datos",
  },
  clock_in_out: {
    label: "Fichar entrada/salida",
    description: "Registrar mis propios fichajes de entrada y salida",
  },
  view_time_tracking: {
    label: "Ver horarios y fichajes",
    description: "Ver plantillas de horario, turnos y fichajes de empleados",
  },
  manage_time_tracking: {
    label: "Gestionar horarios y turnos",
    description: "Crear plantillas, asignar horarios, publicar turnos manuales",
  },
  export_time_tracking: {
    label: "Exportar fichajes",
    description: "Descargar reportes de fichajes en Excel/CSV",
  },
  has_employee_profile: {
    label: "Tiene perfil empleado",
    description: "Usuario vinculado a una ficha de empleado",
  },
  approve_requests: {
    label: "Aprobar solicitudes",
    description: "Aprobar vacaciones, ausencias y otras solicitudes",
  },
  view_expense_approvals_all: {
    label: "Ver todos los gastos en aprobación",
    description: "Acceder a todas las solicitudes de gasto y ver quién las tiene asignadas",
  },
  reassign_expense_approvals: {
    label: "Reasignar aprobadores de gastos",
    description: "Reasignar el aprobador actual de un gasto en revisión",
  },
  manage_pto_admin: {
    label: "Gestión avanzada de vacaciones",
    description: "Ajustar balances y gestionar solicitudes de vacaciones a nivel administrativo",
  },
  manage_users: {
    label: "Gestionar usuarios",
    description: "Administrar cuentas de usuario del sistema",
  },
  view_all_users: {
    label: "Ver usuarios",
    description: "Ver el listado de usuarios del sistema",
  },
  create_users: {
    label: "Crear usuarios",
    description: "Crear nuevas cuentas de usuario",
  },
  change_roles: {
    label: "Cambiar roles",
    description: "Modificar el rol asignado a un usuario",
  },
  manage_user_organizations: {
    label: "Gestionar organizaciones de usuario",
    description: "Administrar membresías multiempresa de usuarios",
  },
  manage_trash: {
    label: "Purgar papelera",
    description: "Eliminar permanentemente elementos de la papelera",
  },
  restore_trash: {
    label: "Restaurar papelera",
    description: "Recuperar elementos eliminados de la papelera",
  },
  view_sensitive_data: {
    label: "Ver datos sensibles",
    description: "Acceder a salarios, IBAN y otros datos confidenciales",
  },
  manage_payslips: {
    label: "Gestionar lotes de nóminas",
    description: "Subir PDFs de nóminas y asignarlos a empleados",
  },
  validate_time_entries: {
    label: "Validar fichajes",
    description: "Aprobar o rechazar fichajes de empleados",
  },
  manage_permission_overrides: {
    label: "Gestionar permisos",
    description: "Modificar los overrides de permisos por rol",
  },
};

// Helper para obtener el label (compatibilidad)
const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PERMISSION_INFO).map(([key, value]) => [key, value.label]),
);

const PERMISSION_CATEGORIES: Record<string, Permission[]> = {
  Empleados: ["view_employees", "manage_employees"],
  Estructura: [
    "view_departments",
    "manage_departments",
    "view_cost_centers",
    "manage_cost_centers",
    "view_teams",
    "manage_teams",
    "view_projects",
    "manage_projects",
    "view_positions",
    "manage_positions",
  ],
  Contratos: ["view_contracts", "manage_contracts"],
  Documentos: ["view_documents", "manage_documents", "view_own_documents", "manage_trash", "restore_trash"],
  Nóminas: ["view_payroll", "view_own_payslips", "manage_payroll", "manage_payslips"],
  "Horarios y Fichajes": [
    "clock_in_out",
    "view_time_tracking",
    "manage_time_tracking",
    "export_time_tracking",
    "validate_time_entries",
  ],
  Aprobaciones: ["approve_requests", "view_expense_approvals_all", "reassign_expense_approvals"],
  Vacaciones: ["manage_pto_admin"],
  Usuarios: ["manage_users", "view_all_users", "create_users", "change_roles", "manage_user_organizations"],
  Sistema: ["manage_organization", "view_reports", "manage_permission_overrides"],
  "Perfil Personal": ["view_own_profile", "edit_own_profile", "has_employee_profile"],
  "Datos Sensibles": ["view_sensitive_data"],
};

const EDITABLE_ROLES: Role[] = ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"];

type PermissionOverrideExport = {
  schema: "permission-overrides";
  version: number;
  role: Role;
  grantPermissions: Permission[];
  revokePermissions: Permission[];
  exportedAt: string;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function PermissionOverridesTab() {
  const [overrides, setOverrides] = useState<OverrideData[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role>("HR_ASSISTANT");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPayload, setImportPayload] = useState("");

  // Estado local de edición (grants/revokes pendientes de guardar)
  const [localGrants, setLocalGrants] = useState<Set<Permission>>(new Set());
  const [localRevokes, setLocalRevokes] = useState<Set<Permission>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadOverrides();
  }, []);

  // Sincronizar estado local cuando cambia el rol seleccionado
  useEffect(() => {
    const roleData = overrides.find((o) => o.role === selectedRole);
    if (roleData) {
      setLocalGrants(new Set(roleData.grantPermissions as Permission[]));
      setLocalRevokes(new Set(roleData.revokePermissions as Permission[]));
      setHasChanges(false);
    }
  }, [selectedRole, overrides]);

  async function loadOverrides() {
    setIsLoading(true);
    const result = await getOrgRoleOverrides();
    if (!result.success) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }
    if (result.data) {
      setOverrides(result.data);
    }
    setIsLoading(false);
  }

  // Datos del rol seleccionado
  const currentOverride = overrides.find((o) => o.role === selectedRole);
  const basePermissions = new Set(currentOverride?.basePermissions ?? []);

  // Calcular permisos efectivos locales
  const effectivePermissions = new Set(basePermissions);
  localGrants.forEach((p) => effectivePermissions.add(p));
  localRevokes.forEach((p) => effectivePermissions.delete(p));

  // Filtrar permisos por búsqueda
  const filteredPermissions = ALL_PERMISSIONS.filter((p) => {
    const label = PERMISSION_LABELS[p] ?? p;
    return (
      label.toLowerCase().includes(searchQuery.toLowerCase()) || p.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const exportPayload: PermissionOverrideExport = {
    schema: "permission-overrides",
    version: 1,
    role: selectedRole,
    grantPermissions: Array.from(localGrants).sort(),
    revokePermissions: Array.from(localRevokes).sort(),
    exportedAt: new Date().toISOString(),
  };

  const exportJson = JSON.stringify(exportPayload, null, 2);

  // Handlers
  function toggleGrant(permission: Permission) {
    const newGrants = new Set(localGrants);
    const newRevokes = new Set(localRevokes);

    if (newGrants.has(permission)) {
      newGrants.delete(permission);
    } else {
      newGrants.add(permission);
      newRevokes.delete(permission); // No puede estar en ambos
    }

    setLocalGrants(newGrants);
    setLocalRevokes(newRevokes);
    setHasChanges(true);
  }

  function toggleRevoke(permission: Permission) {
    const newGrants = new Set(localGrants);
    const newRevokes = new Set(localRevokes);

    if (newRevokes.has(permission)) {
      newRevokes.delete(permission);
    } else {
      newRevokes.add(permission);
      newGrants.delete(permission); // No puede estar en ambos
    }

    setLocalGrants(newGrants);
    setLocalRevokes(newRevokes);
    setHasChanges(true);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertOrgRoleOverride(selectedRole, Array.from(localGrants), Array.from(localRevokes));

      if (result.success) {
        toast.success("Cambios guardados correctamente");
        await loadOverrides();
        setHasChanges(false);
      } else {
        toast.error(result.error ?? "Error al guardar");
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      const result = await resetOrgRoleOverride(selectedRole);

      if (result.success) {
        toast.success("Permisos restablecidos a valores base");
        await loadOverrides();
        setHasChanges(false);
      } else {
        toast.error(result.error ?? "Error al restablecer");
      }
    });
  }

  function handleDiscard() {
    const roleData = overrides.find((o) => o.role === selectedRole);
    if (roleData) {
      setLocalGrants(new Set(roleData.grantPermissions as Permission[]));
      setLocalRevokes(new Set(roleData.revokePermissions as Permission[]));
      setHasChanges(false);
    }
  }

  async function handleCopyExport() {
    try {
      await navigator.clipboard.writeText(exportJson);
      toast.success("Código copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el código");
    }
  }

  function handleDownloadExport() {
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `permisos-${selectedRole.toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const trimmedPayload = importPayload.trim();
    if (trimmedPayload.length === 0) {
      toast.error("Pega el código de exportación para continuar.");
      return;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(trimmedPayload);
    } catch {
      toast.error("El código no es un JSON válido.");
      return;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      toast.error("El formato del código no es válido.");
      return;
    }

    const payload = parsedPayload as Record<string, unknown>;
    const payloadRole = typeof payload.role === "string" ? payload.role : null;
    if (payloadRole && payloadRole !== selectedRole) {
      const roleLabel = ROLE_INFO[payloadRole as Role]?.label || payloadRole;
      toast.error(`El código corresponde al rol ${roleLabel}. Selecciona ese rol antes de importar.`);
      return;
    }

    const rawGrants = payload.grantPermissions;
    const rawRevokes = payload.revokePermissions;
    const hasGrants = Array.isArray(rawGrants);
    const hasRevokes = Array.isArray(rawRevokes);

    if (!hasGrants && !hasRevokes) {
      toast.error("El código no incluye permisos para importar.");
      return;
    }

    const grantPermissions = hasGrants
      ? rawGrants.filter(
          (permission): permission is Permission => typeof permission === "string" && isValidPermission(permission),
        )
      : [];
    const revokePermissions = hasRevokes
      ? rawRevokes.filter(
          (permission): permission is Permission => typeof permission === "string" && isValidPermission(permission),
        )
      : [];

    const overlap = grantPermissions.filter((permission) => revokePermissions.includes(permission));
    if (overlap.length > 0) {
      toast.error(`El código contiene permisos en conflicto: ${overlap.join(", ")}`);
      return;
    }

    setLocalGrants(new Set(grantPermissions));
    setLocalRevokes(new Set(revokePermissions));
    setHasChanges(true);
    setImportPayload("");
    setImportDialogOpen(false);
    toast.success("Permisos importados. Revisa y guarda los cambios.");
  }

  // Helpers de renderizado
  function getPermissionStatus(permission: Permission): "base" | "granted" | "revoked" | "none" {
    if (localRevokes.has(permission)) return "revoked";
    if (localGrants.has(permission)) return "granted";
    if (basePermissions.has(permission)) return "base";
    return "none";
  }

  const hasSensitiveGrants = Array.from(localGrants).some((p) => SENSITIVE_PERMISSIONS.includes(p));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Overrides de permisos por rol</h3>
                <p className="text-muted-foreground text-sm">
                  Personaliza los permisos de cada rol solo para esta organización
                </p>
              </div>
            </div>

            {/* Selector de rol */}
            <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
              <TabsList className="flex-wrap">
                {EDITABLE_ROLES.map((role) => {
                  const roleOverride = overrides.find((o) => o.role === role);
                  const hasOverride = roleOverride?.hasOverride;
                  return (
                    <TabsTrigger key={role} value={role} className="relative">
                      {ROLE_INFO[role].label}
                      {hasOverride && <span className="bg-primary ml-1.5 h-1.5 w-1.5 rounded-full" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {EDITABLE_ROLES.map((role) => (
                <TabsContent key={role} value={role} className="mt-4">
                  <p className="text-muted-foreground text-sm">{ROLE_INFO[role].description}</p>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </Card>

        {/* Warning de permisos sensibles */}
        {hasSensitiveGrants && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atención: permisos sensibles</AlertTitle>
            <AlertDescription>
              Estás otorgando permisos sensibles a este rol. Asegúrate de que es intencional.
            </AlertDescription>
          </Alert>
        )}

        {/* Panel de edición */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Columna izquierda: Permisos disponibles */}
          <Card className="rounded-lg border p-4">
            <div className="mb-4 flex flex-col gap-3">
              <h4 className="font-medium">Permisos disponibles</h4>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Buscar permisos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => {
                  const categoryPermissions = permissions.filter((p) => filteredPermissions.includes(p));
                  if (categoryPermissions.length === 0) return null;

                  return (
                    <Collapsible key={category} defaultOpen>
                      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-sm font-medium">
                        <ChevronDown className="h-4 w-4" />
                        {category}
                        <Badge variant="outline" className="ml-auto">
                          {categoryPermissions.length}
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-1">
                        {categoryPermissions.map((permission) => {
                          const status = getPermissionStatus(permission);
                          const isSensitive = SENSITIVE_PERMISSIONS.includes(permission);
                          const permInfo = PERMISSION_INFO[permission];

                          return (
                            <div
                              key={permission}
                              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                                status === "granted"
                                  ? "border-green-500/50 bg-green-500/10"
                                  : status === "revoked"
                                    ? "border-red-500/50 bg-red-500/10"
                                    : status === "base"
                                      ? "bg-muted/50"
                                      : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {status === "base" && <Check className="text-muted-foreground h-3.5 w-3.5" />}
                                {status === "granted" && <Plus className="h-3.5 w-3.5 text-green-500" />}
                                {status === "revoked" && <Minus className="h-3.5 w-3.5 text-red-500" />}
                                {status === "none" && <X className="text-muted-foreground/30 h-3.5 w-3.5" />}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={`cursor-help border-b border-dotted border-current ${status === "revoked" ? "line-through opacity-60" : ""}`}
                                    >
                                      {permInfo?.label ?? permission}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="space-y-1">
                                      <p className="text-sm">{permInfo?.description ?? "Sin descripción"}</p>
                                      <p className="text-muted-foreground font-mono text-xs">{permission}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                {isSensitive && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant={status === "granted" ? "default" : "ghost"}
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => toggleGrant(permission)}
                                  disabled={status === "base" && !localRevokes.has(permission)}
                                  title={status === "granted" ? "Quitar grant" : "Añadir permiso"}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant={status === "revoked" ? "destructive" : "ghost"}
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => toggleRevoke(permission)}
                                  disabled={status === "none" && !localGrants.has(permission)}
                                  title={status === "revoked" ? "Quitar revoke" : "Revocar permiso"}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          {/* Columna derecha: Resumen */}
          <div className="flex flex-col gap-4">
            <Card className="rounded-lg border p-4">
              <div className="flex flex-col gap-3">
                <div>
                  <h4 className="font-medium">Exportar e importar</h4>
                  <p className="text-muted-foreground text-sm">
                    Copia los overrides de este rol para aplicarlos en otra organización.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Exportar permisos de {ROLE_INFO[selectedRole].label}</DialogTitle>
                        <DialogDescription>
                          Guarda este JSON o pégalo en otra organización para aplicar los mismos overrides.
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea value={exportJson} readOnly className="min-h-[220px] font-mono text-xs" />
                      <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                        <Button variant="outline" onClick={handleCopyExport}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar código
                        </Button>
                        <Button onClick={handleDownloadExport}>
                          <Download className="mr-2 h-4 w-4" />
                          Descargar JSON
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={importDialogOpen}
                    onOpenChange={(open) => {
                      setImportDialogOpen(open);
                      if (!open) {
                        setImportPayload("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Importar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Importar permisos en {ROLE_INFO[selectedRole].label}</DialogTitle>
                        <DialogDescription>
                          Pega el JSON exportado para cargar los mismos overrides en este rol y luego guarda los
                          cambios.
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        placeholder='{"schema":"permission-overrides","version":1,"role":"HR_ADMIN","grantPermissions":[],"revokePermissions":[]}'
                        value={importPayload}
                        onChange={(event) => setImportPayload(event.target.value)}
                        className="min-h-[220px] font-mono text-xs"
                      />
                      <DialogFooter>
                        <Button onClick={handleImport}>Cargar overrides</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </Card>

            {/* Permisos añadidos */}
            <Card className="rounded-lg border p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium text-green-600">
                <Plus className="h-4 w-4" />
                Permisos añadidos ({localGrants.size})
              </h4>
              {localGrants.size === 0 ? (
                <p className="text-muted-foreground text-sm">Ningún permiso añadido</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Array.from(localGrants).map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="cursor-pointer border-green-500/50 bg-green-500/10"
                      onClick={() => toggleGrant(p)}
                    >
                      {PERMISSION_LABELS[p] ?? p}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Permisos revocados */}
            <Card className="rounded-lg border p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium text-red-600">
                <Minus className="h-4 w-4" />
                Permisos revocados ({localRevokes.size})
              </h4>
              {localRevokes.size === 0 ? (
                <p className="text-muted-foreground text-sm">Ningún permiso revocado</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Array.from(localRevokes).map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="cursor-pointer border-red-500/50 bg-red-500/10"
                      onClick={() => toggleRevoke(p)}
                    >
                      {PERMISSION_LABELS[p] ?? p}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Permisos efectivos */}
            <Card className="rounded-lg border p-4">
              <h4 className="mb-3 font-medium">Permisos efectivos ({effectivePermissions.size})</h4>
              <p className="text-muted-foreground mb-3 text-xs">
                Base ({basePermissions.size}) + Añadidos ({localGrants.size}) - Revocados ({localRevokes.size})
              </p>
              <ScrollArea className="h-[200px]">
                <div className="flex flex-wrap gap-1">
                  {Array.from(effectivePermissions)
                    .sort()
                    .map((p) => {
                      const isGranted = localGrants.has(p as Permission);
                      return (
                        <Badge
                          key={p}
                          variant="secondary"
                          className={isGranted ? "border-green-500/30 bg-green-500/10" : ""}
                        >
                          {PERMISSION_LABELS[p] ?? p}
                        </Badge>
                      );
                    })}
                </div>
              </ScrollArea>
            </Card>

            {/* Acciones */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!hasChanges || isPending} className="flex-1">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar cambios
              </Button>
              <Button variant="outline" onClick={handleDiscard} disabled={!hasChanges || isPending}>
                Descartar
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isPending || (!currentOverride?.hasOverride && !hasChanges)}
                title="Restablecer a permisos base"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
