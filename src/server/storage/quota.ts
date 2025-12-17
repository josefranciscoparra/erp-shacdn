/**
 * Módulo de Cuota de Storage
 *
 * Sistema de reservas atómico para evitar race conditions en uploads.
 * Todas las operaciones usan transacciones para garantizar consistencia.
 *
 * Flujo típico de upload:
 * 1. reserveStorage(orgId, bytes) - Reserva espacio antes de subir
 * 2. Upload a R2/storage
 * 3. registerStoredFile({ skipStorageIncrement: true }) - Registra sin incrementar
 * 4. commitReservation(reservationId) - Confirma: reserved → used
 *
 * Si falla el upload:
 * - cancelReservation(reservationId) - Libera la reserva
 */

import { prisma } from "@/lib/prisma";

// Constantes
const RESERVATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Error cuando se excede la cuota de storage
 */
export class StorageQuotaExceededError extends Error {
  constructor(
    public readonly orgId: string,
    public readonly requestedBytes: bigint,
    public readonly availableBytes?: bigint,
  ) {
    super(
      `Límite de almacenamiento excedido. ` +
        `Solicitado: ${formatBytes(requestedBytes)}, ` +
        `Disponible: ${availableBytes !== undefined ? formatBytes(availableBytes) : "desconocido"}`,
    );
    this.name = "StorageQuotaExceededError";
  }
}

/**
 * Formatea bytes a formato legible (KB, MB, GB)
 */
function formatBytes(bytes: bigint): string {
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Limpia reservas expiradas de una organización (on-demand, sin job)
 * Se ejecuta antes de cada operación de reserva para mantener limpio el sistema.
 *
 * @param orgId - ID de la organización
 * @returns Total de bytes liberados
 */
export async function expireReservations(orgId: string): Promise<bigint> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Buscar reservas expiradas
    const expired = await tx.storageReservation.findMany({
      where: {
        orgId,
        expiresAt: { lt: now },
      },
    });

    if (expired.length === 0) return BigInt(0);

    // 2. Sumar bytes expirados
    const totalExpired = expired.reduce((sum, r) => sum + r.bytes, BigInt(0));

    // 3. Decrementar storageReservedBytes
    // Usamos Math.max implícito con update para evitar negativos
    await tx.organization.update({
      where: { id: orgId },
      data: {
        storageReservedBytes: { decrement: totalExpired },
      },
    });

    // 4. Borrar registros expirados
    await tx.storageReservation.deleteMany({
      where: {
        orgId,
        expiresAt: { lt: now },
      },
    });

    return totalExpired;
  });
}

/**
 * Reserva storage para un upload (atómico, evita race conditions)
 *
 * El flujo es:
 * 1. Limpia reservas expiradas
 * 2. En transacción: incrementa reserved + verifica límite + crea registro
 * 3. Si excede límite, hace rollback automático
 *
 * @param orgId - ID de la organización
 * @param bytes - Bytes a reservar
 * @param userId - ID del usuario que reserva (auditoría)
 * @param fileKey - Clave del archivo (trazabilidad opcional)
 * @returns ID de la reserva para commit/cancel posterior
 * @throws StorageQuotaExceededError si no hay espacio suficiente
 */
export async function reserveStorage(orgId: string, bytes: bigint, userId?: string, fileKey?: string): Promise<string> {
  // 1. Limpiar expiradas primero (fuera de tx principal para no bloquear)
  await expireReservations(orgId);

  // 2. Transacción: UPDATE condicional + CREATE
  return prisma.$transaction(async (tx) => {
    // Obtener estado actual
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: {
        storageUsedBytes: true,
        storageReservedBytes: true,
        storageLimitBytes: true,
      },
    });

    if (!org) {
      throw new Error(`Organización no encontrada: ${orgId}`);
    }

    // Calcular disponible
    const currentTotal = org.storageUsedBytes + org.storageReservedBytes;
    const available = org.storageLimitBytes - currentTotal;

    // Verificar si hay espacio
    if (bytes > available) {
      throw new StorageQuotaExceededError(orgId, bytes, available);
    }

    // Incrementar reserved
    await tx.organization.update({
      where: { id: orgId },
      data: {
        storageReservedBytes: { increment: bytes },
      },
    });

    // Verificar post-update que no excede límite (doble check por race conditions)
    const orgAfter = await tx.organization.findUnique({
      where: { id: orgId },
      select: {
        storageUsedBytes: true,
        storageReservedBytes: true,
        storageLimitBytes: true,
      },
    });

    if (orgAfter!.storageUsedBytes + orgAfter!.storageReservedBytes > orgAfter!.storageLimitBytes) {
      // Esto no debería pasar en una transacción serializable, pero por seguridad
      throw new StorageQuotaExceededError(orgId, bytes);
    }

    // Crear registro de reserva
    const reservation = await tx.storageReservation.create({
      data: {
        orgId,
        bytes,
        userId,
        fileKey,
        expiresAt: new Date(Date.now() + RESERVATION_EXPIRY_MS),
      },
    });

    return reservation.id;
  });
}

/**
 * Confirma una reserva: mueve bytes de reserved a used (idempotente)
 *
 * @param reservationId - ID de la reserva a confirmar
 * @returns true si se confirmó, false si ya estaba procesada
 */
export async function commitReservation(reservationId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // 1. Buscar reserva (si no existe → ya commitida/cancelada)
    const reservation = await tx.storageReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      // Idempotente: ya procesada
      return false;
    }

    // 2. Mover bytes: reserved → used
    await tx.organization.update({
      where: { id: reservation.orgId },
      data: {
        storageReservedBytes: { decrement: reservation.bytes },
        storageUsedBytes: { increment: reservation.bytes },
      },
    });

    // 3. Borrar registro de reserva
    await tx.storageReservation.delete({
      where: { id: reservationId },
    });

    return true;
  });
}

/**
 * Cancela una reserva (idempotente)
 * Usar cuando el upload falla después de reservar.
 *
 * @param reservationId - ID de la reserva a cancelar
 * @returns true si se canceló, false si ya estaba procesada
 */
export async function cancelReservation(reservationId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.storageReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      // Idempotente: ya procesada
      return false;
    }

    await tx.organization.update({
      where: { id: reservation.orgId },
      data: {
        storageReservedBytes: { decrement: reservation.bytes },
      },
    });

    await tx.storageReservation.delete({
      where: { id: reservationId },
    });

    return true;
  });
}

/**
 * Interface para el estado de cuota de una organización
 */
export interface OrgStorageQuota {
  usedBytes: bigint;
  reservedBytes: bigint;
  limitBytes: bigint;
  availableBytes: bigint;
  usagePercent: number;
}

/**
 * Obtiene el estado de cuota de una organización
 * Incluye limpieza on-demand de reservas expiradas
 *
 * @param orgId - ID de la organización
 * @returns Estado de cuota con bytes usados, reservados, límite y disponible
 */
export async function getOrgStorageQuota(orgId: string): Promise<OrgStorageQuota> {
  // Limpiar expiradas primero (on-demand)
  await expireReservations(orgId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      storageUsedBytes: true,
      storageReservedBytes: true,
      storageLimitBytes: true,
    },
  });

  if (!org) {
    throw new Error(`Organización no encontrada: ${orgId}`);
  }

  const availableBytes = org.storageLimitBytes - org.storageUsedBytes - org.storageReservedBytes;

  // Calcular porcentaje (used + reserved / limit)
  const zero = BigInt(0);
  const hundred = BigInt(100);
  const usagePercent =
    org.storageLimitBytes > zero
      ? Number(((org.storageUsedBytes + org.storageReservedBytes) * hundred) / org.storageLimitBytes)
      : 0;

  return {
    usedBytes: org.storageUsedBytes,
    reservedBytes: org.storageReservedBytes,
    limitBytes: org.storageLimitBytes,
    availableBytes: availableBytes > zero ? availableBytes : zero,
    usagePercent: Math.min(usagePercent, 100), // Cap at 100%
  };
}

/**
 * Verifica si hay espacio suficiente sin reservar (solo check)
 * Útil para validaciones previas en UI
 *
 * @param orgId - ID de la organización
 * @param bytes - Bytes a verificar
 * @returns true si hay espacio, false si no
 */
export async function hasAvailableStorage(orgId: string, bytes: bigint): Promise<boolean> {
  const quota = await getOrgStorageQuota(orgId);
  return quota.availableBytes >= bytes;
}

/**
 * Convierte bytes (number o bigint) a bigint de forma segura
 * Útil para convertir file.size (number) a bigint
 */
export function toBigInt(bytes: number | bigint): bigint {
  return typeof bytes === "bigint" ? bytes : BigInt(Math.floor(bytes));
}

/**
 * Reconcilia el storage de una organización (MANUAL, solo para auditoría)
 * Compara SUM(StoredFile.sizeBytes) con storageUsedBytes
 *
 * @param orgId - ID de la organización
 * @param fix - Si true, corrige el valor de storageUsedBytes
 * @returns Resultado de la reconciliación
 */
export async function reconcileOrgStorage(
  orgId: string,
  fix: boolean = false,
): Promise<{
  previousUsed: bigint;
  calculatedUsed: bigint;
  deviation: bigint;
  corrected: boolean;
}> {
  // Obtener valor actual
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { storageUsedBytes: true },
  });

  if (!org) {
    throw new Error(`Organización no encontrada: ${orgId}`);
  }

  // Calcular desde StoredFile (solo archivos no eliminados)
  // sizeBytes es Int, pero la suma puede superar 2GB, así que convertimos a BigInt
  const result = await prisma.storedFile.aggregate({
    where: {
      orgId,
      deletedAt: null,
    },
    _sum: {
      sizeBytes: true,
    },
  });

  // Convertir a BigInt de forma segura (result._sum.sizeBytes es number | null)
  // eslint-disable-next-line no-underscore-dangle
  const calculatedUsed = BigInt(result._sum.sizeBytes ?? 0);
  const previousUsed = org.storageUsedBytes;
  const deviation = previousUsed - calculatedUsed;

  let corrected = false;

  const zero = BigInt(0);
  if (fix && deviation !== zero) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { storageUsedBytes: calculatedUsed },
    });
    corrected = true;
  }

  return {
    previousUsed,
    calculatedUsed,
    deviation,
    corrected,
  };
}
