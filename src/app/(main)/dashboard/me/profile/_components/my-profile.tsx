"use client";

import { useState } from "react";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/hr/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MyProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "Juan",
    lastName: "Pérez García",
    email: "juan.perez@empresa.com",
    phone: "+34 612 345 678",
    address: "Calle Mayor 123, Madrid",
    department: "Desarrollo",
    position: "Senior Developer",
    startDate: "2024-06-15",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Llamar API para actualizar perfil
    setIsEditing(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mi Perfil"
        actionLabel={isEditing ? "Cancelar" : "Editar Perfil"}
        onAction={() => setIsEditing(!isEditing)}
      />

      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-3">
        {/* Información personal */}
        <Card className="@container/card flex flex-col items-center gap-4 p-6 @xl/main:col-span-1">
          <Avatar className="h-32 w-32">
            <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
            <AvatarFallback>
              {formData.firstName[0]}
              {formData.lastName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h2 className="text-2xl font-bold">
              {formData.firstName} {formData.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">{formData.position}</p>
          </div>

          {!isEditing && (
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formData.email}</span>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formData.phone}</span>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formData.department}</span>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Desde{" "}
                  {new Date(formData.startDate).toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Formulario editable */}
        <Card className="@container/card flex flex-col gap-6 p-6 @xl/main:col-span-2">
          <h3 className="text-lg font-semibold">Información personal</h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Apellidos</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  disabled={!isEditing}
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
              />
            </div>

            <div className="grid gap-4 @md/card:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="department">Departamento</Label>
                <Input id="department" value={formData.department} disabled />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="position">Puesto</Label>
                <Input id="position" value={formData.position} disabled />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <Input id="startDate" type="date" value={formData.startDate} disabled />
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
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
              <span className="text-sm text-muted-foreground">Tipo de contrato</span>
              <span className="font-medium">Indefinido</span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Jornada</span>
              <span className="font-medium">Completa (40h/semana)</span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Modalidad</span>
              <span className="font-medium">Híbrido</span>
            </div>
          </div>
        </Card>

        <Card className="@container/card flex flex-col gap-4 p-6">
          <h3 className="text-lg font-semibold">Contacto de emergencia</h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="font-medium">María Pérez</span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Relación</span>
              <span className="font-medium">Hermana</span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Teléfono</span>
              <span className="font-medium">+34 698 765 432</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
