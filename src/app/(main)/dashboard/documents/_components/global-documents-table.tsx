"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  MoreHorizontal,
  Eye,
  Download,
  Trash,
  FileText,
  Image,
  File,
  ArrowUpDown,
  ExternalLink,
  User,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  documentKindLabels,
  documentKindColors,
  formatFileSize,
  isImageFile,
  isPdfFile,
} from "@/lib/validations/document";
import { useDocumentsStore, type EmployeeDocument } from "@/stores/documents-store";

// Componente para icono de archivo
function FileIcon({ mimeType }: { mimeType: string }) {
  if (isPdfFile(mimeType)) {
    return <FileText className="h-5 w-5 text-red-600" />;
  }
  if (isImageFile(mimeType)) {
    return <Image className="h-5 w-5 text-blue-600" />;
  }
  return <File className="h-5 w-5 text-gray-600" />;
}

interface GlobalDocumentsTableProps {
  documents: EmployeeDocument[];
}

export function GlobalDocumentsTable({ documents }: GlobalDocumentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const { deleteDocument, downloadDocument, previewDocument } = useDocumentsStore();

  // Manejar descarga
  const handleDownload = async (employeeId: string, documentId: string, fileName: string) => {
    await downloadDocument(employeeId, documentId, fileName);
  };

  // Manejar vista previa
  const handlePreview = async (employeeId: string, documentId: string) => {
    await previewDocument(employeeId, documentId);
  };

  // Manejar eliminación
  const handleDelete = async () => {
    if (!deleteDocumentId || !deleteEmployeeId) return;

    const success = await deleteDocument(deleteEmployeeId, deleteDocumentId);
    if (success) {
      setDeleteDocumentId(null);
      setDeleteEmployeeId(null);
      // Refrescar lista global
      useDocumentsStore.getState().fetchAllDocuments({ refresh: true });
    }
  };

  // Definir columnas
  const columns = useMemo<ColumnDef<EmployeeDocument>[]>(
    () => [
      {
        accessorKey: "employee",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Empleado
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const employee = row.original.employee;
          if (!employee) return "N/A";

          return (
            <Link href={`/dashboard/employees/${employee.id}`} className="flex items-center gap-2 hover:underline">
              <User className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="font-medium">
                  {employee.firstName} {employee.lastName}
                </p>
                {employee.employeeNumber && <p className="text-muted-foreground text-xs">#{employee.employeeNumber}</p>}
              </div>
            </Link>
          );
        },
      },
      {
        accessorKey: "fileName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Documento
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <div className="flex items-center gap-3">
              <FileIcon mimeType={doc.mimeType} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{doc.fileName}</p>
                <p className="text-muted-foreground text-sm">{formatFileSize(doc.fileSize)}</p>
                {doc.description && <p className="text-muted-foreground mt-1 truncate text-xs">{doc.description}</p>}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => {
          const kind = row.getValue("kind");
          return (
            <Badge variant="secondary" className={documentKindColors[kind]}>
              {documentKindLabels[kind]}
            </Badge>
          );
        },
      },
      {
        accessorKey: "uploadedBy",
        header: "Subido por",
        cell: ({ row }) => {
          const uploadedBy = row.getValue("uploadedBy");
          return (
            <div>
              <p className="font-medium">{uploadedBy.name}</p>
              <p className="text-muted-foreground text-sm">{uploadedBy.email}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Fecha
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.getValue("createdAt"));
          return (
            <div className="text-sm">
              <p>{format(date, "dd/MM/yyyy", { locale: es })}</p>
              <p className="text-muted-foreground">{format(date, "HH:mm", { locale: es })}</p>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handlePreview(doc.employeeId, doc.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload(doc.employeeId, doc.id, doc.fileName)}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/employees/${doc.employeeId}?tab=documents`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver todos del empleado
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setDeleteDocumentId(doc.id);
                    setDeleteEmployeeId(doc.employeeId);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  // Configurar tabla
  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="text-muted-foreground h-8 w-8" />
                    <p className="text-muted-foreground">No hay documentos en esta categoría</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog
        open={!!deleteDocumentId}
        onOpenChange={() => {
          setDeleteDocumentId(null);
          setDeleteEmployeeId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
