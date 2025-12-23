"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { CONSENT_VERSION } from "@/lib/geolocation/consent";
import { calculateDistance, findNearestCenter } from "@/lib/geolocation/haversine";
import { validateGeolocationData } from "@/lib/geolocation/validators";
import { getModuleAvailability } from "@/lib/organization-modules";
import { prisma } from "@/lib/prisma";

import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

/**
 * Verifica si el usuario tiene consentimiento activo de geolocalización
 */
export async function checkGeolocationConsent() {
  try {
    const { userId, orgId } = await getAuthenticatedEmployee();

    const consent = await prisma.geolocationConsent.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    return {
      hasConsent: consent !== null && consent.active,
      consent,
    };
  } catch (error) {
    console.error("Error al verificar consentimiento:", error);
    throw error;
  }
}

/**
 * Guarda el consentimiento de geolocalización del usuario
 */
export async function saveGeolocationConsent() {
  try {
    const { userId, orgId } = await getAuthenticatedEmployee();

    // Obtener IP del cliente
    const headersList = headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0] ?? realIp ?? "unknown";

    // Crear o actualizar consentimiento
    const consent = await prisma.geolocationConsent.upsert({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
      create: {
        userId,
        orgId,
        consentVersion: CONSENT_VERSION,
        ipAddress,
        active: true,
      },
      update: {
        consentVersion: CONSENT_VERSION,
        ipAddress,
        active: true,
        consentGivenAt: new Date(), // Renovar fecha
      },
    });

    return { success: true, consent };
  } catch (error) {
    console.error("Error al guardar consentimiento:", error);
    throw error;
  }
}

/**
 * Revoca el consentimiento de geolocalización del usuario
 */
export async function revokeGeolocationConsent() {
  try {
    const { userId, orgId } = await getAuthenticatedEmployee();

    await prisma.geolocationConsent.update({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
      data: {
        active: false,
      },
    });

    return { success: true, message: "Consentimiento revocado correctamente" };
  } catch (error) {
    console.error("Error al revocar consentimiento:", error);
    throw error;
  }
}

/**
 * Obtiene la configuración de geolocalización de la organización
 */
export async function getOrganizationGeolocationConfig() {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: {
        geolocationEnabled: true,
        geolocationRequired: true,
        geolocationMinAccuracy: true,
        geolocationMaxRadius: true,
      },
    });

    if (!org) {
      throw new Error("Organización no encontrada");
    }

    return org;
  } catch (error) {
    console.error("Error al obtener configuración de geolocalización:", error);
    throw error;
  }
}

/**
 * Obtiene todos los centros de trabajo con ubicación configurada
 */
export async function getCostCentersWithLocation() {
  try {
    const { orgId } = await getAuthenticatedEmployee();

    const costCenters = await prisma.costCenter.findMany({
      where: {
        orgId,
        active: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        latitude: true,
        longitude: true,
        allowedRadiusMeters: true,
      },
    });

    return costCenters;
  } catch (error) {
    console.error("Error al obtener centros con ubicación:", error);
    throw error;
  }
}

/**
 * Valida los datos de geolocalización y determina si el fichaje requiere revisión
 *
 * @param latitude - Latitud del fichaje
 * @param longitude - Longitud del fichaje
 * @param accuracy - Precisión GPS en metros
 * @returns Datos de validación incluyendo centro más cercano y si está dentro del área
 */
export async function validateClockLocation(latitude: number, longitude: number, accuracy: number) {
  try {
    const { orgId } = await getAuthenticatedEmployee();

    // Validar datos GPS
    const validation = validateGeolocationData(latitude, longitude, accuracy);
    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.error,
      };
    }

    // Obtener configuración de la organización
    const orgConfig = await getOrganizationGeolocationConfig();

    // Obtener centros con ubicación
    const costCenters = await getCostCentersWithLocation();

    // Si no hay centros configurados, permitir fichaje sin validación
    if (costCenters.length === 0) {
      return {
        isValid: true,
        isWithinAllowedArea: null,
        requiresReview: false,
        nearestCenter: null,
        distance: null,
        message: "No hay centros de trabajo configurados",
      };
    }

    // Encontrar el centro más cercano
    const nearest = findNearestCenter({ latitude, longitude }, costCenters as any[]);

    if (!nearest) {
      return {
        isValid: true,
        isWithinAllowedArea: null,
        requiresReview: false,
        nearestCenter: null,
        distance: null,
        message: "No se pudo determinar el centro más cercano",
      };
    }

    // Determinar el radio permitido (del centro o de la org)
    const allowedRadius = nearest.center.allowedRadiusMeters ?? orgConfig.geolocationMaxRadius;

    // Verificar si está dentro del área
    const isWithinAllowedArea = nearest.distance <= allowedRadius;
    const requiresReview = !isWithinAllowedArea;

    return {
      isValid: true,
      isWithinAllowedArea,
      requiresReview,
      nearestCenter: nearest.center,
      distance: nearest.distance,
      allowedRadius,
      message: isWithinAllowedArea
        ? `Fichaje dentro del área permitida (${Math.round(nearest.distance)}m del centro)`
        : `Fichaje fuera del área permitida (${Math.round(nearest.distance)}m del centro, máximo ${allowedRadius}m)`,
    };
  } catch (error) {
    console.error("Error al validar ubicación de fichaje:", error);
    throw error;
  }
}

/**
 * Obtiene fichajes que requieren revisión (fuera de área)
 */
export async function getEntriesRequiringReview(filters?: { startDate?: Date; endDate?: Date; employeeId?: string }) {
  try {
    const { orgId } = await getAuthenticatedEmployee();

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        orgId,
        requiresReview: true,
        ...(filters?.startDate && {
          timestamp: {
            gte: filters.startDate,
          },
        }),
        ...(filters?.endDate && {
          timestamp: {
            lte: filters.endDate,
          },
        }),
        ...(filters?.employeeId && {
          employeeId: filters.employeeId,
        }),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    return timeEntries;
  } catch (error) {
    console.error("Error al obtener fichajes para revisión:", error);
    throw error;
  }
}

/**
 * Aprueba un fichaje que estaba fuera de área
 */
export async function approveGeolocationEntry(entryId: string) {
  try {
    const { orgId } = await getAuthenticatedEmployee();

    const entry = await prisma.timeEntry.update({
      where: {
        id: entryId,
        orgId,
      },
      data: {
        requiresReview: false,
      },
    });

    return { success: true, entry };
  } catch (error) {
    console.error("Error al aprobar fichaje:", error);
    throw error;
  }
}

/**
 * Aprueba múltiples fichajes a la vez
 */
export async function approveMultipleEntries(entryIds: string[]) {
  try {
    const { orgId } = await getAuthenticatedEmployee();

    await prisma.timeEntry.updateMany({
      where: {
        id: { in: entryIds },
        orgId,
      },
      data: {
        requiresReview: false,
      },
    });

    return { success: true, count: entryIds.length };
  } catch (error) {
    console.error("Error al aprobar fichajes múltiples:", error);
    throw error;
  }
}

/**
 * Actualiza el estado de geolocalización de la organización
 * Solo usuarios con permiso manage_organization pueden ejecutar esta acción
 */
export async function updateOrganizationGeolocationStatus(enabled: boolean) {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { features: true },
    });

    if (!org) {
      throw new Error("ORG_NOT_FOUND");
    }

    const availability = getModuleAvailability(org.features);
    if (!availability.geolocation) {
      throw new Error("MODULE_DISABLED");
    }

    const organization = await prisma.organization.update({
      where: { id: session.user.orgId },
      data: { geolocationEnabled: enabled },
      select: {
        id: true,
        name: true,
        geolocationEnabled: true,
      },
    });

    return { success: true, organization };
  } catch (error) {
    console.error("Error al actualizar estado de geolocalización:", error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de geolocalización de la organización
 */
export async function getGeolocationStats() {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    const [totalEntries, entriesWithGPS, entriesRequiringReview, totalConsents] = await Promise.all([
      // Total de fichajes
      prisma.timeEntry.count({
        where: { orgId: session.user.orgId },
      }),

      // Fichajes con GPS
      prisma.timeEntry.count({
        where: {
          orgId: session.user.orgId,
          latitude: { not: null },
        },
      }),

      // Fichajes que requieren revisión
      prisma.timeEntry.count({
        where: {
          orgId: session.user.orgId,
          requiresReview: true,
        },
      }),

      // Total de consentimientos activos
      prisma.geolocationConsent.count({
        where: {
          orgId: session.user.orgId,
          active: true,
        },
      }),
    ]);

    const gpsPercentage = totalEntries > 0 ? ((entriesWithGPS / totalEntries) * 100).toFixed(1) : "0";

    return {
      totalEntries,
      entriesWithGPS,
      entriesRequiringReview,
      totalConsents,
      gpsPercentage,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de geolocalización:", error);
    throw error;
  }
}
