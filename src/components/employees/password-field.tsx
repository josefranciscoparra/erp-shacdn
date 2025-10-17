"use client";

import * as React from "react";

import { Copy, Eye, EyeOff, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordFieldProps {
  password: string;
  label?: string;
  canView: boolean;
  className?: string;
}

export function PasswordField({ password, label = "Contraseña temporal", canView, className }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error al copiar:", error);
    }
  };

  return (
    <div className={className}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="mt-1 flex items-center gap-2">
        <Input
          type="text"
          value={canView && showPassword ? password : "••••••••••••••••"}
          readOnly
          className="font-mono text-base"
        />

        {canView && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}

        {canView && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={copyToClipboard}
            title="Copiar contraseña"
            disabled={copied}
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
