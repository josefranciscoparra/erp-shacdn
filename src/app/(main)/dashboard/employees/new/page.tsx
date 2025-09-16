import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo empleado</h1>
          <p className="text-muted-foreground">
            Registra un nuevo empleado en el sistema
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>
              Información básica del empleado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input id="firstName" placeholder="Nombre del empleado" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Primer apellido *</Label>
                <Input id="lastName" placeholder="Primer apellido" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondLastName">Segundo apellido</Label>
                <Input id="secondLastName" placeholder="Segundo apellido" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nifNie">NIF/NIE *</Label>
                <Input id="nifNie" placeholder="12345678Z" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="empleado@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" placeholder="+34 600 000 000" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobilePhone">Móvil</Label>
                <Input id="mobilePhone" placeholder="+34 600 000 000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                <Input id="birthDate" type="date" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">Nacionalidad</Label>
                <Input id="nationality" placeholder="Española" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">Número de empleado</Label>
                <Input id="employeeNumber" placeholder="EMP001" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dirección</CardTitle>
            <CardDescription>
              Dirección del empleado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" placeholder="Calle, número, piso..." />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" placeholder="Madrid" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Código postal</Label>
                <Input id="postalCode" placeholder="28001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" placeholder="Madrid" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos bancarios</CardTitle>
            <CardDescription>
              Información bancaria para nóminas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" placeholder="ES00 0000 0000 0000 0000 0000" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto de emergencia</CardTitle>
            <CardDescription>
              Persona a contactar en caso de emergencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Nombre</Label>
                <Input id="emergencyContactName" placeholder="Nombre del contacto" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Teléfono</Label>
                <Input id="emergencyContactPhone" placeholder="+34 600 000 000" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emergencyRelationship">Relación</Label>
              <Input id="emergencyRelationship" placeholder="Familiar, amigo, etc." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas adicionales</CardTitle>
            <CardDescription>
              Información adicional sobre el empleado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea 
                id="notes" 
                placeholder="Información adicional, observaciones, etc."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/employees">
              Cancelar
            </Link>
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Guardar empleado
          </Button>
        </div>
      </div>
    </div>
  );
}