"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Mail, Phone, Briefcase, Calendar } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updateProfilePhoto, type ProfileData } from "@/server/actions/profile";

import { AppearanceSettings } from "./appearance-settings";
import { SecuritySettings } from "./security-settings";

interface MyProfileProps {
  initialData: ProfileData;
}

export function MyProfile({ initialData }: MyProfileProps) {
  const router = useRouter();
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(initialData.employee?.photoUrl ?? initialData.user.image);

  const infoValueClass =
    "flex min-h-[2.5rem] flex-1 items-center rounded-md border border-border bg-background/70 px-3 py-2 text-sm font-medium text-foreground shadow-xs";
  const summaryRowClass =
    "flex items-center justify-between rounded-lg border border-border bg-background/80 p-3 text-sm text-foreground shadow-xs";

  // Datos calculados
  const fullName = initialData.employee
    ? `${initialData.employee.firstName} ${initialData.employee.lastName}${
        initialData.employee.secondLastName ? ` ${initialData.employee.secondLastName}` : ""
      }`
    : initialData.user.name;

  const initials = initialData.employee
    ? `${initialData.employee.firstName[0]}${initialData.employee.lastName[0]}`
    : initialData.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();

  const position = initialData.activeContract?.position
    ? initialData.activeContract.position.level
      ? `${initialData.activeContract.position.level.name} ${initialData.activeContract.position.title}`
      : initialData.activeContract.position.title
    : "Sin puesto asignado";

  const department = initialData.activeContract?.department?.name ?? "Sin departamento";

  const contractTypeLabels: Record<string, string> = {
    INDEFINIDO: "Indefinido",
    TEMPORAL: "Temporal",
    PRACTICAS: "Prácticas",
    FORMACION: "Formación",
    OBRA_SERVICIO: "Obra o servicio",
  };

  const contractType = initialData.activeContract
    ? contractTypeLabels[initialData.activeContract.contractType] || initialData.activeContract.contractType
    : "Sin contrato";

  const weeklyHours = initialData.activeContract ? `${initialData.activeContract.weeklyHours}h/semana` : "No definido";

  const handleAvatarUpload = async (file: File) => {
    try {
      // Convertir archivo a base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;

      // Subir usando server action
      const result = await updateProfilePhoto(base64Image);

      if (result.success && result.photoUrl) {
        setCurrentPhotoUrl(result.photoUrl);
        toast.success("Foto de perfil actualizada correctamente");
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al actualizar la foto");
      }
    } catch (error) {
      console.error("Error al procesar imagen de perfil:", error);
      toast.error("Error al procesar la imagen");
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Mi Perfil" />

      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-3">
        {/* Información personal */}
        <Card className="@container/card flex flex-col items-center gap-4 p-6 @xl/main:col-span-1">
          <AvatarUpload currentPhotoUrl={currentPhotoUrl} fallback={initials} onUpload={handleAvatarUpload} />

          <div className="text-center">
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <p className="text-muted-foreground text-sm">{position}</p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <div className="flex items-start gap-3">
              <Mail className="text-muted-foreground mt-2 h-4 w-4" />
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-muted-foreground text-xs tracking-wide uppercase">Correo electrónico</span>
                <span className={infoValueClass}>{initialData.user.email}</span>
              </div>
            </div>

            {initialData.employee?.mobilePhone && (
              <div className="flex items-start gap-3">
                <Phone className="text-muted-foreground mt-2 h-4 w-4" />
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-muted-foreground text-xs tracking-wide uppercase">Teléfono móvil</span>
                  <span className={infoValueClass}>{initialData.employee.mobilePhone}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Briefcase className="text-muted-foreground mt-2 h-4 w-4" />
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-muted-foreground text-xs tracking-wide uppercase">Departamento</span>
                <span className={infoValueClass}>{department}</span>
              </div>
            </div>

            {initialData.activeContract?.startDate && (
              <div className="flex items-start gap-3">
                <Calendar className="text-muted-foreground mt-2 h-4 w-4" />
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-muted-foreground text-xs tracking-wide uppercase">Desde</span>
                  <span className={infoValueClass}>
                    {new Date(initialData.activeContract.startDate).toLocaleDateString("es-ES", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Información de contacto */}
        <Card className="@container/card flex flex-col gap-6 p-6 @xl/main:col-span-2">
          <h3 className="text-lg font-semibold">Información de contacto</h3>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Teléfono fijo</Label>
                <span className={infoValueClass}>{initialData.employee?.phone ?? "No especificado"}</span>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Teléfono móvil</Label>
                <span className={infoValueClass}>{initialData.employee?.mobilePhone ?? "No especificado"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground">Dirección</Label>
              <span className={infoValueClass}>{initialData.employee?.address ?? "No especificada"}</span>
            </div>

            <div className="grid gap-4 @md/card:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Ciudad</Label>
                <span className={infoValueClass}>{initialData.employee?.city ?? "No especificada"}</span>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Código postal</Label>
                <span className={infoValueClass}>{initialData.employee?.postalCode ?? "No especificado"}</span>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Provincia</Label>
                <span className={infoValueClass}>{initialData.employee?.province ?? "No especificada"}</span>
              </div>
            </div>

            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Departamento</Label>
                <span className={infoValueClass}>{department}</span>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Puesto</Label>
                <span className={infoValueClass}>{position}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Información adicional */}
      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-2">
        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Información laboral</h3>
          <div className="flex flex-col gap-3">
            <div className={summaryRowClass}>
              <span className="text-muted-foreground text-sm">Tipo de contrato</span>
              <span className="text-foreground font-medium">{contractType}</span>
            </div>
            <div className={summaryRowClass}>
              <span className="text-muted-foreground text-sm">Jornada</span>
              <span className="text-foreground font-medium">{weeklyHours}</span>
            </div>
            {initialData.activeContract?.costCenter && (
              <div className={summaryRowClass}>
                <span className="text-muted-foreground text-sm">Centro</span>
                <span className="text-foreground font-medium">{initialData.activeContract.costCenter.name}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Contacto de emergencia</h3>

          <div className="flex flex-col gap-3">
            {initialData.employee?.emergencyContactName ? (
              <>
                <div className={summaryRowClass}>
                  <span className="text-muted-foreground text-sm">Nombre</span>
                  <span className="text-foreground font-medium">{initialData.employee.emergencyContactName}</span>
                </div>
                {initialData.employee.emergencyRelationship && (
                  <div className={summaryRowClass}>
                    <span className="text-muted-foreground text-sm">Relación</span>
                    <span className="text-foreground font-medium">{initialData.employee.emergencyRelationship}</span>
                  </div>
                )}
                {initialData.employee.emergencyContactPhone && (
                  <div className={summaryRowClass}>
                    <span className="text-muted-foreground text-sm">Teléfono</span>
                    <span className="text-foreground font-medium">{initialData.employee.emergencyContactPhone}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No hay contacto de emergencia registrado</p>
            )}
          </div>
        </Card>
      </div>

      {/* Seguridad */}
      <SecuritySettings />

      {/* Preferencias de apariencia */}
      <AppearanceSettings />
    </div>
  );
}
