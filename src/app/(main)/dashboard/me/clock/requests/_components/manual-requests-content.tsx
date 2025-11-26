"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Loader2, MoreHorizontal, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useManualTimeEntryStore } from "@/stores/manual-time-entry-store";

import { ManualTimeEntryDialog } from "../../_components/manual-time-entry-dialog";

const ITEMS_PER_PAGE = 5;

export function ManualRequestsContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { requests, isLoading, loadRequests, cancelRequest } = useManualTimeEntryStore();

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleCancel = async (id: string) => {
    try {
      await cancelRequest(id);
      toast.success("Solicitud cancelada");
    } catch {
      toast.error("Error al cancelar la solicitud");
    }
  };

  // Paginacion
  const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = requests.slice(startIndex, endIndex);

  // Reset page when requests change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [requests.length, currentPage, totalPages]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">Solicitudes de Fichaje</CardTitle>
          {requests.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {requests.length}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Clock className="text-muted-foreground/20 h-8 w-8" />
            <p className="text-muted-foreground mt-2 text-sm">No hay solicitudes registradas</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Pulsa en &quot;Nueva Solicitud&quot; para solicitar un fichaje manual
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedRequests.map((request) => (
              <div
                key={request.id}
                className="bg-card flex items-center justify-between rounded-lg border p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-muted/50 flex h-9 w-9 items-center justify-center rounded-full">
                    <Clock className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {format(new Date(request.date), "EEEE d MMMM", { locale: es })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(request.clockInTime), "HH:mm")} -{" "}
                      {format(new Date(request.clockOutTime), "HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-6 px-2 text-xs font-medium",
                      request.status === "APPROVED" &&
                        "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300",
                      request.status === "REJECTED" &&
                        "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300",
                      request.status === "PENDING" &&
                        "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {request.status === "APPROVED" && "Aprobada"}
                    {request.status === "REJECTED" && "Rechazada"}
                    {request.status === "PENDING" && "Pendiente"}
                  </Badge>

                  {request.status === "PENDING" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCancel(request.id)} className="text-red-600">
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar solicitud
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Paginacion */}
      {totalPages > 1 && (
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground text-sm">
            Mostrando {startIndex + 1}-{Math.min(endIndex, requests.length)} de {requests.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground px-2 text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}

      <ManualTimeEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
