"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  Upload,
  User,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getActiveEmployees } from "@/server/actions/employees";
import { uploadSinglePayslip } from "@/server/actions/payslips";

interface SinglePayslipUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  // Pre-seleccionar empleado si se abre desde expediente
  preselectedEmployeeId?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
  nifNie: string | null;
  active: boolean;
}

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export function SinglePayslipUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedEmployeeId,
}: SinglePayslipUploadDialogProps) {
  // Estado del wizard
  const [step, setStep] = useState(1);

  // Paso 1: Empleado
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);

  // Paso 2: Datos de nómina
  const [year, setYear] = useState(CURRENT_YEAR.toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [label, setLabel] = useState("");

  // Paso 3: Archivo
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Paso 4: Opciones
  const [publishNow, setPublishNow] = useState(false);

  // Estado de carga
  const [isUploading, setIsUploading] = useState(false);

  // Cargar empleados
  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const result = await getActiveEmployees();
      if (result.success && result.employees) {
        setEmployees(result.employees);

        // Pre-seleccionar empleado si viene del expediente
        if (preselectedEmployeeId) {
          const employee = result.employees.find((e: Employee) => e.id === preselectedEmployeeId);
          if (employee) {
            setSelectedEmployee(employee);
            setStep(2); // Saltar al paso 2
          }
        }
      }
    } catch {
      toast.error("Error al cargar empleados");
    } finally {
      setLoadingEmployees(false);
    }
  }, [preselectedEmployeeId]);

  useEffect(() => {
    if (open) {
      loadEmployees();
    } else {
      // Reset al cerrar
      setStep(1);
      setSelectedEmployee(null);
      setYear(CURRENT_YEAR.toString());
      setMonth((new Date().getMonth() + 1).toString());
      setLabel("");
      setFile(null);
      setPublishNow(false);
    }
  }, [open, loadEmployees]);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        toast.error("Solo se permiten archivos PDF");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        toast.error("Solo se permiten archivos PDF");
      }
    }
  };

  // Validación de cada paso
  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedEmployee !== null;
      case 2:
        return year && month;
      case 3:
        return file !== null;
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Subir nómina
  const handleUpload = async () => {
    if (!selectedEmployee || !file) return;

    setIsUploading(true);
    try {
      const fileBuffer = await file.arrayBuffer();
      const result = await uploadSinglePayslip({
        employeeId: selectedEmployee.id,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        label: label || undefined,
        fileBuffer,
        fileName: file.name,
        publishNow,
      });

      if (result.success) {
        toast.success(
          publishNow
            ? "Nómina subida y publicada correctamente"
            : "Nómina subida correctamente (pendiente de publicar)",
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error ?? "Error al subir la nómina");
      }
    } catch {
      toast.error("Error al subir la nómina");
    } finally {
      setIsUploading(false);
    }
  };

  // Navegación
  const nextStep = () => {
    if (canProceed() && step < 4) {
      setStep(step + 1);
    } else if (step === 4) {
      handleUpload();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Subir nómina individual
          </DialogTitle>
          <DialogDescription>
            Paso {step} de 4: {step === 1 && "Selecciona empleado"}
            {step === 2 && "Datos de la nómina"}
            {step === 3 && "Sube el archivo"}
            {step === 4 && "Confirma opciones"}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de progreso */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
          ))}
        </div>

        <div className="min-h-[200px] py-4">
          {/* Paso 1: Seleccionar empleado */}
          {step === 1 && (
            <div className="space-y-4">
              <Label>Empleado</Label>
              <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeSearchOpen}
                    className="w-full justify-between"
                    disabled={loadingEmployees}
                  >
                    {loadingEmployees ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando empleados...
                      </span>
                    ) : selectedEmployee ? (
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                        {selectedEmployee.employeeNumber && (
                          <Badge variant="outline" className="ml-2">
                            {selectedEmployee.employeeNumber}
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Buscar empleado...
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o número..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron empleados</CommandEmpty>
                      <CommandGroup>
                        {employees.map((employee) => (
                          <CommandItem
                            key={employee.id}
                            value={`${employee.firstName} ${employee.lastName} ${employee.employeeNumber ?? ""} ${employee.nifNie ?? ""}`}
                            onSelect={() => {
                              setSelectedEmployee(employee);
                              setEmployeeSearchOpen(false);
                            }}
                          >
                            <User className="mr-2 h-4 w-4" />
                            <div className="flex flex-col">
                              <span>
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {employee.employeeNumber ?? "Sin número"} · {employee.nifNie ?? "Sin DNI"}
                              </span>
                            </div>
                            {selectedEmployee?.id === employee.id && <Check className="ml-auto h-4 w-4" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedEmployee && !selectedEmployee.active && (
                <Alert variant="destructive">
                  <UserX className="h-4 w-4" />
                  <AlertDescription>
                    Este empleado está inactivo. La nómina quedará bloqueada y no se podrá publicar.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Paso 2: Datos de la nómina */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Año</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona año" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mes</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Etiqueta (opcional)</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ej: Paga extra verano, Finiquito..."
                />
                <p className="text-muted-foreground text-xs">Usa una etiqueta para identificar nóminas especiales</p>
              </div>

              {selectedEmployee && (
                <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span>
                    Nómina de{" "}
                    <strong>
                      {MONTHS.find((m) => m.value === month)?.label} {year}
                    </strong>{" "}
                    para{" "}
                    <strong>
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Paso 3: Subir archivo */}
          {step === 3 && (
            <div className="space-y-4">
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : file
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-muted-foreground/25 hover:border-primary/50",
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <FileText className="h-10 w-10 text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-muted-foreground text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-destructive hover:text-destructive"
                    >
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="text-muted-foreground h-10 w-10" />
                    <div>
                      <p className="font-medium">Arrastra el PDF aquí</p>
                      <p className="text-muted-foreground text-sm">o haz clic para seleccionar</p>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span>Seleccionar archivo</span>
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 4: Opciones y confirmación */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="font-medium">Resumen</h4>
                <div className="text-muted-foreground space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Empleado:</span>
                    <span className="text-foreground font-medium">
                      {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Periodo:</span>
                    <span className="text-foreground font-medium">
                      {MONTHS.find((m) => m.value === month)?.label} {year}
                    </span>
                  </div>
                  {label && (
                    <div className="flex justify-between">
                      <span>Etiqueta:</span>
                      <span className="text-foreground font-medium">{label}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Archivo:</span>
                    <span className="text-foreground font-medium">{file?.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <Checkbox
                  id="publish-now"
                  checked={publishNow}
                  onCheckedChange={(checked) => setPublishNow(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="publish-now" className="cursor-pointer font-medium">
                    Publicar inmediatamente
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Si no marcas esta opción, la nómina quedará lista para publicar más tarde.
                  </p>
                </div>
              </div>

              {publishNow && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    El empleado podrá ver esta nómina en su portal inmediatamente después de subirla.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between">
          <Button variant="outline" onClick={prevStep} disabled={step === 1 || isUploading}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancelar
            </Button>
            <Button onClick={nextStep} disabled={!canProceed() || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : step === 4 ? (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir nómina
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
