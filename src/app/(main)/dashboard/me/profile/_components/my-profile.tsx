"use client";

import { useState } from "react";

import { User, Mail, Phone, MapPin, Briefcase, Calendar, Save } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/hr/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileData, type ProfileData } from "@/server/actions/profile";

import { AppearanceSettings } from "./appearance-settings";

interface MyProfileProps {
  initialData: ProfileData;
}

export function MyProfile({ initialData }: MyProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    phone: initialData.employee?.phone ?? "",
    mobilePhone: initialData.employee?.mobilePhone ?? "",
    address: initialData.employee?.address ?? "",
    city: initialData.employee?.city ?? "",
    postalCode: initialData.employee?.postalCode ?? "",
    province: initialData.employee?.province ?? "",
    emergencyContactName: initialData.employee?.emergencyContactName ?? "",
    emergencyContactPhone: initialData.employee?.emergencyContactPhone ?? "",
    emergencyRelationship: initialData.employee?.emergencyRelationship ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateProfileData(formData);

      if (result.success) {
        toast.success("Perfil actualizado", {
          description: "Tus datos se han actualizado correctamente.",
        });
        setIsEditing(false);
      } else {
        toast.error("Error", {
          description: result.error ?? "No se pudo actualizar el perfil.",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Ocurrió un error al actualizar el perfil.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    // Resetear datos al cancelar
    setFormData({
      phone: initialData.employee?.phone ?? "",
      mobilePhone: initialData.employee?.mobilePhone ?? "",
      address: initialData.employee?.address ?? "",
      city: initialData.employee?.city ?? "",
      postalCode: initialData.employee?.postalCode ?? "",
      province: initialData.employee?.province ?? "",
      emergencyContactName: initialData.employee?.emergencyContactName ?? "",
      emergencyContactPhone: initialData.employee?.emergencyContactPhone ?? "",
      emergencyRelationship: initialData.employee?.emergencyRelationship ?? "",
    });
    setIsEditing(false);
  };

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

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Mi Perfil" actionLabel={isEditing ? "Cancelar" : "Editar Perfil"} onAction={handleCancel} />

      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-3">
        {/* Información personal */}
        <Card className="@container/card flex flex-col items-center gap-4 p-6 @xl/main:col-span-1">
          <Avatar className="h-32 w-32">
            <AvatarImage src={initialData.employee?.photoUrl ?? initialData.user.image ?? undefined} alt="Avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <p className="text-muted-foreground text-sm">{position}</p>
          </div>

          {!isEditing && (
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Mail className="text-muted-foreground h-4 w-4" />
                <span className="text-sm">{initialData.user.email}</span>
              </div>

              {formData.mobilePhone && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">{formData.mobilePhone}</span>
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
          )}
        </Card>

        {/* Formulario editable */}
        <Card className="@container/card flex flex-col gap-6 p-6 @xl/main:col-span-2">
          <h3 className="text-lg font-semibold">Información de contacto</h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Teléfono fijo</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Teléfono fijo"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="mobilePhone">Teléfono móvil</Label>
                <Input
                  id="mobilePhone"
                  type="tel"
                  value={formData.mobilePhone}
                  onChange={(e) => handleChange("mobilePhone", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Teléfono móvil"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                disabled={!isEditing}
                placeholder="Dirección completa"
              />
            </div>

            <div className="grid gap-4 @md/card:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Ciudad"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="postalCode">Código postal</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  disabled={!isEditing}
                  placeholder="CP"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Provincia"
                />
              </div>
            </div>

            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="department">Departamento</Label>
                <Input id="department" value={department} disabled />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="position">Puesto</Label>
                <Input id="position" value={position} disabled />
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            )}
          </form>
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Contacto de emergencia</h3>
            {isEditing && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Focus en el primer campo de emergencia
                  document.getElementById("emergencyContactName")?.focus();
                }}
              >
                Editar
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="emergencyContactName">Nombre</Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange("emergencyContactName", e.target.value)}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emergencyRelationship">Relación</Label>
                <Input
                  id="emergencyRelationship"
                  value={formData.emergencyRelationship}
                  onChange={(e) => handleChange("emergencyRelationship", e.target.value)}
                  placeholder="Ej: Hermana, Padre, etc."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emergencyContactPhone">Teléfono</Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleChange("emergencyContactPhone", e.target.value)}
                  placeholder="Teléfono de contacto"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {formData.emergencyContactName ? (
                <>
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-muted-foreground text-sm">Nombre</span>
                    <span className="font-medium">{formData.emergencyContactName}</span>
                  </div>
                  {formData.emergencyRelationship && (
                    <div className="flex justify-between rounded-lg border p-3">
                      <span className="text-muted-foreground text-sm">Relación</span>
                      <span className="font-medium">{formData.emergencyRelationship}</span>
                    </div>
                  )}
                  {formData.emergencyContactPhone && (
                    <div className="flex justify-between rounded-lg border p-3">
                      <span className="text-muted-foreground text-sm">Teléfono</span>
                      <span className="font-medium">{formData.emergencyContactPhone}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No hay contacto de emergencia registrado</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Preferencias de apariencia */}
      <AppearanceSettings />
    </div>
  );
}
