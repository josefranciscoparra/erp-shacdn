"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Download, Eye, Trash, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileSize } from "@/lib/validations/document";
import { type MyDocument } from "@/server/actions/my-documents";

interface DocumentItemProps {
  document: MyDocument;
  onPreview: (documentId: string) => void;
  onDownload: (documentId: string, fileName: string) => void;
  onDelete: (documentId: string) => void;
}

export function DocumentItem({ document: doc, onPreview, onDownload, onDelete }: DocumentItemProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-white/5">
      <div className="flex h-32 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <FileText className="h-12 w-12 text-gray-300 dark:text-gray-700" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="truncate font-semibold" title={doc.fileName}>
          {doc.fileName}
        </p>
        <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
          <span>{formatFileSize(doc.fileSize)}</span>
          <span>{format(new Date(doc.createdAt), "d MMM yyyy", { locale: es })}</span>
        </div>
      </div>
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview(doc.id)}>
              <Eye className="mr-2 h-4 w-4" />
              <span>Ver</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(doc.id, doc.fileName)}>
              <Download className="mr-2 h-4 w-4" />
              <span>Descargar</span>
            </DropdownMenuItem>
            {doc.canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(doc.id)} className="text-red-500">
                  <Trash className="mr-2 h-4 w-4" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
