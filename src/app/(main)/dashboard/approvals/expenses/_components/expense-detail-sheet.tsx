"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, FileText, MapPin, Receipt, User, Building2, CreditCard, X, Check } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

interface ExpenseDetailSheetProps {
  expense: ExpenseDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function ExpenseDetailSheet({ expense, open, onOpenChange, onApprove, onReject }: ExpenseDetailSheetProps) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);

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
              const response = await fetch(
                `/api/expenses/${expense.id}/attachments/${attachment.id}/download`
              );

              if (response.ok) {
                const data = await response.json();
                urls[attachment.id] = data.downloadUrl;
              }
            } catch (error) {
              console.error(`Error loading signed URL for ${attachment.id}:`, error);
            }
          })
        );

        setSignedUrls(urls);
      } finally {
        setLoadingUrls(false);
      }
    };

    void loadSignedUrls();
  }, [expense?.id, expense?.attachments, open]);

  if (!expense) return null;

  const isPending = expense.status === "SUBMITTED";
  const employeeInitials = `${expense.employee.firstName[0]}${expense.employee.lastName[0]}`;

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
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3" />
                  <span>{format(expense.date, "d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                </div>
              </div>
            </div>

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

                    return (
                      <a
                        key={attachment.id}
                        href={signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-colors hover:bg-muted/80"
                      >
                        {loadingUrls && !signedUrls[attachment.id] ? (
                          <div className="flex size-full items-center justify-center">
                            <div className="text-muted-foreground text-xs">Cargando...</div>
                          </div>
                        ) : (
                          <>
                            <img
                              src={signedUrl}
                              alt={attachment.fileName}
                              className="size-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="text-xs font-medium text-white">Ver original</span>
                            </div>
                          </>
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
                        {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
                          expense.amount,
                        )}
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
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
                      expense.totalAmount,
                    )}
                  </span>
                </div>
              </div>
            </Card>

            {/* Información adicional */}
            <div className="space-y-3">
              {/* Comercio */}
              {expense.merchantName && (
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 size-4 text-muted-foreground" />
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
                  <MapPin className="size-4 text-muted-foreground" />
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
                  <FileText className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{expense.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline de aprobación */}
            {expense.approvals && expense.approvals.length > 0 && (
              <Card className="p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-4" />
                  Historial
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-2 translate-y-1.5 rounded-full bg-primary" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">Creado</p>
                      <p className="text-xs text-muted-foreground">
                        {format(expense.createdAt, "d MMM yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>

                  {expense.approvals.map((approval) => (
                    <div key={approval.approver.name} className="flex items-start gap-3">
                      <div
                        className={`flex size-2 translate-y-1.5 rounded-full ${
                          approval.decision === "APPROVED" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">
                          {approval.decision === "APPROVED" ? "Aprobado" : "Rechazado"} por{" "}
                          {approval.approver.name}
                        </p>
                        {approval.comment && <p className="text-xs text-muted-foreground">{approval.comment}</p>}
                        {approval.decidedAt && (
                          <p className="text-xs text-muted-foreground">
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
      </SheetContent>
    </Sheet>
  );
}
