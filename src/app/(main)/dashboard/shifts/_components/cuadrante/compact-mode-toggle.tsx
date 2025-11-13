/**
 * Toggle Modo Compacto
 *
 * Switch para alternar entre vista normal y compacta
 * Solo UI, no afecta lógica real
 */

"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CompactModeToggleProps {
  isCompact: boolean;
  onToggle: (value: boolean) => void;
}

export function CompactModeToggle({ isCompact, onToggle }: CompactModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch id="compact-mode" checked={isCompact} onCheckedChange={onToggle} />
      <Label htmlFor="compact-mode" className="cursor-pointer text-xs font-medium">
        Modo compacto
      </Label>
    </div>
  );
}
