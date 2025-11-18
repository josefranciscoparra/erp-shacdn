"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ScheduleTemplate } from "@prisma/client";
import { Calendar, Clock, Users, MoreVertical, Pencil, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { duplicateScheduleTemplate, deleteScheduleTemplate } from "@/server/actions/schedules-v2";

interface TemplateWithCount extends ScheduleTemplate {
  _count: {
    employeeAssignments: number;
  };
}

interface Props {
  templates: TemplateWithCount[];
}

const templateTypeLabels = {
  FIXED: { label: "Fijo", color: "default" as const },
  SHIFT: { label: "Turnos", color: "secondary" as const },
  ROTATION: { label: "Rotación", color: "outline" as const },
  FLEXIBLE: { label: "Flexible", color: "secondary" as const },
};

export function ScheduleTemplatesList({ templates }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}

function TemplateCard({ template }: { template: TemplateWithCount }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const router = useRouter();
  const typeInfo = templateTypeLabels[template.templateType];
  const employeeCount = template._count.employeeAssignments;

  const handleDuplicate = async () => {
    setIsDuplicating(true);

    try {
      const result = await duplicateScheduleTemplate(template.id, `${template.name} (Copia)`);

      if (result.success && result.data) {
        toast.success("Plantilla duplicada", {
          description: `Se ha creado una copia de "${template.name}"`,
        });
        router.refresh();
      } else {
        toast.error("Error al duplicar plantilla", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Error al duplicar plantilla", {
        description: "Ha ocurrido un error al duplicar la plantilla",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (employeeCount > 0) {
      toast.error("No se puede eliminar", {
        description: `Esta plantilla tiene ${employeeCount} empleado${employeeCount > 1 ? "s" : ""} asignado${employeeCount > 1 ? "s" : ""}. Debes reasignarlos antes de eliminarla.`,
      });
      return;
    }

    // Confirmación antes de eliminar
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar la plantilla "${template.name}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteScheduleTemplate(template.id);

      if (result.success) {
        toast.success("Plantilla eliminada", {
          description: `La plantilla "${template.name}" ha sido eliminada correctamente`,
        });
        router.refresh();
      } else {
        toast.error("Error al eliminar plantilla", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Error al eliminar plantilla", {
        description: "Ha ocurrido un error al eliminar la plantilla",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="line-clamp-1 text-base">{template.name}</CardTitle>
          {template.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{template.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              disabled={isDeleting || isDuplicating}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/schedules/${template.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
              <Copy className="mr-2 h-4 w-4" />
              {isDuplicating ? "Duplicando..." : "Duplicar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Type Badge */}
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground h-4 w-4" />
            <Badge variant={typeInfo.color}>{typeInfo.label}</Badge>
            {!template.isActive && (
              <Badge variant="outline" className="text-muted-foreground">
                Inactivo
              </Badge>
            )}
          </div>

          {/* Employee Count */}
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-sm">
              {employeeCount === 0 && "Sin empleados asignados"}
              {employeeCount === 1 && "1 empleado"}
              {employeeCount > 1 && `${employeeCount} empleados`}
            </span>
          </div>

          {/* View Details Button */}
          <Button variant="outline" className="w-full" size="sm" asChild>
            <Link href={`/dashboard/schedules/${template.id}`}>
              <Calendar className="mr-2 h-4 w-4" />
              Ver Horarios
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
