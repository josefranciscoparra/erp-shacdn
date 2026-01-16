"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Receipt,
  User,
  Building2,
  X,
  Check,
  Loader2,
  ChevronsUpDown,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { ExpenseCategoryIcon, getCategoryLabel } from "./expense-category-icon";

interface ExpenseDetail {
  id: string;
  date: Date;
  category: string;
  amount: number;
  vatPercent: number | null;
  totalAmount: number;
  merchantName: string | null;
  merchantVat: string | null;
  notes: string | null;
  status: string;
  mileageKm: number | null;
  mileageRate: number | null;
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    photoUrl: string | null;
  };
  attachments?: Array<{
    id: string;
    url: string;
    fileName: string;
  }>;
  costCenter?: {
    name: string;
    code: string;
  } | null;
  createdAt: Date;
  approvals?: Array<{
    decision: string;
    comment: string | null;
    decidedAt: Date | null;
    approver: {
      name: string;
    };
  }>;
  currentApprovers?: Array<{
    id: string;
    name: string;
  }>;
}

interface ExpenseDetailSheetProps {
  expense: ExpenseDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: () => void;
  onReject?: () => void;
  canReassign?: boolean;
  onReassign?: (newApproverId: string) => Promise<void>;
}

type ApproverOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
};

export function ExpenseDetailSheet({
  expense,
  open,
  onOpenChange,
  onApprove,
  onReject,
  canReassign,
  onReassign,
}: ExpenseDetailSheetProps) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [reassignOpen, setReassignOpen] = useState(false);
  const [approvers, setApprovers] = useState<ApproverOption[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Cargar URLs firmadas cuando se abra el detalle
  useEffect(() => {
    if (!expense?.attachments || expense.attachments.length === 0 || !open) {
      return;
    }

    const loadSignedUrls = async () => {
      setLoadingUrls(true);
      try {
        const urls: Record<string, string> = {};

        // Cargar todas las URLs firmadas en paralelo
        await Promise.all(
          expense.attachments!.map(async (attachment) => {
            try {
              const response = await fetch(`/api/expenses/${expense.id}/attachments/${attachment.id}/download`);

              if (response.ok) {
                const data = await response.json();
                urls[attachment.id] = data.downloadUrl;
              }
            } catch (error) {
              console.error(`Error loading signed URL for ${attachment.id}:`, error);
            }
          }),
        );

        setSignedUrls(urls);
      } finally {
        setLoadingUrls(false);
      }
    };

    void loadSignedUrls();
  }, [expense?.id, expense?.attachments, open]);

  useEffect(() => {
    if (!reassignOpen) {
      setSelectedApproverId(null);
      return;
    }

    const loadApprovers = async () => {
      setIsLoadingApprovers(true);
      try {
        const response = await fetch("/api/users?roles=MANAGER,HR_ADMIN,HR_ASSISTANT,ORG_ADMIN");
        if (!response.ok) {
          throw new Error("Error al cargar aprobadores");
        }
        const data = await response.json();
        setApprovers(data.users ?? []);
      } catch (error) {
        console.error("Error loading approvers:", error);
      } finally {
        setIsLoadingApprovers(false);
      }
    };

    void loadApprovers();
  }, [reassignOpen]);

  if (!expense) return null;

  const isPending = expense.status === "SUBMITTED";
  const employeeInitials = `${expense.employee.firstName[0]}${expense.employee.lastName[0]}`;
  const hasCurrentApprovers = Array.isArray(expense.currentApprovers);
  const canShowReassign = Boolean(canReassign && onReassign && isPending && hasCurrentApprovers);

  const handleReassign = async () => {
    if (!onReassign || !selectedApproverId) return;
    setIsReassigning(true);
    try {
      await onReassign(selectedApproverId);
      setReassignOpen(false);
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-2xl">
        {/* Header fijo */}
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Detalle del Gasto</SheetTitle>
          </SheetHeader>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Info del empleado */}
            <div className="flex items-start gap-4">
              <Avatar className="size-12">
                <AvatarImage src={expense.employee.photoUrl ?? undefined} />
                <AvatarFallback>{employeeInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {expense.employee.firstName} {expense.employee.lastName}
                  </h3>
                  <Badge variant={isPending ? "default" : expense.status === "APPROVED" ? "success" : "destructive"}>
                    {expense.status === "SUBMITTED"
                      ? "Pendiente"
                      : expense.status === "APPROVED"
                        ? "Aprobado"
                        : "Rechazado"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{expense.employee.email}</p>
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Calendar className="size-3" />
                  <span>{format(expense.date, "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                </div>
              </div>
            </div>

            {/* Estado de aprobación actual */}
            {isPending && hasCurrentApprovers && (
              <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <User className="size-4" />
                      En bandeja de
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(expense.currentApprovers ?? []).length === 0 ? (
                        <span className="text-muted-foreground text-sm">Sin aprobador asignado</span>
                      ) : (
                        (expense.currentApprovers ?? []).map((approver) => (
                          <Badge key={approver.id} variant="outline">
                            {approver.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  {canShowReassign && (
                    <Button variant="outline" size="sm" onClick={() => setReassignOpen(true)}>
                      Reasignar aprobador
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Galería de adjuntos */}
            {expense.attachments && expense.attachments.length > 0 && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <Receipt className="size-4" />
                  Tickets adjuntos
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {expense.attachments.map((attachment) => {
                    const signedUrl = signedUrls[attachment.id] ?? attachment.url;
                    const isLoaded = loadedImages[attachment.id];

                    return (
                      <a
                        key={attachment.id}
                        href={signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-muted hover:bg-muted/80 relative aspect-square overflow-hidden rounded-lg border transition-colors"
                      >
                        {!isLoaded && (
                          <div className="flex size-full items-center justify-center">
                            <Loader2 className="text-muted-foreground size-8 animate-spin" />
                          </div>
                        )}
                        <img
                          src={signedUrl}
                          alt={attachment.fileName}
                          className={`size-full object-cover ${!isLoaded ? "hidden" : "block"}`}
                          onLoad={() => setLoadedImages((prev) => ({ ...prev, [attachment.id]: true }))}
                        />
                        {isLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="text-xs font-medium text-white">Ver original</span>
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detalles del gasto */}
            <Card className="p-4">
              <h4 className="mb-3 text-sm font-semibold">Detalles del Gasto</h4>
              <div className="space-y-3">
                {/* Categoría */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Categoría</span>
                  <div className="flex items-center gap-2">
                    <ExpenseCategoryIcon category={expense.category as any} className="size-4" />
                    <span className="text-sm font-medium">{getCategoryLabel(expense.category as any)}</span>
                  </div>
                </div>

                <Separator />

                {/* Kilometraje (si aplica) */}
                {expense.mileageKm && expense.mileageRate && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Kilómetros</span>
                      <span className="text-sm font-medium">{expense.mileageKm.toFixed(2)} km</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Tarifa</span>
                      <span className="text-sm font-medium">{expense.mileageRate.toFixed(3)} €/km</span>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Importes (si no es kilometraje) */}
                {!expense.mileageKm && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Importe base</span>
                      <span className="text-sm font-medium">
                        {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(expense.amount)}
                      </span>
                    </div>
                    {expense.vatPercent && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">IVA ({expense.vatPercent}%)</span>
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
                            expense.amount * (expense.vatPercent / 100),
                          )}
                        </span>
                      </div>
                    )}
                    <Separator />
                  </>
                )}

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-xl font-bold">
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(expense.totalAmount)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Información adicional */}
            <div className="space-y-3">
              {/* Comercio */}
              {expense.merchantName && (
                <div className="flex items-start gap-3">
                  <Building2 className="text-muted-foreground mt-0.5 size-4" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{expense.merchantName}</p>
                    {expense.merchantVat && (
                      <p className="text-muted-foreground text-xs">CIF/NIF: {expense.merchantVat}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Centro de coste */}
              {expense.costCenter && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-muted-foreground size-4" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{expense.costCenter.name}</span>
                      <span className="text-muted-foreground"> • {expense.costCenter.code}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Notas */}
              {expense.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="text-muted-foreground mt-0.5 size-4" />
                  <div className="flex-1">
                    <p className="text-muted-foreground text-sm">{expense.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline de aprobación */}
            {expense.approvals && expense.approvals.some((a) => a.decision !== "PENDING") && (
              <Card className="p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-4" />
                  Historial
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary flex size-2 translate-y-1.5 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">Creado</p>
                      <p className="text-muted-foreground text-xs">
                        {format(expense.createdAt, "d MMM yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>

                  {expense.approvals
                    .filter((approval) => approval.decision !== "PENDING")
                    .map((approval) => (
                      <div key={approval.approver.name} className="flex items-start gap-3">
                        <div
                          className={`flex size-2 translate-y-1.5 rounded-full ${
                            approval.decision === "APPROVED" ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">
                            {approval.decision === "APPROVED" ? "Aprobado" : "Rechazado"} por {approval.approver.name}
                          </p>
                          {approval.comment && <p className="text-muted-foreground text-xs">{approval.comment}</p>}
                          {approval.decidedAt && (
                            <p className="text-muted-foreground text-xs">
                              {format(approval.decidedAt, "d MMM yyyy 'a las' HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Footer fijo con botones de acción (solo si está pendiente) */}
        {isPending && onApprove && onReject && (
          <div className="shrink-0 border-t px-6 py-4">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onReject}>
                <X className="mr-2 size-4" />
                Rechazar
              </Button>
              <Button className="flex-1" onClick={onApprove}>
                <Check className="mr-2 size-4" />
                Aprobar
              </Button>
            </div>
          </div>
        )}

        {canShowReassign && (
          <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Reasignar aprobador</DialogTitle>
                <DialogDescription>Selecciona el usuario que recibirá este gasto en su bandeja.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label>Nuevo aprobador</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between"
                      disabled={isLoadingApprovers}
                    >
                      {selectedApproverId
                        ? approvers.find((user) => user.id === selectedApproverId)?.name
                        : isLoadingApprovers
                          ? "Cargando aprobadores..."
                          : "Selecciona un aprobador"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[480px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar usuario..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                        <CommandGroup>
                          {approvers.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.name}
                              onSelect={() => {
                                setSelectedApproverId(user.id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Avatar className="mr-2 h-6 w-6">
                                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                                <AvatarFallback className="text-xs">
                                  {user.name
                                    .split(" ")
                                    .map((part) => part[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-1 flex-col">
                                <span className="text-sm">{user.name}</span>
                                <span className="text-muted-foreground text-xs">{user.email}</span>
                              </div>
                              <Badge variant="outline" className="ml-2">
                                {user.role}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReassignOpen(false)} disabled={isReassigning}>
                  Cancelar
                </Button>
                <Button onClick={handleReassign} disabled={!selectedApproverId || isReassigning}>
                  {isReassigning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reasignando...
                    </>
                  ) : (
                    "Reasignar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </SheetContent>
    </Sheet>
  );
}
