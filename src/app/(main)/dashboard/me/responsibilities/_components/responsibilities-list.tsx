"use client";

import { useEffect, useState } from "react";

import { ClipboardList } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyResponsibilities, type ResponsibilityWithSubscription } from "@/server/actions/responsibilities";

import { ResponsibilityCard } from "./responsibility-card";
import { SubscriptionDialog } from "./subscription-dialog";

export function ResponsibilitiesList() {
  const [responsibilities, setResponsibilities] = useState<ResponsibilityWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResponsibility, setSelectedResponsibility] = useState<ResponsibilityWithSubscription | null>(null);

  // Cargar responsabilidades al montar
  useEffect(() => {
    loadResponsibilities();
  }, []);

  const loadResponsibilities = async () => {
    try {
      setLoading(true);
      const data = await getMyResponsibilities();
      setResponsibilities(data);
    } catch (error) {
      console.error("Error al cargar responsabilidades:", error);
      alert("Error al cargar tus áreas de responsabilidad");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (responsibility: ResponsibilityWithSubscription) => {
    setSelectedResponsibility(responsibility);
    setDialogOpen(true);
  };

  const handleEditSubscription = (responsibility: ResponsibilityWithSubscription) => {
    setSelectedResponsibility(responsibility);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setSelectedResponsibility(null);
    loadResponsibilities(); // Recargar para reflejar cambios
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (responsibilities.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="mx-auto h-12 w-12" />}
        title="Sin responsabilidades asignadas"
        description="No tienes áreas de responsabilidad asignadas actualmente. Contacta con Recursos Humanos si crees que debería ser diferente."
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 @2xl/main:grid-cols-2">
        {responsibilities.map((responsibility) => (
          <ResponsibilityCard
            key={responsibility.id}
            responsibility={responsibility}
            onSubscribe={() => handleSubscribe(responsibility)}
            onEditSubscription={() => handleEditSubscription(responsibility)}
          />
        ))}
      </div>

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        responsibility={selectedResponsibility}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}
