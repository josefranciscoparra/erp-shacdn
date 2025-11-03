"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Edit, Trash2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Expense, useExpensesStore } from "@/stores/expenses-store";

import { ExpenseAmountDisplay } from "../_components/expense-amount-display";
import { ExpenseCategoryIcon, getCategoryLabel } from "../_components/expense-category-icon";
import { ExpenseStatusBadge } from "../_components/expense-status-badge";

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { expenses, fetchMyExpenses, deleteExpense, submitExpense } = useExpensesStore();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const id = params.id as string;

  useEffect(() => {
    fetchMyExpenses();
  }, []);

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
      } catch (error) {
        console.error("Error loading signed URLs:", error);
      }
    };

    void loadSignedUrls();
  }, [expense?.id, expense?.attachments]);

  if (!expense) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const handleEdit = () => {
    router.push(`/dashboard/me/expenses/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este gasto?")) return;

    try {
      await deleteExpense(id);
      router.push("/dashboard/me/expenses");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al eliminar");
    }
  };

  const handleSubmit = async () => {
    if (!confirm("¿Enviar este gasto a aprobación?")) return;

    try {
      await submitExpense(id);
      await fetchMyExpenses();
      alert("Gasto enviado a aprobación");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al enviar");
    }
  };

  const isDraft = expense.status === "DRAFT";
  const canSubmit = isDraft && (expense.attachments?.length ?? 0) > 0;

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
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 size-4" />
                Eliminar
              </Button>
              {canSubmit && (
                <Button size="sm" onClick={handleSubmit}>
                  <Send className="mr-2 size-4" />
                  Enviar a aprobación
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Información principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de datos */}
          <div className="rounded-lg border bg-card p-6">
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
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">Adjuntos ({expense.attachments.length})</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {expense.attachments.map((att: any) => {
                  const signedUrl = signedUrls[att.id] ?? att.url;

                  return (
                    <div key={att.id} className="overflow-hidden rounded-lg border">
                      <img
                        src={signedUrl}
                        alt={att.fileName}
                        className="aspect-square w-full cursor-pointer object-cover transition-transform hover:scale-105"
                        onClick={() => window.open(signedUrl, "_blank")}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-6">
          {/* Resumen económico */}
          <div className="rounded-lg border bg-card p-6">
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
          <div className="rounded-lg border bg-card p-6">
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
        </div>
      </div>
    </div>
  );
}
