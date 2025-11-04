"use client";

import { useState } from "react";

import { AlertCircle, MapPin } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONSENT_DIALOG_TITLE, CONSENT_CHECKBOX_LABEL, getConsentText } from "@/lib/geolocation/consent";
import { saveGeolocationConsent } from "@/server/actions/geolocation";

interface GeolocationConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsentGiven?: () => void;
  onConsentDenied?: () => void;
}

export function GeolocationConsentDialog({
  open,
  onOpenChange,
  onConsentGiven,
  onConsentDenied,
}: GeolocationConsentDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consentText = getConsentText();

  const handleAccept = async () => {
    if (!accepted) {
      setError("Debes aceptar el consentimiento para continuar");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await saveGeolocationConsent();
      onConsentGiven?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Error al guardar consentimiento:", err);
      setError("Error al guardar el consentimiento. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    onConsentDenied?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="text-primary size-5" />
            {CONSENT_DIALOG_TITLE}
          </DialogTitle>
          <DialogDescription>
            Necesitamos tu consentimiento para acceder a tu ubicación durante los fichajes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Texto de consentimiento */}
          <div className="bg-muted/30 rounded-lg border p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {consentText.split("\n\n").map((paragraph, index) => {
                // Detectar si es una línea con formato **Negrita:**
                const boldMatch = paragraph.match(/^\*\*(.+?)\*\*(.+)$/);
                if (boldMatch) {
                  return (
                    <p key={index} className="mb-2">
                      <strong>{boldMatch[1]}</strong>
                      {boldMatch[2]}
                    </p>
                  );
                }
                return (
                  <p key={index} className="mb-2">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Checkbox de aceptación */}
          <div className="bg-card flex items-start gap-3 rounded-lg border p-4">
            <Checkbox
              id="consent-checkbox"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label htmlFor="consent-checkbox" className="flex-1 cursor-pointer text-sm leading-relaxed">
              {CONSENT_CHECKBOX_LABEL}
            </label>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDeny} disabled={loading}>
            No aceptar
          </Button>
          <Button onClick={handleAccept} disabled={loading || !accepted}>
            {loading ? "Guardando..." : "Aceptar y continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
