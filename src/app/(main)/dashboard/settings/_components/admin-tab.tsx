"use client";

import { useEffect, useState, useTransition } from "react";

import { AuditLog, Role } from "@prisma/client";
import { AlertTriangle, ChevronLeft, ChevronRight, History, Loader2, Trash2, UserX, Users } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteEmployeePermanently,
  getAuditLogs,
  getEmployeeStats,
  getGlobalSecurityLogs,
  getInactiveEmployees,
} from "@/server/actions/admin-users";
import { getCurrentUserRole } from "@/server/actions/get-current-user-role";

import { SecurityDailySummarySettingsCard } from "./security-daily-summary-settings-card";

type InactiveEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  employeeNumber: string | null;
  nifNie: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    active: boolean;
  } | null;
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
};

type GlobalSecurityLog = AuditLog & {
  organization?: {
    id: string;
    name: string | null;
  } | null;
};

const actionLabels: Record<string, { label: string; color: string }> = {
  DELETE_EMPLOYEE_PERMANENT: { label: "Eliminación permanente", color: "destructive" },
  DEACTIVATE_EMPLOYEE: { label: "Baja de empleado", color: "secondary" },
  DEACTIVATE_USER: { label: "Baja de usuario", color: "secondary" },
  LOGIN_FAILED: { label: "Login fallido", color: "destructive" },
  ACCOUNT_LOCKED: { label: "Cuenta bloqueada", color: "destructive" },
  ACCOUNT_UNLOCKED: { label: "Cuenta desbloqueada", color: "secondary" },
  GLOBAL_SECURITY_DAILY_SUMMARY_UPDATED: { label: "Resumen diario actualizado", color: "secondary" },
};

const PAGE_SIZE = 10;

export function AdminTab() {
  const [employees, setEmployees] = useState<InactiveEmployee[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [globalSecurityLogs, setGlobalSecurityLogs] = useState<GlobalSecurityLog[]>([]);
  const [globalSecurityTotal, setGlobalSecurityTotal] = useState(0);
  const [globalSecurityPage, setGlobalSecurityPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingGlobalSecurity, setLoadingGlobalSecurity] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [employeeToDelete, setEmployeeToDelete] = useState<InactiveEmployee | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const loadAuditLogs = async (page: number) => {
    setLoadingLogs(true);
    try {
      const logsResult = await getAuditLogs(PAGE_SIZE, page * PAGE_SIZE);
      if (logsResult.success && logsResult.logs) {
        setAuditLogs(logsResult.logs);
        setAuditTotal(logsResult.total ?? 0);
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadGlobalSecurityLogs = async (page: number) => {
    setLoadingGlobalSecurity(true);
    try {
      const logsResult = await getGlobalSecurityLogs(PAGE_SIZE, page * PAGE_SIZE);
      if (logsResult.success && logsResult.logs) {
        setGlobalSecurityLogs(logsResult.logs);
        setGlobalSecurityTotal(logsResult.total ?? 0);
      }
    } catch (error) {
      console.error("Error loading global security logs:", error);
    } finally {
      setLoadingGlobalSecurity(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [employeesResult, statsResult, roleResult] = await Promise.all([
        getInactiveEmployees(),
        getEmployeeStats(),
        getCurrentUserRole(),
      ]);

      if (employeesResult.success && employeesResult.employees) {
        setEmployees(employeesResult.employees);
      }
      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }

      const userIsSuperAdmin = roleResult === "SUPER_ADMIN";
      setIsSuperAdmin(userIsSuperAdmin);

      // Solo cargar audit logs si es SUPER_ADMIN
      if (userIsSuperAdmin) {
        await loadAuditLogs(0);
        await loadGlobalSecurityLogs(0);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (employee: InactiveEmployee) => {
    setEmployeeToDelete(employee);
  };

  const confirmDelete = () => {
    if (!employeeToDelete) return;

    startTransition(async () => {
      const result = await deleteEmployeePermanently(employeeToDelete.id);
      if (result.success) {
        toast.success(result.message);
        setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
        if (stats) {
          setStats({
            ...stats,
            total: stats.total - 1,
            inactive: stats.inactive - 1,
          });
        }
        // Recargar audit logs si es SUPER_ADMIN
        if (isSuperAdmin) {
          await loadAuditLogs(auditPage);
        }
      } else {
        toast.error(result.error);
      }
      setEmployeeToDelete(null);
    });
  };

  const handlePrevPage = () => {
    if (auditPage > 0) {
      const newPage = auditPage - 1;
      setAuditPage(newPage);
      loadAuditLogs(newPage);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(auditTotal / PAGE_SIZE);
    if (auditPage < totalPages - 1) {
      const newPage = auditPage + 1;
      setAuditPage(newPage);
      loadAuditLogs(newPage);
    }
  };

  const totalPages = Math.ceil(auditTotal / PAGE_SIZE);

  const handlePrevGlobalPage = () => {
    if (globalSecurityPage > 0) {
      const newPage = globalSecurityPage - 1;
      setGlobalSecurityPage(newPage);
      loadGlobalSecurityLogs(newPage);
    }
  };

  const handleNextGlobalPage = () => {
    const totalGlobalPages = Math.ceil(globalSecurityTotal / PAGE_SIZE);
    if (globalSecurityPage < totalGlobalPages - 1) {
      const newPage = globalSecurityPage + 1;
      setGlobalSecurityPage(newPage);
      loadGlobalSecurityLogs(newPage);
    }
  };

  const totalGlobalPages = Math.ceil(globalSecurityTotal / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2">
              <Users className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total empleados</p>
              <p className="text-2xl font-bold">{stats?.total ?? "-"}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/20">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Activos</p>
              <p className="text-2xl font-bold">{stats?.active ?? "-"}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/20">
              <UserX className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Dados de baja</p>
              <p className="text-2xl font-bold">{stats?.inactive ?? "-"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Empleados dados de baja */}
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Eliminación permanente de empleados</h3>
                <p className="text-muted-foreground text-sm">
                  Empleados dados de baja que pueden ser eliminados permanentemente
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
            </Button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800/50 dark:bg-orange-900/20">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 dark:text-orange-200">Acción irreversible</p>
              <p className="text-orange-700 dark:text-orange-300">
                La eliminación permanente borra TODOS los datos del empleado: fichajes, ausencias, gastos, documentos,
                contratos, etc. Si tiene usuario del sistema asociado, también se eliminará. Esta acción NO se puede
                deshacer.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
              <UserX className="mb-2 h-12 w-12 opacity-50" />
              <p className="text-center">No hay empleados dados de baja</p>
              <p className="text-center text-sm">Los empleados dados de baja aparecerán aquí para su eliminación</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>NIF/NIE</TableHead>
                    <TableHead>Usuario sistema</TableHead>
                    <TableHead>Fecha baja</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {employee.employeeNumber ?? employee.email ?? "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{employee.nifNie}</span>
                      </TableCell>
                      <TableCell>
                        {employee.user ? (
                          <div>
                            <p className="text-sm">{employee.user.email}</p>
                            <Badge variant={employee.user.active ? "default" : "secondary"} className="mt-1">
                              {employee.user.active ? "Usuario activo" : "Usuario inactivo"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin usuario</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {new Date(employee.updatedAt).toLocaleDateString("es-ES")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(employee)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* Histórico de acciones - Solo SUPER_ADMIN */}
      {isSuperAdmin && (
        <>
          <Card className="rounded-lg border p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Histórico de acciones administrativas</h3>
                  <p className="text-muted-foreground text-sm">
                    Registro de todas las acciones críticas realizadas en el sistema
                  </p>
                </div>
              </div>

              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
                  <History className="mb-2 h-12 w-12 opacity-50" />
                  <p className="text-center">No hay acciones registradas</p>
                  <p className="text-center text-sm">Las acciones administrativas aparecerán aquí</p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Acción</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Realizado por</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => {
                          const actionInfo = actionLabels[log.action] ?? {
                            label: log.action,
                            color: "outline",
                          };
                          return (
                            <TableRow key={log.id}>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{new Date(log.createdAt).toLocaleDateString("es-ES")}</p>
                                  <p className="text-muted-foreground">
                                    {new Date(log.createdAt).toLocaleTimeString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={actionInfo.color as "destructive" | "secondary" | "outline"}>
                                  {actionInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <p className="max-w-md truncate text-sm">{log.description}</p>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">{log.performedByName}</p>
                                  <p className="text-muted-foreground">{log.performedByEmail}</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      Mostrando {auditPage * PAGE_SIZE + 1}-{Math.min((auditPage + 1) * PAGE_SIZE, auditTotal)} de{" "}
                      {auditTotal} registros
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={auditPage === 0}>
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        Página {auditPage + 1} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={auditPage >= totalPages - 1}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <SecurityDailySummarySettingsCard />

          <Card className="rounded-lg border p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Seguridad global</h3>
                  <p className="text-muted-foreground text-sm">
                    Intentos de login y bloqueos en todas las organizaciones
                  </p>
                </div>
              </div>

              {loadingGlobalSecurity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : globalSecurityLogs.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="mb-2 h-12 w-12 opacity-50" />
                  <p className="text-center">No hay eventos de seguridad</p>
                  <p className="text-center text-sm">Los eventos globales aparecerán aquí</p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Organización</TableHead>
                          <TableHead>Acción</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Realizado por</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {globalSecurityLogs.map((log) => {
                          const actionInfo = actionLabels[log.action] ?? {
                            label: log.action,
                            color: "outline",
                          };
                          let orgLabel = "Sin org";
                          if (log.organization && log.organization.name) {
                            orgLabel = log.organization.name;
                          } else if (log.orgId) {
                            orgLabel = log.orgId;
                          }
                          return (
                            <TableRow key={log.id}>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{new Date(log.createdAt).toLocaleDateString("es-ES")}</p>
                                  <p className="text-muted-foreground">
                                    {new Date(log.createdAt).toLocaleTimeString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{orgLabel}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={actionInfo.color as "destructive" | "secondary" | "outline"}>
                                  {actionInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <p className="max-w-md truncate text-sm">{log.description}</p>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">{log.performedByName}</p>
                                  <p className="text-muted-foreground">{log.performedByEmail}</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      Mostrando {globalSecurityPage * PAGE_SIZE + 1}-
                      {Math.min((globalSecurityPage + 1) * PAGE_SIZE, globalSecurityTotal)} de {globalSecurityTotal}{" "}
                      registros
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevGlobalPage}
                        disabled={globalSecurityPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        Página {globalSecurityPage + 1} de {totalGlobalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextGlobalPage}
                        disabled={globalSecurityPage >= totalGlobalPages - 1}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Diálogo de confirmación */}
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Eliminar empleado permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ¿Estás seguro de que deseas eliminar permanentemente a{" "}
                  <strong>
                    {employeeToDelete?.firstName} {employeeToDelete?.lastName}
                  </strong>
                  ?
                </p>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-800/50 dark:bg-red-900/20">
                  <p className="font-medium text-red-800 dark:text-red-200">Se eliminarán todos los datos:</p>
                  <ul className="mt-2 list-inside list-disc text-red-700 dark:text-red-300">
                    <li>Contratos de trabajo</li>
                    <li>Fichajes y registros de tiempo</li>
                    <li>Solicitudes de ausencia y vacaciones</li>
                    <li>Balances de vacaciones</li>
                    <li>Gastos y expedientes</li>
                    <li>Documentos</li>
                    {employeeToDelete?.user && <li>Usuario del sistema y sus sesiones</li>}
                  </ul>
                </div>
                <p className="font-medium text-red-600">Esta acción NO se puede deshacer.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar permanentemente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
