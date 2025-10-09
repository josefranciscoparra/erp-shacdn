"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { MoreHorizontal, Eye, Pencil, FileText, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Employee } from "../types";

interface EmployeeActionsProps {
  employee: Employee;
}

export function EmployeeActions({ employee }: EmployeeActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleViewProfile = () => {
    router.push(`/dashboard/employees/${employee.id}`);
  };

  const handleEdit = () => {
    router.push(`/dashboard/employees/${employee.id}/edit`);
  };

  const handleViewContracts = () => {
    router.push(`/dashboard/employees/${employee.id}/contracts`);
  };

  const handleDeactivate = async () => {
    if (!confirm(`¿Estás seguro de que deseas dar de baja a ${employee.firstName} ${employee.lastName}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}/deactivate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error al dar de baja el empleado");
      }

      // Recargar la página para reflejar los cambios
      window.location.reload();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al dar de baja el empleado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>

          <DropdownMenuItem onClick={handleViewProfile}>
            <Eye className="mr-2 h-4 w-4" />
            Ver perfil
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleViewContracts}>
            <FileText className="mr-2 h-4 w-4" />
            Ver contratos
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {employee.active ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDeactivate}
              disabled={isLoading}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              {isLoading ? "Dando de baja..." : "Dar de baja"}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <AlertCircle className="mr-2 h-4 w-4" />
              Ya está inactivo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
