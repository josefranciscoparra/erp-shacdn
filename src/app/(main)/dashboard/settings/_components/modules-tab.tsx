"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Clock, MapPin, Megaphone, MessageSquare, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { type ModuleAvailability, type ModuleKey } from "@/lib/organization-modules";
import { updateOrganizationModuleAvailability } from "@/server/actions/organization-modules";

type ModuleEnabledState = {
  chatEnabled: boolean;
  shiftsEnabled: boolean;
  geolocationEnabled: boolean;
  whistleblowingEnabled: boolean;
};

type ModuleItem = {
  key: ModuleKey;
  title: string;
  description: string;
  icon: LucideIcon;
  enabledKey: keyof ModuleEnabledState;
};

const MODULE_ITEMS: ModuleItem[] = [
  {
    key: "chat",
    title: "Chat interno",
    description: "Mensajeria 1:1 entre empleados y managers.",
    icon: MessageSquare,
    enabledKey: "chatEnabled",
  },
  {
    key: "shifts",
    title: "Turnos",
    description: "Planificacion de cuadrantes, zonas y asignaciones.",
    icon: Clock,
    enabledKey: "shiftsEnabled",
  },
  {
    key: "geolocation",
    title: "Geolocalizacion",
    description: "Captura GPS en fichajes y validaciones por ubicacion.",
    icon: MapPin,
    enabledKey: "geolocationEnabled",
  },
  {
    key: "whistleblowing",
    title: "Canal Etico",
    description: "Canal de denuncias con gestores y portal publico.",
    icon: Megaphone,
    enabledKey: "whistleblowingEnabled",
  },
];

interface ModulesTabProps {
  initialAvailability: ModuleAvailability;
  initialEnabled: ModuleEnabledState;
}

export function ModulesTab({ initialAvailability, initialEnabled }: ModulesTabProps) {
  const router = useRouter();
  const [availability, setAvailability] = useState<ModuleAvailability>(initialAvailability);
  const [enabledState, setEnabledState] = useState<ModuleEnabledState>(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingModule, setPendingModule] = useState<ModuleKey | null>(null);

  useEffect(() => {
    setAvailability(initialAvailability);
  }, [initialAvailability]);

  useEffect(() => {
    setEnabledState(initialEnabled);
  }, [initialEnabled]);

  const handleToggle = async (moduleKey: ModuleKey, available: boolean) => {
    if (isSaving) return;

    const previous = availability[moduleKey];
    setAvailability((prev) => ({ ...prev, [moduleKey]: available }));
    setIsSaving(true);
    setPendingModule(moduleKey);

    try {
      const result = await updateOrganizationModuleAvailability(moduleKey, available);
      setAvailability(result.modules);
      setEnabledState(result.enabled);
      toast.success(available ? "Modulo habilitado" : "Modulo ocultado");
      router.refresh();
    } catch (error) {
      console.error("[ModulesTab] Error updating module availability:", error);
      setAvailability((prev) => ({ ...prev, [moduleKey]: previous }));

      if (error instanceof Error) {
        if (error.message === "NO_PERMISSION") {
          toast.error("No tienes permisos para modificar los modulos.");
        } else if (error.message === "NO_AUTH") {
          toast.error("No estas autenticado. Por favor, inicia sesion de nuevo.");
        } else {
          toast.error("No se pudo actualizar el modulo.");
        }
      } else {
        toast.error("No se pudo actualizar el modulo.");
      }
    } finally {
      setIsSaving(false);
      setPendingModule(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Disponibilidad de modulos</h3>
          <p className="text-muted-foreground text-sm">
            Controla que modulos estan disponibles para la organizacion. Si un modulo esta oculto, RRHH no lo vera en
            ajustes y se desactivara automaticamente.
          </p>
        </div>
      </Card>

      {MODULE_ITEMS.map((module) => {
        const isAvailable = availability[module.key];
        const isEnabled = enabledState[module.enabledKey];
        const Icon = module.icon;
        const isPending = isSaving && pendingModule === module.key;

        return (
          <Card key={module.key} className="rounded-lg border p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary mt-0.5 rounded-full p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{module.title}</h4>
                      <Badge variant={isAvailable ? "default" : "secondary"}>
                        {isAvailable ? "Disponible" : "Oculto"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{module.description}</p>
                    <p className="text-muted-foreground text-xs">
                      Estado operativo: {isEnabled ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isAvailable}
                  onCheckedChange={(checked) => handleToggle(module.key, checked)}
                  disabled={isSaving}
                  aria-label={`Disponibilidad de ${module.title}`}
                />
              </div>

              {!isAvailable && (
                <div className="bg-muted/50 rounded-lg border p-3 text-xs">
                  El modulo esta oculto. Para activarlo, habilitalo aqui y luego gestiona su estado en ajustes de RRHH.
                </div>
              )}

              {isPending && <p className="text-muted-foreground text-xs">Actualizando disponibilidad...</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
