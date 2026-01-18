"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Edit, Trash2, Send, Loader2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Expense, useExpensesStore } from "@/stores/expenses-store";

import { ExpenseAmountDisplay } from "../_components/expense-amount-display";
import { ExpenseCategoryIcon, getCategoryLabel } from "../_components/expense-category-icon";
import { ExpenseStatusBadge } from "../_components/expense-status-badge";
import { ExpensePolicyClient, isReceiptRequired } from "../_lib/expense-policy";

interface ExpenseDetailClientProps {
  policy?: ExpensePolicyClient | null;
  recipients?: Array<{
    id: string;
    name: string | null;
    email: string | null;
    level: number | null;
    decision: "PENDING" | "APPROVED" | "REJECTED" | null;
    source:
      | "DIRECT_MANAGER"
      | "TEAM_RESPONSIBLE"
      | "DEPARTMENT_RESPONSIBLE"
      | "COST_CENTER_RESPONSIBLE"
      | "APPROVER_LIST"
      | "GROUP_HR"
      | "HR_ADMIN"
      | "ORG_ADMIN"
      | null;
  }> | null;
}

export default function ExpenseDetailPage({ policy, recipients }: ExpenseDetailClientProps) {
  const params = useParams();
  const router = useRouter();
  const { expenses, fetchMyExpenses, deleteExpense, submitExpense } = useExpensesStore();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [dialogAction, setDialogAction] = useState<"delete" | "submit" | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    fetchMyExpenses();
  }, [fetchMyExpenses]);

  useEffect(() => {
    const found = expenses.find((e) => e.id === id);
    if (found) {
      setExpense(found);
    }
  }, [expenses, id]);

  // Cargar URLs firmadas para los adjuntos
  useEffect(() => {
    if (!expense?.attachments || expense.attachments.length === 0) {
      return;
    }

    const loadSignedUrls = async () => {
      try {
        const urls: Record<string, string> = {};

        await Promise.all(
          expense.attachments!.map(async (attachment: any) => {
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
      } catch (error) {
        console.error("Error loading signed URLs:", error);
      }
    };

    void loadSignedUrls();
  }, [expense?.id, expense?.attachments]);

  if (!expense) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    router.push(`/dashboard/me/expenses/${id}/edit`);
  };

  const handleConfirmAction = async () => {
    if (!dialogAction) return;

    setIsActionLoading(true);
    try {
      if (dialogAction === "delete") {
        await deleteExpense(id);
        toast.success("Gasto eliminado correctamente");
        router.push("/dashboard/me/expenses");
      }

      if (dialogAction === "submit") {
        await submitExpense(id);
        await fetchMyExpenses();
        toast.success("Gasto enviado a aprobación");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setIsActionLoading(false);
      setDialogAction(null);
    }
  };

  const isDraft = expense.status === "DRAFT";
  const requiresReceipt = isReceiptRequired(policy, expense.category);
  const hasAttachments = Array.isArray(expense.attachments) && expense.attachments.length > 0;
  const canSubmit = !requiresReceipt || hasAttachments;
  const shouldShowRecipients = Array.isArray(recipients);
  const recipientsList = shouldShowRecipients ? recipients : [];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Detalle del Gasto</h1>
              <ExpenseStatusBadge status={expense.status} />
            </div>
            <p className="text-muted-foreground text-sm">ID: {expense.id}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="mr-2 size-4" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDialogAction("delete")}>
                <Trash2 className="mr-2 size-4" />
                Eliminar
              </Button>
              <Button size="sm" onClick={() => setDialogAction("submit")} disabled={!canSubmit}>
                <Send className="mr-2 size-4" />
                Enviar a aprobación
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Información principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card de datos */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Información del Gasto</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Fecha</p>
                <p className="font-medium">{format(new Date(expense.date), "dd MMM yyyy", { locale: es })}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-sm">Categoría</p>
                <div className="flex items-center gap-2">
                  <ExpenseCategoryIcon category={expense.category} className="size-4" />
                  <p className="font-medium">{getCategoryLabel(expense.category)}</p>
                </div>
              </div>

              {expense.merchantName && (
                <div>
                  <p className="text-muted-foreground text-sm">Comercio</p>
                  <p className="font-medium">{expense.merchantName}</p>
                </div>
              )}

              {expense.merchantVat && (
                <div>
                  <p className="text-muted-foreground text-sm">CIF/NIF</p>
                  <p className="font-medium">{expense.merchantVat}</p>
                </div>
              )}

              {expense.mileageKm && (
                <div>
                  <p className="text-muted-foreground text-sm">Kilómetros</p>
                  <p className="font-medium">{expense.mileageKm} km</p>
                </div>
              )}

              {expense.mileageRate && (
                <div>
                  <p className="text-muted-foreground text-sm">Tarifa</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: expense.currency,
                    }).format(expense.mileageRate)}{" "}
                    / km
                  </p>
                </div>
              )}
            </div>

            {expense.notes && (
              <div className="mt-4">
                <p className="text-muted-foreground text-sm">Notas</p>
                <p className="mt-1">{expense.notes}</p>
              </div>
            )}
          </div>

          {/* Adjuntos */}
          {expense.attachments && expense.attachments.length > 0 && (
            <div className="bg-card rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Adjuntos ({expense.attachments.length})</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {expense.attachments.map((att: any) => {
                  const signedUrl = signedUrls[att.id] ?? att.url;
                  const isLoaded = loadedImages[att.id];

                  return (
                    <div key={att.id} className="relative overflow-hidden rounded-lg border">
                      {!isLoaded && (
                        <div className="bg-muted flex aspect-square w-full items-center justify-center">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                        </div>
                      )}
                      <img
                        src={signedUrl}
                        alt={att.fileName}
                        className={`aspect-square w-full cursor-pointer object-cover transition-transform hover:scale-105 ${!isLoaded ? "hidden" : "block"}`}
                        onClick={() => window.open(signedUrl, "_blank")}
                        onLoad={() => setLoadedImages((prev) => ({ ...prev, [att.id]: true }))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!hasAttachments && requiresReceipt && (
            <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4">
              <p className="text-destructive text-sm">
                Necesitas adjuntar un ticket para enviar este gasto a aprobación.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-6">
          {/* Resumen económico */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Resumen</h2>
            <ExpenseAmountDisplay
              amount={expense.amount}
              vatPercent={expense.vatPercent}
              totalAmount={expense.totalAmount}
              currency={expense.currency}
              showBreakdown={true}
            />
          </div>

          {/* Estado */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Estado</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Estado actual</span>
                <ExpenseStatusBadge status={expense.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Creado</span>
                <span className="text-sm">{format(new Date(expense.createdAt), "dd/MM/yyyy", { locale: es })}</span>
              </div>
            </div>
          </div>

          {shouldShowRecipients && (
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Destinatarios</h2>
                <Badge variant="secondary">{isDraft ? "Se enviará a" : "Enviado a"}</Badge>
              </div>
              {recipientsList.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">Sin destinatarios definidos para este flujo.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {recipientsList.map((recipient) => {
                    const recipientName = recipient.name ?? recipient.email ?? "Sin asignar";
                    return (
                      <div key={recipient.id} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{recipientName}</p>
                          {recipient.email ? <p className="text-muted-foreground text-xs">{recipient.email}</p> : null}
                        </div>
                        {recipient.level ? <Badge variant="outline">Nivel {recipient.level}</Badge> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={dialogAction !== null} onOpenChange={(open) => !open && setDialogAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === "delete" ? "¿Eliminar este gasto?" : "¿Enviar este gasto a aprobación?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === "delete"
                ? "Esta acción no se puede deshacer."
                : requiresReceipt && !hasAttachments
                  ? "Necesitas adjuntar un ticket antes de enviarlo."
                  : "Se notificará a los aprobadores correspondientes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isActionLoading || (dialogAction === "submit" && !canSubmit)}
              className={dialogAction === "delete" ? "bg-destructive hover:bg-destructive/90" : undefined}
            >
              {isActionLoading ? "Procesando..." : dialogAction === "delete" ? "Eliminar gasto" : "Enviar a aprobación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
