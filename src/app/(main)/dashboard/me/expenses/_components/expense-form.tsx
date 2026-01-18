"use client";

import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateInputValue } from "@/lib/date-input";
import { Expense } from "@/stores/expenses-store";

import {
  ExpensePolicyClient,
  getCategoryLimit,
  getCategoryRequirement,
  isReceiptRequired,
  isVatAllowed,
} from "../_lib/expense-policy";

import { ExpenseCategoryIcon, getCategoryLabel } from "./expense-category-icon";

const expenseFormSchema = z
  .object({
    date: z.string().min(1, "La fecha es obligatoria"),
    category: z.enum(["FUEL", "MILEAGE", "MEAL", "TOLL", "PARKING", "LODGING", "OTHER"]),
    amount: z.string().optional(),
    vatPercent: z.string().optional(),
    merchantName: z.string().optional(),
    merchantVat: z.string().optional(),
    notes: z.string().optional(),
    mileageKm: z.string().optional(),
    // Nuevos campos Sector Público
    procedureId: z.string().optional(),
    paidBy: z.enum(["EMPLOYEE", "ORGANIZATION"]).default("EMPLOYEE"),
  })
  .superRefine((data, ctx) => {
    if (data.category === "MILEAGE") {
      if (!data.mileageKm || parseFloat(data.mileageKm) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Los kilómetros son obligatorios",
          path: ["mileageKm"],
        });
      }
    } else {
      if (!data.amount || parseFloat(data.amount) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El importe es obligatorio",
          path: ["amount"],
        });
      }
    }
  });

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const parseNumberInput = (value?: string | null) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const formatNumberInput = (value: number) => (Number.isNaN(value) ? "" : value.toFixed(2));

interface ExpenseFormProps {
  initialData?: Expense | Partial<Expense>;
  initialAmountMode?: "base" | "total";
  initialTotalAmount?: number | null;
  onSubmit: (data: any, submitType: "draft" | "submit") => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEditMode?: boolean; // true = editando gasto existente, false/undefined = nuevo gasto
  // Lista de expedientes activos para vincular
  procedures?: { id: string; name: string; code: string | null }[];
  // Política activa para cálculos
  policy?: ExpensePolicyClient | null;
}

export function ExpenseForm({
  initialData,
  initialAmountMode = "base",
  initialTotalAmount = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditMode = false,
  procedures = [],
  policy,
}: ExpenseFormProps) {
  const [isMileage, setIsMileage] = useState(initialData?.category === "MILEAGE");
  const [submitType, setSubmitType] = useState<"draft" | "submit">("submit");
  const [amountMode, setAmountMode] = useState<"base" | "total">(initialAmountMode);
  const [totalInput, setTotalInput] = useState<string>(() => {
    if (initialAmountMode === "total" && initialTotalAmount !== null) {
      return Number.isNaN(Number(initialTotalAmount)) ? "" : Number(initialTotalAmount).toFixed(2);
    }
    return "";
  });

  const mileageRate = policy && !Number.isNaN(policy.mileageRate) ? policy.mileageRate : 0.26;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: initialData?.date ? formatDateInputValue(new Date(initialData.date)) : formatDateInputValue(new Date()),
      category: initialData?.category ?? "OTHER",
      amount: initialData?.amount?.toString() ?? "",
      vatPercent: initialData?.vatPercent?.toString() ?? "21",
      merchantName: initialData?.merchantName ?? "",
      merchantVat: initialData?.merchantVat ?? "",
      notes: initialData?.notes ?? "",
      mileageKm: initialData?.mileageKm?.toString() ?? "",
      procedureId: initialData?.procedureId ?? undefined,
      paidBy: initialData?.paidBy ?? "EMPLOYEE",
    },
  });

  const watchCategory = form.watch("category");
  const watchAmount = form.watch("amount");
  const watchVat = form.watch("vatPercent");
  const watchKm = form.watch("mileageKm");

  const amountValue = parseNumberInput(watchAmount);
  const vatPercentValue = parseNumberInput(watchVat);
  const kmValue = parseNumberInput(watchKm);

  const categoryRequirement = useMemo(() => getCategoryRequirement(policy, watchCategory), [policy, watchCategory]);
  const categoryLimit = useMemo(() => getCategoryLimit(policy, watchCategory), [policy, watchCategory]);
  const requiresReceipt = useMemo(() => isReceiptRequired(policy, watchCategory), [policy, watchCategory]);
  const vatAllowed = !isMileage && isVatAllowed(policy, watchCategory);

  const vatAmount = vatAllowed ? (amountValue * vatPercentValue) / 100 : 0;
  const totalAmount = useMemo(() => {
    if (isMileage) {
      return kmValue * mileageRate;
    }
    return amountValue + vatAmount;
  }, [amountValue, isMileage, kmValue, mileageRate, vatAmount]);

  const expenseMode = policy ? policy.expenseMode : "PRIVATE";
  const showProcedureFields = expenseMode !== "PRIVATE" && procedures.length > 0;
  const isOverLimit = !isMileage && categoryLimit !== null && amountValue > categoryLimit;

  // Actualizar si es kilometraje
  useEffect(() => {
    setIsMileage(watchCategory === "MILEAGE");
  }, [watchCategory]);

  // Mantener el importe base sincronizado cuando el usuario introduce el total
  useEffect(() => {
    if (isMileage || amountMode !== "total") return;

    const totalValue = parseNumberInput(totalInput);
    const divisor = 1 + vatPercentValue / 100;
    const baseValue = divisor > 0 ? totalValue / divisor : totalValue;
    const roundedBase = roundCurrency(baseValue);
    const nextAmount = totalValue > 0 ? formatNumberInput(roundedBase) : "";

    if (nextAmount !== watchAmount) {
      form.setValue("amount", nextAmount, { shouldValidate: true, shouldDirty: true });
    }
  }, [amountMode, form, isMileage, totalInput, vatPercentValue, watchAmount]);

  // Sincronizar total mostrado cuando se introduce base
  useEffect(() => {
    if (isMileage || amountMode !== "base") return;
    const totalValue = roundCurrency(amountValue + vatAmount);
    const nextTotal = amountValue > 0 ? formatNumberInput(totalValue) : "";

    if (nextTotal !== totalInput) {
      setTotalInput(nextTotal);
    }
  }, [amountMode, amountValue, isMileage, totalInput, vatAmount]);

  // Forzar IVA 0 cuando la categoría no permite IVA
  useEffect(() => {
    if (isMileage) return;
    if (!vatAllowed && watchVat !== "0") {
      form.setValue("vatPercent", "0", { shouldValidate: true });
    }
  }, [form, isMileage, vatAllowed, watchVat]);

  const handleSubmit = async (data: ExpenseFormValues, type: "draft" | "submit") => {
    const amountInput = parseNumberInput(data.amount);
    const vatPercentInput = parseNumberInput(data.vatPercent);
    const mileageKmInput = parseNumberInput(data.mileageKm);

    const formattedData = {
      date: new Date(data.date),
      category: data.category,
      // Para MILEAGE, el amount es 0 (se calcula en el servidor basado en mileageKm)
      amount: isMileage ? 0 : amountInput,
      vatPercent: isMileage || !vatAllowed || vatPercentInput <= 0 ? null : vatPercentInput,
      merchantName: data.merchantName ?? null,
      merchantVat: data.merchantVat ?? null,
      notes: data.notes ?? null,
      mileageKm: isMileage && mileageKmInput > 0 ? mileageKmInput : null,
      // totalAmount y mileageRate se calculan en el servidor
    };

    if (expenseMode !== "PRIVATE") {
      return onSubmit(
        {
          ...formattedData,
          procedureId: data.procedureId,
          paidBy: data.paidBy,
        },
        type,
      );
    }

    await onSubmit(formattedData, type);
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit((data) => handleSubmit(data, submitType))();
        }}
        className="space-y-6"
      >
        {/* Expediente y Método de Pago (Sector Público) */}
        {showProcedureFields && (
          <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Detalles del Expediente</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="procedureId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vincular a Expediente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un expediente..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {procedures.map((proc) => (
                          <SelectItem key={proc.id} value={proc.id}>
                            {proc.code ? `[${proc.code}] ` : ""}
                            {proc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pagado por</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="¿Quién pagó?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">Yo (Reembolsable)</SelectItem>
                        <SelectItem value="ORGANIZATION">Organización (Pago directo)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Fecha y Categoría */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha del gasto</FormLabel>
                <FormControl>
                  <Input type="date" {...field} max={formatDateInputValue(new Date())} />
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

        {/* Información de política por categoría */}
        {policy && (
          <div className="bg-muted/50 rounded-lg border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {requiresReceipt && <Badge variant="secondary">Ticket obligatorio</Badge>}
              {!vatAllowed && <Badge variant="secondary">IVA no deducible</Badge>}
              {categoryLimit !== null && (
                <Badge variant="secondary">
                  Límite diario:{" "}
                  {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(categoryLimit)}
                </Badge>
              )}
            </div>
            {categoryRequirement.description && (
              <p className="text-muted-foreground mt-2">{categoryRequirement.description}</p>
            )}
            {isOverLimit && categoryLimit !== null && (
              <p className="text-destructive mt-2">
                El importe base supera el límite diario de{" "}
                {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(categoryLimit)}.
              </p>
            )}
          </div>
        )}

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
                <p className="text-muted-foreground text-xs">Tarifa: {mileageRate} €/km</p>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg border p-4">
              <p className="text-sm font-medium">¿Cómo quieres introducir el importe?</p>
              <RadioGroup
                value={amountMode}
                onValueChange={(value) => {
                  const nextMode = value as "base" | "total";
                  setAmountMode(nextMode);
                  if (nextMode === "total" && totalInput.length === 0) {
                    const nextTotal = amountValue > 0 ? formatNumberInput(roundCurrency(amountValue + vatAmount)) : "";
                    setTotalInput(nextTotal);
                  }
                }}
                className="mt-2 flex flex-col gap-2 sm:flex-row"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="base" id="amount-base" />
                  <Label htmlFor="amount-base" className="text-sm">
                    Base sin IVA
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="total" id="amount-total" />
                  <Label htmlFor="amount-total" className="text-sm">
                    Total con IVA
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {amountMode === "base" ? (
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
              ) : (
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total (IVA incluido)</FormLabel>
                      <Input type="hidden" {...field} />
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={totalInput}
                          onChange={(event) => setTotalInput(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="vatPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA %</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!vatAllowed}>
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
                    {!vatAllowed && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        El IVA no está permitido para esta categoría.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {amountMode === "total" && (
              <div className="bg-muted/50 rounded-lg border p-3 text-xs">
                <span className="text-muted-foreground">Base calculada:</span>{" "}
                <span className="font-medium">
                  {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amountValue)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Total calculado */}
        <div className="bg-muted/50 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-2xl font-bold">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(totalAmount)}
            </span>
          </div>
          {!isMileage && (
            <div className="text-muted-foreground mt-3 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span>Base</span>
                <span>
                  {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amountValue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>IVA ({vatAllowed ? vatPercentValue : 0}%)</span>
                <span>{new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(vatAmount)}</span>
              </div>
            </div>
          )}
          {isMileage && (
            <p className="text-muted-foreground mt-3 text-xs">
              {kmValue.toFixed(2)} km × {mileageRate.toFixed(2)} €/km
            </p>
          )}
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
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          {/* Solo mostrar "Guardar borrador" si es un gasto nuevo (no en modo edición) */}
          {!isEditMode && (
            <Button
              type="submit"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => setSubmitType("draft")}
              className="w-full sm:w-auto"
            >
              {isSubmitting && submitType === "draft" ? "Guardando..." : "Guardar borrador"}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => setSubmitType("submit")}
            className="w-full sm:w-auto"
          >
            {isSubmitting && submitType === "submit" ? "Enviando..." : isEditMode ? "Guardar cambios" : "Enviar gasto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
