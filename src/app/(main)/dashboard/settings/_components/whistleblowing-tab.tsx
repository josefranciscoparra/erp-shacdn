"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Copy, ExternalLink, Link as LinkIcon, Plus, Shield, ShieldCheck, TrendingUp, UserCog, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { getInitials } from "@/lib/utils";
import {
  addWhistleblowingManager,
  getAvailableWhistleblowingManagers,
  getOrganizationWhistleblowingConfig,
  getWhistleblowingManagers,
  getWhistleblowingStats,
  removeWhistleblowingManager,
  updateOrganizationWhistleblowingStatus,
  updateWhistleblowingPublicSlug,
  type WhistleblowingManager,
} from "@/server/actions/whistleblowing";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

interface WhistleblowingStats {
  total: number;
  submitted: number;
  inReview: number;
  resolved: number;
  closed: number;
}

export function WhistleblowingTab() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [editingSlug, setEditingSlug] = useState("");
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [stats, setStats] = useState<WhistleblowingStats | null>(null);
  const { features, setFeatures } = useOrganizationFeaturesStore();

  // Estado para gestores
  const [managers, setManagers] = useState<WhistleblowingManager[]>([]);
  const [availableUsers, setAvailableUsers] = useState<WhistleblowingManager[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddingManager, setIsAddingManager] = useState(false);
  const [removingManagerId, setRemovingManagerId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const config = await getOrganizationWhistleblowingConfig();

        setEnabled(config.enabled);
        setPublicSlug(config.publicSlug ?? "");
        setEditingSlug(config.publicSlug ?? "");

        // Cargar gestores
        const managersResult = await getWhistleblowingManagers();
        if (managersResult.success) {
          setManagers(managersResult.managers);
        }

        // Solo cargar stats si esta habilitado y hay gestores
        if (config.enabled && config.managerIds.length > 0) {
          const statsResult = await getWhistleblowingStats();
          if (statsResult.success && statsResult.stats) {
            setStats(statsResult.stats);
          }
        }
      } catch (error) {
        console.error("Error loading whistleblowing data:", error);
        toast.error("Error al cargar la configuracion del canal de denuncias");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleToggle = async (newValue: boolean) => {
    try {
      setIsSaving(true);
      await updateOrganizationWhistleblowingStatus(newValue);

      setEnabled(newValue);

      // Actualizar store para que se refleje en el menu de usuario
      setFeatures({
        ...features,
        whistleblowingEnabled: newValue,
      });

      toast.success(newValue ? "Canal de denuncias activado" : "Canal de denuncias desactivado");

      // Si se activa y no habia slug, recargar para obtenerlo
      if (newValue && !publicSlug) {
        const config = await getOrganizationWhistleblowingConfig();
        setPublicSlug(config.publicSlug ?? "");
        setEditingSlug(config.publicSlug ?? "");
      }

      router.refresh();
    } catch (error) {
      console.error("[WhistleblowingTab] Error updating status:", error);

      if (error instanceof Error) {
        if (error.message === "NO_PERMISSION") {
          toast.error("No tienes permisos para modificar esta configuracion.");
        } else if (error.message === "NO_AUTH") {
          toast.error("No estas autenticado. Por favor, inicia sesion de nuevo.");
        } else if (error.message === "MODULE_DISABLED") {
          toast.error("El canal de denuncias no está disponible para esta organización.");
        } else {
          toast.error(`Error al actualizar la configuracion: ${error.message}`);
        }
      } else {
        toast.error("Error desconocido al actualizar la configuracion");
      }

      setEnabled(!newValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSlug = async () => {
    if (!editingSlug.trim()) {
      toast.error("El identificador no puede estar vacio");
      return;
    }

    try {
      setIsSavingSlug(true);
      const result = await updateWhistleblowingPublicSlug(editingSlug);

      if (result.success) {
        setPublicSlug(editingSlug);
        setIsEditingSlug(false);
        toast.success("URL del portal actualizada");
      } else {
        toast.error(result.error ?? "Error al actualizar la URL");
      }
    } catch (error) {
      console.error("Error saving slug:", error);
      toast.error("Error al guardar el identificador");
    } finally {
      setIsSavingSlug(false);
    }
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/whistleblowing/${publicSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada al portapapeles");
  };

  const openPublicPortal = () => {
    const url = `${window.location.origin}/whistleblowing/${publicSlug}`;
    window.open(url, "_blank");
  };

  // Funciones para gestores
  const loadAvailableUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const result = await getAvailableWhistleblowingManagers();
      if (result.success) {
        setAvailableUsers(result.users);
      } else {
        toast.error(result.error ?? "Error al cargar usuarios");
      }
    } catch (error) {
      console.error("Error loading available users:", error);
      toast.error("Error al cargar usuarios disponibles");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleOpenAddDialog = () => {
    setIsAddDialogOpen(true);
    void loadAvailableUsers();
  };

  const handleAddManager = async (userId: string) => {
    setIsAddingManager(true);
    try {
      const result = await addWhistleblowingManager(userId);
      if (result.success) {
        // Recargar gestores
        const managersResult = await getWhistleblowingManagers();
        if (managersResult.success) {
          setManagers(managersResult.managers);
        }
        // Actualizar usuarios disponibles
        setAvailableUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success("Responsable anadido correctamente");
      } else {
        toast.error(result.error ?? "Error al anadir responsable");
      }
    } catch (error) {
      console.error("Error adding manager:", error);
      toast.error("Error al anadir responsable");
    } finally {
      setIsAddingManager(false);
    }
  };

  const handleRemoveManager = async (userId: string) => {
    setRemovingManagerId(userId);
    try {
      const result = await removeWhistleblowingManager(userId);
      if (result.success) {
        setManagers((prev) => prev.filter((m) => m.id !== userId));
        toast.success("Responsable eliminado");
      } else {
        toast.error(result.error ?? "Error al eliminar responsable");
      }
    } catch (error) {
      console.error("Error removing manager:", error);
      toast.error("Error al eliminar responsable");
    } finally {
      setRemovingManagerId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <div className="flex-1">
                <h3 className="font-semibold">Canal de Denuncias</h3>
                <p className="text-muted-foreground text-sm">Activa el canal interno de informacion</p>
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
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
              <Shield className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Canal de Denuncias</h3>
                <p className="text-muted-foreground text-sm">
                  {enabled
                    ? "Los empleados pueden enviar denuncias de forma confidencial"
                    : "El canal de denuncias esta desactivado"}
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
                  <p className="text-sm font-medium">Cumplimiento Ley 2/2023</p>
                  <p className="text-muted-foreground text-xs">
                    El canal cumple con la Ley 2/2023 reguladora de la proteccion de las personas que informen sobre
                    infracciones normativas y de lucha contra la corrupcion. Los datos se tratan conforme al RGPD.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Card de Responsables del Canal (solo si esta habilitado) */}
      {enabled && (
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Responsables del Canal</h3>
                  <p className="text-muted-foreground text-sm">
                    Usuarios autorizados para gestionar las denuncias recibidas
                  </p>
                </div>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleOpenAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Anadir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Anadir Responsable</DialogTitle>
                    <DialogDescription>
                      Selecciona un usuario de la organizacion para que pueda gestionar las denuncias.
                    </DialogDescription>
                  </DialogHeader>
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground text-sm">Cargando usuarios...</div>
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                      No hay usuarios disponibles para anadir
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2">
                        {availableUsers.map((user) => (
                          <div
                            key={user.id}
                            className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image ?? undefined} />
                                <AvatarFallback>{getInitials(user.name ?? user.email ?? "")}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{user.name ?? "Sin nombre"}</p>
                                <p className="text-muted-foreground text-xs">{user.email}</p>
                              </div>
                            </div>
                            <Button size="sm" onClick={() => handleAddManager(user.id)} disabled={isAddingManager}>
                              Anadir
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {managers.length === 0 ? (
              <div className="bg-muted/50 rounded-lg border border-dashed p-6 text-center">
                <UserCog className="text-muted-foreground mx-auto h-8 w-8" />
                <p className="text-muted-foreground mt-2 text-sm">
                  No hay responsables asignados. Anade al menos uno para poder gestionar las denuncias.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {managers.map((manager) => (
                  <div key={manager.id} className="bg-muted/30 flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={manager.image ?? undefined} />
                        <AvatarFallback>{getInitials(manager.name ?? manager.email ?? "")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{manager.name ?? "Sin nombre"}</p>
                        <p className="text-muted-foreground text-sm">{manager.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveManager(manager.id)}
                      disabled={removingManagerId === manager.id}
                      title="Eliminar responsable"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Card de URL Publica (solo si esta habilitado) */}
      {enabled && (
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Portal Publico de Denuncias</h3>
                <p className="text-muted-foreground text-sm">
                  URL para que personas externas puedan enviar denuncias anonimas
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {isEditingSlug ? (
                <div className="flex gap-2">
                  <div className="flex flex-1 items-center">
                    <span className="bg-muted text-muted-foreground rounded-l-md border border-r-0 px-3 py-2 text-sm">
                      {window.location.origin}/whistleblowing/
                    </span>
                    <Input
                      value={editingSlug}
                      onChange={(e) => setEditingSlug(e.target.value)}
                      className="rounded-l-none"
                      placeholder="mi-empresa"
                    />
                  </div>
                  <Button onClick={handleSaveSlug} disabled={isSavingSlug}>
                    Guardar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSlug(publicSlug);
                      setIsEditingSlug(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex-1 rounded-md border px-3 py-2">
                    <code className="text-sm">
                      {window.location.origin}/whistleblowing/{publicSlug}
                    </code>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyPublicUrl} title="Copiar URL">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={openPublicPortal} title="Abrir portal">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingSlug(true)}>
                    Editar
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Comparte esta URL con proveedores, clientes o cualquier persona externa que necesite enviar una
                denuncia.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Card de Estadisticas (solo si esta habilitado y hay stats) */}
      {enabled && stats && (
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Estadisticas del Canal</h3>
                  <p className="text-muted-foreground text-sm">Resumen de denuncias recibidas</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => router.push("/dashboard/whistleblowing")}>
                Ver todas
              </Button>
            </div>

            <div className="grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-5">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.submitted}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">En investigacion</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inReview}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Resueltas</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Cerradas</p>
                <p className="text-muted-foreground text-2xl font-bold">{stats.closed}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
