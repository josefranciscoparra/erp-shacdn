"use client";

import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { PasswordConfirmationDialog } from "@/components/employees/password-confirmation-dialog";
import { Button } from "@/components/ui/button";

interface EmployeeIbanDisplayProps {
  iban: string | null;
  employeeId: string;
  requirePassword?: boolean; // Variable de entorno REQUIRE_PASSWORD_FOR_IBAN
}

export function EmployeeIbanDisplay({ iban, employeeId, requirePassword = false }: EmployeeIbanDisplayProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  if (!iban) {
    return <span className="text-muted-foreground text-sm italic">Sin IBAN registrado</span>;
  }

  // Enmascarar IBAN: ES** **** **** **** ****1234
  const maskIban = (iban: string): string => {
    // Limpiar espacios
    const cleanIban = iban.replace(/\s/g, "");

    if (cleanIban.length < 8) return iban;

    // Formato: ES (primeros 2) + ** + últimos 4
    const country = cleanIban.substring(0, 2);
    const lastFour = cleanIban.substring(cleanIban.length - 4);
    const middleLength = cleanIban.length - 6; // Total - (2 país + 4 últimos)
    const asterisks = "*".repeat(middleLength);

    // Añadir espacios cada 4 caracteres
    const masked = `${country}${asterisks}${lastFour}`;
    return masked.match(/.{1,4}/g)?.join(" ") ?? masked;
  };

  // Formatear IBAN con espacios cada 4 caracteres
  const formatIban = (iban: string): string => {
    const cleanIban = iban.replace(/\s/g, "");
    return cleanIban.match(/.{1,4}/g)?.join(" ") ?? cleanIban;
  };

  // Verificar si ya se validó recientemente (30 min)
  const checkRecentVerification = (): boolean => {
    const verifiedUntil = sessionStorage.getItem("sensitive_data_verified_until");
    if (!verifiedUntil) return false;

    const expiresAt = parseInt(verifiedUntil, 10);
    return Date.now() < expiresAt;
  };

  // Registrar acceso en log de auditoría
  const logAccess = async () => {
    try {
      await fetch("/api/audit/sensitive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataType: "IBAN",
          resourceId: employeeId,
          resourceType: "EMPLOYEE",
        }),
      });
    } catch (error) {
      console.error("Error al registrar acceso:", error);
    }
  };

  const handleReveal = () => {
    if (requirePassword && !checkRecentVerification()) {
      // Requiere contraseña y no se ha verificado recientemente
      setShowPasswordDialog(true);
    } else {
      // No requiere contraseña o ya se verificó
      handleConfirmedReveal();
    }
  };

  const handleConfirmedReveal = async () => {
    setIsRevealed(true);
    await logAccess();
  };

  const handleHide = () => {
    setIsRevealed(false);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">{isRevealed ? formatIban(iban) : maskIban(iban)}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={isRevealed ? handleHide : handleReveal}
        className="h-7 px-2"
        title={isRevealed ? "Ocultar IBAN" : "Mostrar IBAN completo"}
      >
        {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>

      {requirePassword && (
        <PasswordConfirmationDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          onConfirm={handleConfirmedReveal}
          title="Confirmar identidad"
          description="Para ver el IBAN completo, introduce tu contraseña:"
        />
      )}
    </div>
  );
}
