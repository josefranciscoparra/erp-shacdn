"use client";

import { useEffect, useState } from "react";

import { Bell, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMySubscriptions, unsubscribeFromAlerts } from "@/server/actions/alerts";

import { AddSubscriptionDialog } from "./add-subscription-dialog";

type Subscription = {
  id: string;
  scope: string;
  departmentId: string | null;
  costCenterId: string | null;
  teamId: string | null;
  severityLevels: string[];
  alertTypes: string[];
  notifyByEmail: boolean;
  department: { id: string; name: string } | null;
  costCenter: { id: string; name: string; code: string | null } | null;
  team: { id: string; name: string; code: string | null } | null;
};

export function AlertSubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Cargar suscripciones
  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const subs = await getMySubscriptions();
      setSubscriptions(subs as Subscription[]);
    } catch (error) {
      console.error("Error al cargar suscripciones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  // Eliminar suscripción
  const handleDelete = async (subscriptionId: string) => {
    try {
      await unsubscribeFromAlerts(subscriptionId);
      await loadSubscriptions(); // Recargar lista
    } catch (error) {
      console.error("Error al eliminar suscripción:", error);
    }
  };

  // Obtener etiqueta de scope
  const getScopeLabel = (subscription: Subscription) => {
    if (subscription.scope === "ORGANIZATION") return "Organización";
    if (subscription.scope === "DEPARTMENT" && subscription.department)
      return `Departamento: ${subscription.department.name}`;
    if (subscription.scope === "COST_CENTER" && subscription.costCenter)
      return `Centro: ${subscription.costCenter.name}`;
    if (subscription.scope === "TEAM" && subscription.team) return `Equipo: ${subscription.team.name}`;
    return subscription.scope;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Suscripciones a Alertas</h3>
        <p className="text-muted-foreground text-sm">
          Gestiona tus notificaciones de alertas de fichajes. Puedes suscribirte a diferentes ámbitos para recibir
          alertas de empleados específicos.
        </p>
      </div>

      {/* Lista de suscripciones */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={<Bell className="mx-auto h-12 w-12" />}
          title="Sin suscripciones"
          description="No tienes suscripciones activas a alertas. Añade una para recibir notificaciones."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir Suscripción
            </Button>
          }
        />
      ) : (
        <>
          {/* Botón añadir en cabecera */}
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir Suscripción
            </Button>
          </div>

          {/* Grid de cards de suscripciones */}
          <div className="grid gap-4 @2xl/main:grid-cols-2">
            {subscriptions.map((sub) => (
              <Card key={sub.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{getScopeLabel(sub)}</CardTitle>
                      <CardDescription className="flex flex-wrap gap-2">
                        <Badge variant="outline">{sub.scope}</Badge>
                        {sub.notifyByEmail && <Badge variant="secondary">Email</Badge>}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(sub.id)}
                      className="text-muted-foreground hover:text-destructive -mt-2 -mr-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {/* Detalles de filtros */}
                {(sub.severityLevels.length > 0 || sub.alertTypes.length > 0) && (
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      {sub.severityLevels.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Severidad:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sub.severityLevels.map((level) => (
                              <Badge key={level} variant="outline" className="text-xs">
                                {level}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {sub.alertTypes.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Tipos:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sub.alertTypes.map((type) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Dialog para añadir suscripción */}
      <AddSubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          loadSubscriptions();
        }}
      />
    </div>
  );
}
