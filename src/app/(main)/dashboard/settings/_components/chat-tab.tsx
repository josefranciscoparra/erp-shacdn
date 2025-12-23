"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { MessageSquare, ShieldCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { getChatStats, getOrganizationChatConfig, updateOrganizationChatStatus } from "@/server/actions/chat";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  activeConversations: number;
  messagesPercentage: string;
}

export function ChatTab() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const { features, setFeatures } = useOrganizationFeaturesStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [config, statsData] = await Promise.all([getOrganizationChatConfig(), getChatStats()]);

        setEnabled(config.chatEnabled);
        setStats(statsData);
      } catch (error) {
        console.error("Error loading chat data:", error);
        toast.error("Error al cargar la configuración del chat");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleToggle = async (newValue: boolean) => {
    try {
      setIsSaving(true);
      await updateOrganizationChatStatus(newValue);

      setEnabled(newValue);

      // Actualización optimista del store cliente para refrescar el sidebar inmediatamente
      setFeatures({
        ...features,
        chatEnabled: newValue,
      });

      toast.success(newValue ? "Chat activado" : "Chat desactivado");
      router.refresh();
    } catch (error) {
      console.error("[ChatTab] Error updating chat status:", error);

      // Manejar errores específicos
      if (error instanceof Error) {
        if (error.message === "NO_PERMISSION") {
          toast.error("No tienes permisos para modificar esta configuración.");
        } else if (error.message === "NO_AUTH") {
          toast.error("No estás autenticado. Por favor, inicia sesión de nuevo.");
        } else if (error.message === "MODULE_DISABLED") {
          toast.error("El módulo de chat no está disponible para esta organización.");
        } else {
          toast.error(`Error al actualizar la configuración: ${error.message}`);
        }
      } else {
        toast.error("Error desconocido al actualizar la configuración");
      }

      // Revertir el estado del switch si hubo error
      setEnabled(!newValue);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <div className="flex-1">
                <h3 className="font-semibold">Control de Chat</h3>
                <p className="text-muted-foreground text-sm">Activa o desactiva el sistema de mensajería</p>
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </div>
        </Card>

        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Estadísticas</h3>
                <p className="text-muted-foreground text-sm">Datos de uso del chat</p>
              </div>
            </div>
            <div className="grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card de Control */}
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Control de Chat</h3>
                <p className="text-muted-foreground text-sm">
                  {enabled
                    ? "Los empleados pueden comunicarse mediante mensajes 1:1"
                    : "El sistema de mensajería está desactivado"}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isSaving} />
          </div>

          {enabled && (
            <div className="bg-muted/50 rounded-lg border p-4">
              <div className="flex gap-3">
                <ShieldCheck className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Chat interno seguro</p>
                  <p className="text-muted-foreground text-xs">
                    Los mensajes se almacenan de forma segura y solo son visibles para los participantes de cada
                    conversación. El sistema cumple con la normativa de protección de datos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Card de Estadísticas */}
      {stats && (
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Estadísticas de Chat</h3>
                <p className="text-muted-foreground text-sm">Datos de uso del sistema</p>
              </div>
            </div>

            <div className="grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Total de conversaciones</p>
                <p className="text-2xl font-bold">{stats.totalConversations}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Mensajes enviados</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Conversaciones activas</p>
                <p className="text-2xl font-bold">{stats.activeConversations}</p>
                <p className="text-muted-foreground text-xs">Últimos 7 días</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Tasa de uso</p>
                <p className="text-2xl font-bold">{stats.messagesPercentage}%</p>
                <p className="text-muted-foreground text-xs">De usuarios activos</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
