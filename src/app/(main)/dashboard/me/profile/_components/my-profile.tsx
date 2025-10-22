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

interface MyProfileProps {
  initialData: ProfileData;
}

export function MyProfile({ initialData }: MyProfileProps) {
  const router = useRouter();
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(initialData.employee?.photoUrl ?? initialData.user.image);

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
    console.log("🔵 handleAvatarUpload - INICIO", file.name, file.size, file.type);
    try {
      // Convertir archivo a base64
      console.log("⏳ Convirtiendo a base64...");
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;
      console.log("✅ Base64 generado, tamaño:", base64Image.length);

      // Subir usando server action
      console.log("⏳ Llamando a updateProfilePhoto...");
      const result = await updateProfilePhoto(base64Image);
      console.log("✅ Respuesta recibida:", result);

      if (result.success && result.photoUrl) {
        setCurrentPhotoUrl(result.photoUrl);
        toast.success("Foto de perfil actualizada correctamente");
        console.log("🎉 Upload exitoso!");
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al actualizar la foto");
        console.error("❌ Upload falló:", result.error);
      }
    } catch (error) {
      console.error("❌ Error en upload:", error);
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
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Mail className="text-muted-foreground h-4 w-4" />
              <span className="text-sm">{initialData.user.email}</span>
            </div>

            {initialData.employee?.mobilePhone && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Phone className="text-muted-foreground h-4 w-4" />
                <span className="text-sm">{initialData.employee.mobilePhone}</span>
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Briefcase className="text-muted-foreground h-4 w-4" />
              <span className="text-sm">{department}</span>
            </div>

            {initialData.activeContract?.startDate && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <span className="text-sm">
                  Desde{" "}
                  {new Date(initialData.activeContract.startDate).toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
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
                <p className="text-sm">{initialData.employee?.phone ?? "No especificado"}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Teléfono móvil</Label>
                <p className="text-sm">{initialData.employee?.mobilePhone ?? "No especificado"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground">Dirección</Label>
              <p className="text-sm">{initialData.employee?.address ?? "No especificada"}</p>
            </div>

            <div className="grid gap-4 @md/card:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Ciudad</Label>
                <p className="text-sm">{initialData.employee?.city ?? "No especificada"}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Código postal</Label>
                <p className="text-sm">{initialData.employee?.postalCode ?? "No especificado"}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Provincia</Label>
                <p className="text-sm">{initialData.employee?.province ?? "No especificada"}</p>
              </div>
            </div>

            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Departamento</Label>
                <p className="text-sm">{department}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Puesto</Label>
                <p className="text-sm">{position}</p>
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
            <div className="flex justify-between rounded-lg border p-3">
              <span className="text-muted-foreground text-sm">Tipo de contrato</span>
              <span className="font-medium">{contractType}</span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span className="text-muted-foreground text-sm">Jornada</span>
              <span className="font-medium">{weeklyHours}</span>
            </div>
            {initialData.activeContract?.costCenter && (
              <div className="flex justify-between rounded-lg border p-3">
                <span className="text-muted-foreground text-sm">Centro</span>
                <span className="font-medium">{initialData.activeContract.costCenter.name}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Contacto de emergencia</h3>

          <div className="flex flex-col gap-3">
            {initialData.employee?.emergencyContactName ? (
              <>
                <div className="flex justify-between rounded-lg border p-3">
                  <span className="text-muted-foreground text-sm">Nombre</span>
                  <span className="font-medium">{initialData.employee.emergencyContactName}</span>
                </div>
                {initialData.employee.emergencyRelationship && (
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-muted-foreground text-sm">Relación</span>
                    <span className="font-medium">{initialData.employee.emergencyRelationship}</span>
                  </div>
                )}
                {initialData.employee.emergencyContactPhone && (
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-muted-foreground text-sm">Teléfono</span>
                    <span className="font-medium">{initialData.employee.emergencyContactPhone}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No hay contacto de emergencia registrado</p>
            )}
          </div>
        </Card>
      </div>

      {/* Preferencias de apariencia */}
      <AppearanceSettings />
    </div>
  );
}
