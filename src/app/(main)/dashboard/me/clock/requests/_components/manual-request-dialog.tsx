"use client";

import { ManualTimeEntryDialog } from "../../_components/manual-time-entry-dialog";

interface ManualRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualRequestDialog({ open, onOpenChange }: ManualRequestDialogProps) {
  return <ManualTimeEntryDialog open={open} onOpenChange={onOpenChange} />;
}
