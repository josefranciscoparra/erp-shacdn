"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  Clock,
  FileText,
  PlaneTakeoff,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { requestTimeTrackingMonthlyExport } from "@/server/actions/data-exports";
import { getDepartments } from "@/server/actions/departments";

type ReportCategoryId = "time-tracking" | "expenses" | "vacations" | "payroll" | "shifts";
type ReportTypeId =
  | "time-tracking-monthly-company"
  | "time-tracking-monthly-department"
  | "time-tracking-monthly-employee"
  | "time-tracking-monthly-team";
type StepId = "category" | "type" | "params" | "review";

type ReportCategory = {
  id: ReportCategoryId;
  title: string;
  description: string;
  icon: typeof Clock;
  enabled: boolean;
};

type ReportType = {
  id: ReportTypeId;
  categoryId: ReportCategoryId;
  title: string;
  description: string;
  enabled: boolean;
  scope: "COMPANY" | "DEPARTMENT";
};

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "time-tracking",
    title: "Fichajes",
    description: "Control horario, jornadas y presencia del equipo.",
    icon: Clock,
    enabled: true,
  },
  {
    id: "expenses",
    title: "Gastos",
    description: "Reembolsos, gastos aprobados y pendientes.",
    icon: Banknote,
    enabled: false,
  },
  {
    id: "vacations",
    title: "Vacaciones",
    description: "Días disfrutados, pendientes y solicitudes.",
    icon: PlaneTakeoff,
    enabled: false,
  },
  {
    id: "payroll",
    title: "Nóminas",
    description: "Histórico de nóminas y conciliación.",
    icon: Wallet,
    enabled: false,
  },
  {
    id: "shifts",
    title: "Turnos",
    description: "Cuadrantes, cambios y cobertura.",
    icon: CalendarClock,
    enabled: false,
  },
];

const REPORT_TYPES: ReportType[] = [
  {
    id: "time-tracking-monthly-company",
    categoryId: "time-tracking",
    title: "Resumen mensual (empresa)",
    description: "Fichajes consolidados para toda la empresa.",
    enabled: true,
    scope: "COMPANY",
  },
  {
    id: "time-tracking-monthly-department",
    categoryId: "time-tracking",
    title: "Resumen mensual (departamento)",
    description: "Fichajes del mes para un departamento específico.",
    enabled: true,
    scope: "DEPARTMENT",
  },
  {
    id: "time-tracking-monthly-employee",
    categoryId: "time-tracking",
    title: "Resumen mensual (empleado)",
    description: "Fichajes y resumen por empleado.",
    enabled: false,
    scope: "COMPANY",
  },
  {
    id: "time-tracking-monthly-team",
    categoryId: "time-tracking",
    title: "Resumen mensual (equipo)",
    description: "Fichajes por equipo o unidad.",
    enabled: false,
    scope: "COMPANY",
  },
];

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "category", label: "Categoría" },
  { id: "type", label: "Tipo" },
  { id: "params", label: "Parámetros" },
  { id: "review", label: "Confirmación" },
];

export default function NewReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useMemo(() => new Date(), []);

  const [step, setStep] = useState<StepId>("category");
  const [direction, setDirection] = useState(0); // 1 for forward, -1 for backward
  const [categoryId, setCategoryId] = useState<ReportCategoryId | null>(null);
  const [typeId, setTypeId] = useState<ReportTypeId | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [notifyWhenReady, setNotifyWhenReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      router.push("/dashboard/reports");
    }, 300);
  };

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam === "time-tracking" && !categoryId) {
      setCategoryId("time-tracking");
      setStep("type");
    }
  }, [searchParams, categoryId]);

  const selectedCategory = categoryId ? REPORT_CATEGORIES.find((category) => category.id === categoryId) : null;
  const availableTypes = categoryId ? REPORT_TYPES.filter((item) => item.categoryId === categoryId) : [];
  const selectedType = typeId ? REPORT_TYPES.find((item) => item.id === typeId) : null;
  const requiresDepartment = selectedType?.scope === "DEPARTMENT";

  useEffect(() => {
    if (!requiresDepartment) {
      setDepartmentId("");
      return;
    }
    let isActive = true;
    const loadDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const result = await getDepartments();
        if (!isActive) return;
        if (result.success && result.departments) {
          setDepartments(result.departments.map((dept) => ({ id: dept.id, name: dept.name })));
        }
      } catch (error) {
        console.error("Error cargando departamentos:", error);
      } finally {
        if (isActive) {
          setLoadingDepartments(false);
        }
      }
    };
    loadDepartments();
    return () => {
      isActive = false;
    };
  }, [requiresDepartment]);

  const activeStepIndex = STEPS.findIndex((item) => item.id === step);

  const canContinueFromParams = !requiresDepartment || departmentId.length > 0;
  const selectedDepartment = departments.find((dept) => dept.id === departmentId);
  const departmentLabel = selectedDepartment ? selectedDepartment.name : "";
  const monthItem = MONTHS.find((item) => item.value === month);
  const monthLabel = monthItem ? monthItem.label : "";

  const summary = [
    { label: "Categoría", value: selectedCategory ? selectedCategory.title : "" },
    { label: "Informe", value: selectedType ? selectedType.title : "" },
    {
      label: "Periodo",
      value: `${monthLabel} ${year}`,
    },
    {
      label: "Ámbito",
      value: selectedType?.scope === "DEPARTMENT" ? "Departamento" : "Empresa",
    },
    ...(requiresDepartment
      ? [
          {
            label: "Departamento",
            value: departmentLabel ? departmentLabel : "Sin seleccionar",
          },
        ]
      : []),
    { label: "Notificación", value: notifyWhenReady ? "Activada" : "No" },
  ];

  const goBack = () => {
    setDirection(-1);
    if (step === "type") {
      setStep("category");
      setCategoryId(null);
    } else if (step === "params") {
      setStep("type");
      setTypeId(null);
    } else if (step === "review") {
      setStep("params");
    }
  };

  const handleCategorySelect = (category: ReportCategory) => {
    if (!category.enabled) return;
    setDirection(1);
    setCategoryId(category.id);
    setStep("type");
  };

  const handleTypeSelect = (type: ReportType) => {
    if (!type.enabled) return;
    setDirection(1);
    setTypeId(type.id);
    setStep("params");
  };

  const handleParamsContinue = () => {
    setDirection(1);
    setStep("review");
  };

  const resetToCategory = () => {
    setDirection(-1);
    setCategoryId(null);
    setTypeId(null);
    setStep("category");
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    try {
      if (selectedType.categoryId === "time-tracking") {
        const result = await requestTimeTrackingMonthlyExport(
          month,
          year,
          selectedType.scope,
          departmentId ? departmentId : undefined,
          notifyWhenReady,
        );

        if (!result.success) {
          toast.error(result.error ?? "No se pudo crear el informe");
          setSubmitting(false);
          return;
        }

        if (result.reused && result.status === "COMPLETED") {
          toast.success("El informe ya estaba disponible. Puedes descargarlo en Informes.");
        } else if (result.reused) {
          toast.success("Ya existe una exportación en curso. Te avisaremos cuando esté lista.");
        } else {
          toast.success("Solicitud registrada. El informe se generará en segundo plano.");
        }

        router.push("/dashboard/reports");
        return;
      }
    } catch (error) {
      console.error("Error generando informe:", error);
      toast.error("No se pudo crear el informe. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 30 : -30,
      opacity: 0,
    }),
  };

  return (
    <PermissionGuard
      permissions={["view_reports", "export_time_tracking", "manage_time_tracking"]}
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Nuevo informe" description="Crea exportaciones y KPIs para RRHH." />
          <EmptyState
            icon={<FileText className="text-muted-foreground/60 mx-auto h-10 w-10" />}
            title="Acceso denegado"
            description="No tienes permisos para crear informes."
          />
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={isExiting ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="@container/main flex flex-col gap-4 md:gap-6"
      >
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (step === "category") {
                  handleExit();
                } else {
                  goBack();
                }
              }}
              className="h-8 w-8 rounded-full"
              title={step === "category" ? "Volver a informes" : "Atrás"}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-0.5">
              <h1 className="text-base leading-tight font-semibold">Nuevo informe</h1>
              <p className="text-muted-foreground text-xs">Genera reportes personalizados.</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExit}
            className="h-8 w-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Stepper */}
        <div className="relative mb-2 flex w-full items-center justify-between px-4 md:px-12">
          <div className="bg-secondary absolute top-1/2 left-0 h-px w-full -translate-y-1/2" />
          <div
            className="bg-primary absolute top-1/2 left-0 h-px -translate-y-1/2 transition-all duration-500 ease-in-out"
            style={{
              width: `${(activeStepIndex / (STEPS.length - 1)) * 100}%`,
            }}
          />
          {STEPS.map((item, index) => {
            const isActive = index === activeStepIndex;
            const isCompleted = index < activeStepIndex;

            return (
              <div key={item.id} className="relative z-10 flex flex-col items-center gap-1.5">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isActive || isCompleted ? "var(--primary)" : "var(--background)",
                    borderColor: isActive || isCompleted ? "var(--primary)" : "var(--muted-foreground)",
                    scale: isActive ? 1.05 : 1,
                  }}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-300",
                    isCompleted || isActive ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </motion.div>
                <span
                  className={cn(
                    "absolute -bottom-6 text-[11px] font-medium whitespace-nowrap transition-colors duration-300",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-3" />

        <AnimatePresence mode="wait" custom={direction}>
          {step === "category" ? (
            <motion.div
              key="category"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col gap-6"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">Selecciona una categoría</h2>
                <p className="text-muted-foreground text-sm">¿Qué tipo de datos necesitas analizar hoy?</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <motion.button
                      key={category.id}
                      type="button"
                      whileHover={{ scale: 1.02, borderColor: "var(--primary)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCategorySelect(category)}
                      disabled={!category.enabled}
                      className={cn(
                        "group focus-visible:ring-primary relative flex flex-col items-start gap-3 rounded-lg border p-5 text-left shadow-sm transition-all outline-none focus-visible:ring-2",
                        category.enabled
                          ? "bg-card cursor-pointer hover:shadow-md"
                          : "bg-muted/30 cursor-not-allowed opacity-50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                          category.enabled
                            ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm leading-none font-semibold tracking-tight">{category.title}</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed">{category.description}</p>
                      </div>
                      {!category.enabled && (
                        <Badge variant="outline" className="absolute top-3 right-3 text-xs">
                          Próximamente
                        </Badge>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : null}

          {step === "type" ? (
            <motion.div
              key="type"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col gap-6"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  {selectedCategory ? `Informes de ${selectedCategory.title}` : "Selecciona un tipo"}
                </h2>
                <p className="text-muted-foreground text-sm">Elige el formato específico del reporte.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {availableTypes.map((type) => (
                  <motion.button
                    key={type.id}
                    type="button"
                    whileHover={{ scale: 1.01, borderColor: "var(--primary)" }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleTypeSelect(type)}
                    disabled={!type.enabled}
                    className={cn(
                      "group focus-visible:ring-primary relative flex items-start gap-3 rounded-lg border p-4 text-left shadow-sm transition-all outline-none focus-visible:ring-2",
                      type.enabled
                        ? "bg-card cursor-pointer hover:shadow-md"
                        : "bg-muted/30 cursor-not-allowed opacity-50",
                    )}
                  >
                    <div className="flex-1 space-y-0.5">
                      <h3 className="text-sm font-semibold">{type.title}</h3>
                      <p className="text-muted-foreground text-xs leading-relaxed">{type.description}</p>
                    </div>
                    {!type.enabled && (
                      <Badge variant="outline" className="text-xs">
                        Próximamente
                      </Badge>
                    )}
                    {type.enabled && (
                      <ArrowRight className="text-muted-foreground h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : null}

          {step === "params" ? (
            <motion.div
              key="params"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="mx-auto flex w-full max-w-xl flex-col gap-5"
            >
              <Card className="gap-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Configuración</CardTitle>
                  <CardDescription className="text-sm">
                    Ajusta el periodo y los filtros antes de generar el informe.
                  </CardDescription>
                </CardHeader>
                <div className="space-y-4 px-6 pb-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="report-month" className="text-sm">
                        Mes
                      </Label>
                      <Select value={`${month}`} onValueChange={(value) => setMonth(Number(value))}>
                        <SelectTrigger id="report-month">
                          <SelectValue placeholder="Selecciona mes" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((item) => (
                            <SelectItem key={item.value} value={`${item.value}`}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="report-year" className="text-sm">
                        Año
                      </Label>
                      <Input
                        id="report-year"
                        type="number"
                        inputMode="numeric"
                        min={2000}
                        max={2100}
                        value={year}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          if (Number.isNaN(parsed)) return;
                          setYear(parsed);
                        }}
                      />
                    </div>
                  </div>

                  {requiresDepartment ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="report-department" className="text-sm">
                        Departamento
                      </Label>
                      <Select value={departmentId} onValueChange={setDepartmentId} disabled={loadingDepartments}>
                        <SelectTrigger id="report-department">
                          <SelectValue
                            placeholder={loadingDepartments ? "Cargando..." : "Selecciona un departamento"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="bg-muted/30 flex items-start gap-3 rounded-md border p-3">
                    <Checkbox
                      id="report-notify"
                      checked={notifyWhenReady}
                      onCheckedChange={(value) => setNotifyWhenReady(Boolean(value))}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1 leading-none">
                      <Label htmlFor="report-notify" className="cursor-pointer text-sm font-medium">
                        Avísame cuando esté listo
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Recibirás una notificación en la campana cuando el informe esté disponible.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleParamsContinue} disabled={!canContinueFromParams} className="min-w-[120px]">
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : null}

          {step === "review" ? (
            <motion.div
              key="review"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="mx-auto flex w-full max-w-xl flex-col gap-5"
            >
              <Card className="border-primary/20 gap-0">
                <CardHeader className="bg-primary/5 border-b pb-5">
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <div className="bg-primary/10 text-primary mb-1 flex h-10 w-10 items-center justify-center rounded-full">
                      <FileText className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">Confirmar Informe</CardTitle>
                    <CardDescription className="text-sm">
                      Revisa los detalles antes de generar el documento.
                    </CardDescription>
                  </div>
                </CardHeader>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    {summary.map((item) => (
                      <div key={item.label} className="space-y-0.5">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          {item.label}
                        </p>
                        <p className="text-foreground text-sm font-medium">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToCategory}
                  disabled={submitting}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Empezar de nuevo
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full min-w-[160px] sm:w-auto">
                  {submitting ? "Generando..." : "Generar informe"}
                  {!submitting && <Check className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </PermissionGuard>
  );
}
