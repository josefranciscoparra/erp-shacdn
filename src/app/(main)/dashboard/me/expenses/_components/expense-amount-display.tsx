interface ExpenseAmountDisplayProps {
  amount: number;
  vatPercent?: number | null;
  totalAmount: number;
  currency?: string;
  showBreakdown?: boolean;
  className?: string;
}

export function ExpenseAmountDisplay({
  amount,
  vatPercent,
  totalAmount,
  currency = "EUR",
  showBreakdown = false,
  className,
}: ExpenseAmountDisplayProps) {
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (!showBreakdown) {
    return (
      <div className={className}>
        <span className="font-semibold">{formatAmount(totalAmount)}</span>
      </div>
    );
  }

  const vatAmount = vatPercent ? (amount * vatPercent) / 100 : 0;

  return (
    <div className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Importe:</span>
        <span>{formatAmount(amount)}</span>
      </div>
      {vatPercent && vatPercent > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">IVA ({vatPercent}%):</span>
            <span>{formatAmount(vatAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-1">
            <span className="font-semibold">Total:</span>
            <span className="font-semibold">{formatAmount(totalAmount)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
