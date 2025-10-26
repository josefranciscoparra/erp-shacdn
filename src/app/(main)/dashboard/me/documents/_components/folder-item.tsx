"use client";

import { Folder } from "lucide-react";

import { documentKindLabels, type DocumentKind } from "@/lib/validations/document";

interface FolderItemProps {
  category: DocumentKind;
  count: number;
  onClick: () => void;
}

export function FolderItem({ category, count, onClick }: FolderItemProps) {
  return (
    <button
      onClick={onClick}
      className="group flex h-28 flex-col justify-between rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-white/5"
    >
      <div className="flex items-start justify-between">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <Folder className="h-6 w-6" />
        </div>
      </div>
      <div className="text-left">
        <p className="font-semibold">{documentKindLabels[category]}</p>
        <p className="text-muted-foreground text-sm">
          {count} {count === 1 ? "documento" : "documentos"}
        </p>
      </div>
    </button>
  );
}
