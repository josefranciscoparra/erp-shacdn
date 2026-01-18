"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Expense, useExpensesStore } from "@/stores/expenses-store";

import { AttachmentUploader } from "../../_components/attachment-uploader";
import { ExpenseForm } from "../../_components/expense-form";
import { ExpensePolicyClient } from "../../_lib/expense-policy";

export default function EditExpenseClient({ policy }: { policy?: ExpensePolicyClient | null }) {
  const params = useParams();
  const router = useRouter();
  const { expenses, fetchMyExpenses, updateExpense, uploadAttachment } = useExpensesStore();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

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

  // Cargar URLs firmadas para los adjuntos existentes
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

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // 1. Actualizar el gasto
      await updateExpense(id, data);

      // 2. Subir nuevos adjuntos
      if (files.length > 0) {
        for (const file of files) {
          await uploadAttachment(id, file);
        }
      }

      // 3. Redirigir al detalle
      toast.success("Gasto actualizado correctamente");
      router.push(`/dashboard/me/expenses/${id}`);
    } catch (error) {
      console.error("Error al actualizar gasto:", error);
      toast.error(error instanceof Error ? error.message : "Error al actualizar el gasto");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/me/expenses/${id}`);
  };

  if (!expense) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (expense.status !== "DRAFT") {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-muted-foreground">Solo se pueden editar gastos en borrador</p>
          <Button className="mt-4" onClick={() => router.push(`/dashboard/me/expenses/${id}`)}>
            Volver al detalle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Editar Gasto</h1>
          <p className="text-muted-foreground text-sm">Modifica los detalles del gasto</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Adjuntos existentes */}
        {expense.attachments && expense.attachments.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Adjuntos Actuales ({expense.attachments.length})</h2>
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
                      className={`aspect-square w-full object-cover ${!isLoaded ? "hidden" : "block"}`}
                      onLoad={() => setLoadedImages((prev) => ({ ...prev, [att.id]: true }))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Adjuntos nuevos */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Añadir Más Adjuntos</h2>
          <AttachmentUploader files={files} onFilesChange={setFiles} />
        </div>

        {/* Formulario */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Detalles del Gasto</h2>
          <ExpenseForm
            initialData={expense}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            policy={policy}
          />
        </div>
      </div>
    </div>
  );
}
