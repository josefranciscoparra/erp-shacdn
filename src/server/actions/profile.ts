"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { auth, updateSession } from "@/lib/auth";
import { resolveAvatarForClient } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";
import { avatarUploadService } from "@/lib/storage/avatar-service";

// Schema de validación para actualización de perfil
const updateProfileSchema = z.object({
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  province: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyRelationship: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface ProfileData {
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    role: string;
  };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    nifNie: string;
    email: string | null;
    phone: string | null;
    mobilePhone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    province: string | null;
    country: string;
    birthDate: Date | null;
    nationality: string | null;
    photoUrl: string | null;
    employmentStatus: string;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyRelationship: string | null;
  } | null;
  activeContract: {
    id: string;
    contractType: string;
    startDate: Date;
    endDate: Date | null;
    weeklyHours: number;
    position: {
      title: string;
      level: {
        name: string;
      } | null;
    } | null;
    department: {
      name: string;
    } | null;
    costCenter: {
      name: string;
    } | null;
  } | null;
}

/**
 * Obtiene los datos del perfil del usuario autenticado
 */
export async function getProfileData(): Promise<ProfileData | null> {
  try {
    // Obtener sesión del usuario autenticado
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    // Buscar usuario con su empleado asociado
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            secondLastName: true,
            nifNie: true,
            email: true,
            phone: true,
            mobilePhone: true,
            address: true,
            city: true,
            postalCode: true,
            province: true,
            country: true,
            birthDate: true,
            nationality: true,
            photoUrl: true,
            employmentStatus: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            emergencyRelationship: true,
            updatedAt: true,
            employmentContracts: {
              where: {
                active: true,
              },
              orderBy: {
                startDate: "desc",
              },
              take: 1,
              select: {
                id: true,
                contractType: true,
                startDate: true,
                endDate: true,
                weeklyHours: true,
                position: {
                  select: {
                    title: true,
                    level: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
                department: {
                  select: {
                    name: true,
                  },
                },
                costCenter: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Formatear datos para el componente
    const activeContract = user.employee?.employmentContracts[0] ?? null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: resolveAvatarForClient(user.image, user.id, user.updatedAt.getTime()),
        role: user.role,
      },
      employee: user.employee
        ? {
            id: user.employee.id,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            secondLastName: user.employee.secondLastName,
            nifNie: user.employee.nifNie,
            email: user.employee.email,
            phone: user.employee.phone,
            mobilePhone: user.employee.mobilePhone,
            address: user.employee.address,
            city: user.employee.city,
            postalCode: user.employee.postalCode,
            province: user.employee.province,
            country: user.employee.country,
            birthDate: user.employee.birthDate,
            nationality: user.employee.nationality,
            photoUrl: resolveAvatarForClient(
              user.employee.photoUrl,
              user.id,
              user.employee.updatedAt?.getTime() ?? user.updatedAt.getTime(),
            ),
            employmentStatus: user.employee.employmentStatus,
            emergencyContactName: user.employee.emergencyContactName,
            emergencyContactPhone: user.employee.emergencyContactPhone,
            emergencyRelationship: user.employee.emergencyRelationship,
          }
        : null,
      activeContract: activeContract
        ? {
            id: activeContract.id,
            contractType: activeContract.contractType,
            startDate: activeContract.startDate,
            endDate: activeContract.endDate,
            weeklyHours: Number(activeContract.weeklyHours),
            position: activeContract.position,
            department: activeContract.department,
            costCenter: activeContract.costCenter,
          }
        : null,
    };
  } catch (error) {
    console.error("Error al obtener datos del perfil:", error);
    return null;
  }
}

/**
 * Actualiza los datos editables del perfil del empleado
 */
export async function updateProfileData(data: UpdateProfileInput): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener sesión del usuario autenticado
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    // Validar datos
    const validated = updateProfileSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, error: "Datos inválidos" };
    }

    // Buscar usuario con su empleado
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        employee: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user?.employee) {
      return { success: false, error: "Usuario no tiene empleado asociado" };
    }

    // Actualizar datos del empleado
    await prisma.employee.update({
      where: {
        id: user.employee.id,
      },
      data: {
        phone: validated.data.phone,
        mobilePhone: validated.data.mobilePhone,
        address: validated.data.address,
        city: validated.data.city,
        postalCode: validated.data.postalCode,
        province: validated.data.province,
        emergencyContactName: validated.data.emergencyContactName,
        emergencyContactPhone: validated.data.emergencyContactPhone,
        emergencyRelationship: validated.data.emergencyRelationship,
      },
    });

    // Revalidar la página para que se muestren los nuevos datos
    revalidatePath("/dashboard/me/profile");

    return { success: true };
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return { success: false, error: "Error al actualizar el perfil" };
  }
}

/**
 * Actualiza la foto de perfil del empleado
 */
export async function updateProfilePhoto(
  base64Image: string,
): Promise<{ success: boolean; error?: string; photoUrl?: string }> {
  try {
    console.log("🔵 updateProfilePhoto - INICIO");

    // Obtener sesión del usuario autenticado
    const session = await auth();
    if (!session?.user?.id) {
      console.log("❌ No hay sesión");
      return { success: false, error: "No autenticado" };
    }

    console.log("✅ Sesión válida:", session.user.id);

    // Buscar usuario con su empleado y organización
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        orgId: true,
        employee: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user?.employee) {
      console.log("❌ Usuario sin empleado asociado");
      return { success: false, error: "Usuario no tiene empleado asociado" };
    }

    console.log("✅ Usuario encontrado, orgId:", user.orgId);

    // Decodificar base64 y convertir a Buffer
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    console.log("✅ Buffer creado, tamaño:", buffer.length);

    // Detectar mime type del base64
    const mimeTypeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    console.log("✅ MIME type detectado:", mimeType);

    // Subir avatar usando el servicio (usa R2/Azure según configuración)
    console.log("⏳ Subiendo a storage...");
    const uploadedPhotoUrl = await avatarUploadService.uploadAvatar(user.orgId, user.id, buffer, mimeType);
    console.log("✅ Avatar subido, URL base:", uploadedPhotoUrl);

    // Actualizar URL de la foto en el empleado Y en el usuario
    // Esto asegura que tanto el perfil del empleado como el avatar de NextAuth se actualicen
    console.log("⏳ Actualizando BD...");
    await prisma.$transaction([
      prisma.employee.update({
        where: {
          id: user.employee.id,
        },
        data: {
          photoUrl: uploadedPhotoUrl,
        },
      }),
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          image: uploadedPhotoUrl,
        },
      }),
    ]);
    console.log("✅ BD actualizada");

    const cacheVersion = Date.now();
    const displayPhotoUrl = resolveAvatarForClient(uploadedPhotoUrl, user.id, cacheVersion) ?? uploadedPhotoUrl;
    console.log("✅ URL pública generada:", displayPhotoUrl);

    // Actualizar la sesión JWT para que refleje la nueva imagen inmediatamente
    console.log("⏳ Actualizando sesión...");
    await updateSession({
      user: {
        image: displayPhotoUrl,
      },
    });
    console.log("✅ Sesión actualizada");

    // Revalidar las páginas relevantes
    console.log("⏳ Revalidando páginas...");
    revalidatePath("/dashboard/me/profile");
    revalidatePath("/dashboard");
    console.log("✅ Páginas revalidadas");

    console.log("🎉 updateProfilePhoto - FIN EXITOSO");
    return { success: true, photoUrl: displayPhotoUrl };
  } catch (error) {
    console.error("❌ Error al actualizar foto de perfil:", error);
    return { success: false, error: "Error al subir la imagen" };
  }
}
