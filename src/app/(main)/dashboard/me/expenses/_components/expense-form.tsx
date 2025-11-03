"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Expense } from "@/stores/expenses-store";

import { ExpenseCategoryIcon, getCategoryLabel } from "./expense-category-icon";

const expenseFormSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  category: z.enum(["FUEL", "MILEAGE", "MEAL", "TOLL", "PARKING", "LODGING", "OTHER"]),
  amount: z.string().min(1, "El importe es obligatorio"),
  vatPercent: z.string().optional(),
  merchantName: z.string().optional(),
  merchantVat: z.string().optional(),
  notes: z.string().optional(),
  mileageKm: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  initialData?: Expense;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ExpenseForm({ initialData, onSubmit, onCancel, isSubmitting = false }: ExpenseFormProps) {
  const [isMileage, setIsMileage] = useState(initialData?.category === "MILEAGE");
  const [totalAmount, setTotalAmount] = useState(0);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      category: initialData?.category ?? "OTHER",
      amount: initialData?.amount?.toString() ?? "",
      vatPercent: initialData?.vatPercent?.toString() ?? "21",
      merchantName: initialData?.merchantName ?? "",
      merchantVat: initialData?.merchantVat ?? "",
      notes: initialData?.notes ?? "",
      mileageKm: initialData?.mileageKm?.toString() ?? "",
    },
  });

  const watchCategory = form.watch("category");
  const watchAmount = form.watch("amount");
  const watchVat = form.watch("vatPercent");
  const watchKm = form.watch("mileageKm");

  // Actualizar si es kilometraje
  useEffect(() => {
    setIsMileage(watchCategory === "MILEAGE");
  }, [watchCategory]);

  // Calcular total automáticamente
  useEffect(() => {
    if (isMileage) {
      // Kilometraje: km × 0.26 €/km
      const km = parseFloat(watchKm || "0");
      const total = km * 0.26;
      setTotalAmount(total);
    } else {
      // Normal: amount + IVA
      const amount = parseFloat(watchAmount || "0");
      const vatPercent = parseFloat(watchVat || "0");
      const vatAmount = (amount * vatPercent) / 100;
      const total = amount + vatAmount;
      setTotalAmount(total);
    }
  }, [isMileage, watchAmount, watchVat, watchKm]);

  const handleSubmit = async (data: ExpenseFormValues) => {
    const formattedData = {
      date: new Date(data.date),
      category: data.category,
      amount: isMileage ? 0 : parseFloat(data.amount),
      vatPercent: isMileage || !data.vatPercent ? null : parseFloat(data.vatPercent),
      totalAmount,
      merchantName: data.merchantName ?? null,
      merchantVat: data.merchantVat ?? null,
      notes: data.notes ?? null,
      mileageKm: isMileage && data.mileageKm ? parseFloat(data.mileageKm) : null,
      mileageRate: isMileage ? 0.26 : null,
    };

    await onSubmit(formattedData);
  };

  const categories = [
    { value: "FUEL", label: getCategoryLabel("FUEL") },
    { value: "MILEAGE", label: getCategoryLabel("MILEAGE") },
    { value: "MEAL", label: getCategoryLabel("MEAL") },
    { value: "TOLL", label: getCategoryLabel("TOLL") },
    { value: "PARKING", label: getCategoryLabel("PARKING") },
    { value: "LODGING", label: getCategoryLabel("LODGING") },
    { value: "OTHER", label: getCategoryLabel("OTHER") },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Fecha y Categoría */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha del gasto</FormLabel>
                <FormControl>
                  <Input type="date" {...field} max={new Date().toISOString().split("T")[0]} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <ExpenseCategoryIcon category={cat.value as any} className="size-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Importe o Kilometraje */}
        {isMileage ? (
          <FormField
            control={form.control}
            name="mileageKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kilómetros</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <p className="text-muted-foreground text-xs">Tarifa: 0.26 €/km</p>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe base (sin IVA)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA %</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona IVA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        {/* Total calculado */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-2xl font-bold">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(totalAmount)}
            </span>
          </div>
        </div>

        {/* Comercio */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="merchantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del comercio (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Gasolinera Repsol" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="merchantVat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CIF/NIF (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: A12345678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notas */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Añade detalles sobre este gasto..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botones */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : initialData ? "Guardar cambios" : "Crear gasto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
