"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParsedReceiptData } from "@/lib/ocr/receipt-parser";

interface OcrSuggestionsProps {
  data: ParsedReceiptData;
  onApply: (data: ParsedReceiptData) => void;
  onSkip: () => void;
}

// Componente para renderizar el indicador de confianza
function ConfidenceIndicator({ value }: { value: number }) {
  if (value < 0.5) return <XCircle className="text-destructive size-4" />;
  if (value < 0.8) return <AlertCircle className="size-4 text-yellow-500" />;
  return <CheckCircle2 className="size-4 text-green-500" />;
}

// Función para obtener la variante del badge según confianza
function getBadgeVariant(value: number): "default" | "secondary" | "destructive" {
  if (value < 0.5) return "destructive";
  if (value < 0.8) return "secondary";
  return "default";
}

export function OcrSuggestions({ data, onApply, onSkip }: OcrSuggestionsProps) {
  // Determinar si hay al menos algún dato extraído
  const hasAnyData = data.totalAmount ?? data.date ?? data.merchantName ?? data.merchantVat ?? data.vatPercent;

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Datos extraídos del ticket</h2>
        {!hasAnyData && (
          <Badge variant="secondary" className="text-xs">
            No se pudo extraer información
          </Badge>
        )}
      </div>

      {hasAnyData ? (
        <>
          {/* Datos extraídos */}
          <div className="mb-4 space-y-3">
            {/* Total */}
            {data.totalAmount && (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator value={data.confidence.totalAmount} />
                  <div>
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="font-semibold">
                      {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      }).format(data.totalAmount)}
                    </p>
                  </div>
                </div>
                <Badge variant={getBadgeVariant(data.confidence.totalAmount)} className="text-xs">
                  {Math.round(data.confidence.totalAmount * 100)}%
                </Badge>
              </div>
            )}

            {/* Fecha */}
            {data.date && (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator value={data.confidence.date} />
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha</p>
                    <p className="font-semibold">{format(data.date, "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
                  </div>
                </div>
                <Badge variant={getBadgeVariant(data.confidence.date)} className="text-xs">
                  {Math.round(data.confidence.date * 100)}%
                </Badge>
              </div>
            )}

            {/* Comercio */}
            {data.merchantName && (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator value={data.confidence.merchantName} />
                  <div>
                    <p className="text-muted-foreground text-xs">Comercio</p>
                    <p className="font-semibold">{data.merchantName}</p>
                  </div>
                </div>
                <Badge variant={getBadgeVariant(data.confidence.merchantName)} className="text-xs">
                  {Math.round(data.confidence.merchantName * 100)}%
                </Badge>
              </div>
            )}

            {/* CIF/NIF */}
            {data.merchantVat && (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator value={data.confidence.merchantVat} />
                  <div>
                    <p className="text-muted-foreground text-xs">CIF/NIF</p>
                    <p className="font-semibold">{data.merchantVat}</p>
                  </div>
                </div>
                <Badge variant={getBadgeVariant(data.confidence.merchantVat)} className="text-xs">
                  {Math.round(data.confidence.merchantVat * 100)}%
                </Badge>
              </div>
            )}

            {/* IVA */}
            {data.vatPercent !== null && (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator value={data.confidence.vatPercent} />
                  <div>
                    <p className="text-muted-foreground text-xs">IVA</p>
                    <p className="font-semibold">{data.vatPercent}%</p>
                  </div>
                </div>
                <Badge variant={getBadgeVariant(data.confidence.vatPercent)} className="text-xs">
                  {Math.round(data.confidence.vatPercent * 100)}%
                </Badge>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => onApply(data)} className="w-full sm:flex-1">
              Usar estos datos
            </Button>
            <Button variant="outline" onClick={onSkip} className="w-full sm:w-auto">
              Rellenar manualmente
            </Button>
          </div>

          {/* Aviso */}
          <p className="text-muted-foreground mt-4 text-xs">
            Revisa los datos antes de guardar. Puedes editarlos en el siguiente paso.
          </p>
        </>
      ) : (
        <>
          {/* No se pudo extraer nada */}
          <p className="text-muted-foreground mb-4 text-sm">
            No se pudo extraer información del ticket. Puedes rellenar el formulario manualmente.
          </p>

          <Button onClick={onSkip} className="w-full">
            Continuar con formulario vacío
          </Button>
        </>
      )}
    </div>
  );
}
