"use client";

import { useState } from "react";
import { FileText, Download, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/hr/section-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Document {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
  category: "payroll" | "contract" | "certificate" | "other";
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Nómina Enero 2025",
    type: "PDF",
    date: "2025-01-31",
    size: "245 KB",
    category: "payroll",
  },
  {
    id: "2",
    name: "Nómina Diciembre 2024",
    type: "PDF",
    date: "2024-12-31",
    size: "243 KB",
    category: "payroll",
  },
  {
    id: "3",
    name: "Contrato de trabajo",
    type: "PDF",
    date: "2024-06-15",
    size: "1.2 MB",
    category: "contract",
  },
  {
    id: "4",
    name: "Certificado de empresa",
    type: "PDF",
    date: "2024-11-20",
    size: "180 KB",
    category: "certificate",
  },
  {
    id: "5",
    name: "Nómina Noviembre 2024",
    type: "PDF",
    date: "2024-11-30",
    size: "241 KB",
    category: "payroll",
  },
];

export function MyDocuments() {
  const [documents] = useState<Document[]>(mockDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const getCategoryLabel = (category: Document["category"]) => {
    switch (category) {
      case "payroll":
        return "Nómina";
      case "contract":
        return "Contrato";
      case "certificate":
        return "Certificado";
      case "other":
        return "Otro";
    }
  };

  const getCategoryColor = (category: Document["category"]) => {
    switch (category) {
      case "payroll":
        return "bg-blue-500";
      case "contract":
        return "bg-green-500";
      case "certificate":
        return "bg-purple-500";
      case "other":
        return "bg-gray-500";
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Agrupar por categoría
  const groupedDocuments = filteredDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Mis Documentos" />

      {/* Filtros */}
      <Card className="@container/card flex flex-col gap-4 p-4 @md/card:flex-row @md/card:items-center @md/card:justify-between">
        <div className="relative flex-1 @md/card:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full @md/card:w-[200px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="payroll">Nóminas</SelectItem>
            <SelectItem value="contract">Contratos</SelectItem>
            <SelectItem value="certificate">Certificados</SelectItem>
            <SelectItem value="other">Otros</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Documentos agrupados */}
      <div className="flex flex-col gap-6">
        {Object.entries(groupedDocuments).map(([category, docs]) => (
          <Card key={category} className="@container/card flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${getCategoryColor(category as Document["category"])}`}
              />
              <h3 className="text-lg font-semibold">
                {getCategoryLabel(category as Document["category"])}
              </h3>
              <Badge variant="secondary">{docs.length}</Badge>
            </div>

            <div className="flex flex-col gap-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{doc.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{doc.type}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>
                          {new Date(doc.date).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver documento</span>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Descargar documento</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {filteredDocuments.length === 0 && (
          <Card className="@container/card flex flex-col items-center justify-center gap-4 p-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-semibold">No se encontraron documentos</h3>
              <p className="text-sm text-muted-foreground">
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
