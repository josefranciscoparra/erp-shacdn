"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Role } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUserAdminSchema, type CreateUserAdminInput } from "@/validators/user";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  allowedRoles: Role[];
}

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Org",
  HR_ADMIN: "Admin RRHH",
  HR_ASSISTANT: "Asistente RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

export function CreateUserDialog({ open, onOpenChange, onUserCreated, allowedRoles }: CreateUserDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [creationResult, setCreationResult] = React.useState<{
    temporaryPassword?: string;
    inviteEmailSent?: boolean;
    inviteEmailRequested?: boolean;
    inviteEmailQueued?: boolean;
    userEmail?: string;
  } | null>(null);

  const form = useForm<CreateUserAdminInput>({
    resolver: zodResolver(createUserAdminSchema),
    defaultValues: {
      email: "",
      role: "HR_ADMIN",
      sendInvite: false,
      isEmployee: false,
      name: "",
      // Campos de empleado empiezan como undefined
      firstName: undefined,
      lastName: undefined,
      secondLastName: undefined,
      nifNie: undefined,
      phone: undefined,
      mobilePhone: undefined,
    },
  });

  // Watch isEmployee para cambiar la UI
  const isEmployee = form.watch("isEmployee");
  const sendInvite = form.watch("sendInvite");

  // Estado para mostrar errores generales
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Limpiar campos según el modo cuando cambia isEmployee
  React.useEffect(() => {
    if (isEmployee) {
      // Modo empleado: limpiar campo name (poner undefined)
      form.setValue("name", undefined as any);
      form.clearErrors("name");
    } else {
      // Modo simple: limpiar campos de empleado (poner undefined)
      form.setValue("firstName", undefined as any);
      form.setValue("lastName", undefined as any);
      form.setValue("secondLastName", undefined as any);
      form.setValue("nifNie", undefined as any);
      form.setValue("phone", undefined as any);
      form.setValue("mobilePhone", undefined as any);
      form.clearErrors(["firstName", "lastName", "nifNie", "phone", "mobilePhone"]);
    }
  }, [isEmployee, form]);

  async function onSubmit(values: CreateUserAdminInput) {
    setGeneralError(null); // Limpiar error anterior
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          ...values,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Si hay errores de validación del servidor, mostrarlos en los campos
        if (data.details && Array.isArray(data.details)) {
          data.details.forEach((error: any) => {
            if (error.path && error.path.length > 0) {
              form.setError(error.path[0], {
                type: "server",
                message: error.message,
              });
            }
          });
        }
        throw new Error(data.error ?? "Error al crear usuario");
      }

      const createdUser = data.user as { email?: string } | undefined;
      const createdEmail = createdUser && createdUser.email ? createdUser.email : values.email;
      setCreationResult({
        temporaryPassword: data.temporaryPassword ?? undefined,
        inviteEmailSent: data.inviteEmailSent ?? false,
        inviteEmailRequested: data.inviteEmailRequested ?? values.sendInvite,
        inviteEmailQueued: data.inviteEmailQueued ?? false,
        userEmail: createdEmail,
      });
      form.reset({
        email: "",
        role: "HR_ADMIN",
        sendInvite,
        isEmployee: false,
        name: "",
        firstName: undefined,
        lastName: undefined,
        secondLastName: undefined,
        nifNie: undefined,
        phone: undefined,
        mobilePhone: undefined,
      });
      onUserCreated();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear usuario";
      setGeneralError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      form.reset();
      setCreationResult(null);
      setGeneralError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear usuario administrativo</DialogTitle>
          <DialogDescription>
            Completa la información para crear un usuario ORG_ADMIN, HR_ADMIN o HR_ASSISTANT
          </DialogDescription>
        </DialogHeader>

        {creationResult ? (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-foreground mb-2 text-sm font-medium">Usuario creado exitosamente</p>

              {creationResult.inviteEmailRequested && (
                <div className="mb-4">
                  {creationResult.inviteEmailSent ? (
                    creationResult.inviteEmailQueued ? (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                        Invitación en cola para {creationResult.userEmail ?? "el email indicado"}. El correo se enviará
                        en unos minutos.
                      </div>
                    ) : (
                      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
                        Invitación enviada a {creationResult.userEmail ?? "el email indicado"}. El usuario podrá crear
                        su contraseña desde el enlace recibido.
                      </div>
                    )
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      No se pudo enviar la invitación por email. Comparte la contraseña temporal con el usuario.
                    </div>
                  )}
                </div>
              )}

              {creationResult.temporaryPassword ? (
                <>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Se ha generado una contraseña temporal para el usuario. Por favor, compártela de forma segura.
                  </p>
                  <div className="bg-background rounded border p-3">
                    <p className="text-muted-foreground mb-1 text-xs">Contraseña temporal:</p>
                    <p className="font-mono text-sm font-semibold">{creationResult.temporaryPassword}</p>
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs">
                    Esta contraseña expirará en 7 días. El usuario deberá cambiarla en su primer inicio de sesión.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  El usuario debe completar el alta desde el enlace recibido en su correo.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Entendido</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Mensaje de error general */}
              {generalError && (
                <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-md border p-3">
                  <p className="text-sm font-medium">Error al crear usuario</p>
                  <p className="text-sm">{generalError}</p>
                </div>
              )}

              {/* Rol */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol administrativo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allowedRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_DISPLAY_NAMES[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Define los permisos y accesos del usuario</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@empresa.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormDescription>Este email será usado para iniciar sesión</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkbox: Enviar invitación */}
              <FormField
                control={form.control}
                name="sendInvite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enviar invitación por email</FormLabel>
                      <FormDescription>
                        Si activas esta opción, se enviará un enlace para que el usuario cree su contraseña.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Checkbox: ¿Es empleado? */}
              <FormField
                control={form.control}
                name="isEmployee"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>¿Es empleado de la empresa?</FormLabel>
                      <FormDescription>Si el usuario también es empleado, se creará su perfil de RRHH</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Campos condicionales */}
              {!isEmployee ? (
                // Modo simple: solo nombre completo
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Juan Pérez García"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                // Modo empleado: campos completos
                <div className="space-y-4 border-t pt-4">
                  <p className="text-muted-foreground text-sm font-medium">Datos del empleado</p>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre *</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan" {...field} value={field.value ?? ""} disabled={isLoading} />
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
                            <Input placeholder="Pérez" {...field} value={field.value ?? ""} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="secondLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segundo apellido</FormLabel>
                        <FormControl>
                          <Input placeholder="García" {...field} value={field.value ?? ""} disabled={isLoading} />
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
                          <Input placeholder="12345678Z" {...field} value={field.value ?? ""} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+34 600 000 000"
                              {...field}
                              value={field.value ?? ""}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobilePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Móvil</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+34 600 000 000"
                              {...field}
                              value={field.value ?? ""}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear usuario
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
