"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations/employee";
import { useEmployeesStore } from "@/stores/employees-store";

export default function NewEmployeePage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { fetchEmployees } = useEmployeesStore();

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      secondLastName: "",
      nifNie: "",
      email: "",
      phone: "",
      mobilePhone: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
      birthDate: "",
      nationality: "",
      employeeNumber: "",
      iban: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyRelationship: "",
      notes: "",
    },
  });

  const onSubmit = async (data: CreateEmployeeInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear empleado");
      }

      toast.success("Empleado creado exitosamente", {
        description: result.userCreated
          ? `Usuario creado con contraseña temporal: ${result.temporaryPassword}`
          : "Empleado registrado sin usuario de acceso",
      });

      // Refrescar lista de empleados
      await fetchEmployees();

      // Redirigir a la lista
      router.push("/dashboard/employees");
    } catch (error) {
      toast.error("Error al crear empleado", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Nuevo empleado</h1>
          <p className="text-muted-foreground text-sm">Registra un nuevo empleado en el sistema</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:gap-6">
          <Card className="bg-card rounded-lg border">
            <CardHeader>
              <CardTitle>Datos personales</CardTitle>
              <CardDescription>Información básica del empleado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del empleado"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primer apellido *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Primer apellido"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="secondLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segundo apellido</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Segundo apellido"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nifNie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIF/NIE *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12345678Z"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="empleado@empresa.com"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+34 600 000 000"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="mobilePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Móvil</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+34 600 000 000"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" className="placeholder:text-muted-foreground/50 bg-white" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nacionalidad</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Española"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employeeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de empleado</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="EMP001"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-lg border">
            <CardHeader>
              <CardTitle>Dirección</CardTitle>
              <CardDescription>Dirección del empleado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Calle, número, piso..."
                        className="placeholder:text-muted-foreground/50 bg-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Madrid"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código postal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="28001"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Madrid"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-lg border">
            <CardHeader>
              <CardTitle>Datos bancarios</CardTitle>
              <CardDescription>Información bancaria para nóminas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ES00 0000 0000 0000 0000 0000"
                        className="placeholder:text-muted-foreground/50 bg-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-card rounded-lg border">
            <CardHeader>
              <CardTitle>Contacto de emergencia</CardTitle>
              <CardDescription>Persona a contactar en caso de emergencia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del contacto"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+34 600 000 000"
                          className="placeholder:text-muted-foreground/50 bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="emergencyRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relación</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Familiar, amigo, etc."
                        className="placeholder:text-muted-foreground/50 bg-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-card rounded-lg border">
            <CardHeader>
              <CardTitle>Notas adicionales</CardTitle>
              <CardDescription>Información adicional sobre el empleado</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Información adicional, observaciones, etc."
                        rows={4}
                        className="placeholder:text-muted-foreground/50 bg-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/employees">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isLoading ? "Guardando..." : "Guardar empleado"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
