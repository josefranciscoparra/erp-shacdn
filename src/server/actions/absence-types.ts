"use server";

import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

// Tipos para crear/editar tipos de ausencia
export interface CreateAbsenceTypeInput {
  name: string;
  code: string;
  description?: string;
  color: string;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  minDaysAdvance: number;
  affectsBalance: boolean;
  balanceType: "VACATION" | "PERSONAL_MATTERS" | "COMP_TIME";
  // Granularidad
  allowPartialDays: boolean;
  granularityMinutes: number;
  minimumDurationMinutes: number;
  maxDurationMinutes?: number;
  compensationFactor: number;
}

export interface UpdateAbsenceTypeInput extends CreateAbsenceTypeInput {
  id: string;
}

/**
 * Obtiene todos los tipos de ausencia de una organización
 */
export async function getAllAbsenceTypes() {
  const { orgId } = await getAuthenticatedUser();

  const absenceTypes = await prisma.absenceType.findMany({
    where: {
      orgId,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          ptoRequests: true,
        },
      },
    },
  });

  return absenceTypes.map((type) => ({
    id: type.id,
    name: type.name,
    code: type.code,
    description: type.description,
    color: type.color,
    isPaid: type.isPaid,
    requiresApproval: type.requiresApproval,
    requiresDocument: type.requiresDocument,
    minDaysAdvance: type.minDaysAdvance,
    affectsBalance: type.affectsBalance,
    balanceType: type.balanceType,
    active: type.active,
    allowPartialDays: type.allowPartialDays,
    granularityMinutes: type.granularityMinutes,
    minimumDurationMinutes: type.minimumDurationMinutes,
    maxDurationMinutes: type.maxDurationMinutes,
    compensationFactor: Number(type.compensationFactor),
    createdAt: type.createdAt,
    updatedAt: type.updatedAt,
    usageCount: type._count.ptoRequests,
  }));
}

/**
 * Obtiene tipos de ausencia activos para uso en solicitudes
 */
export async function getActiveAbsenceTypes() {
  const { orgId } = await getAuthenticatedUser();

  const absenceTypes = await prisma.absenceType.findMany({
    where: {
      orgId,
      active: true,
    },
    orderBy: { name: "asc" },
  });

  return absenceTypes.map((type) => ({
    id: type.id,
    name: type.name,
    code: type.code,
    description: type.description,
    color: type.color,
    isPaid: type.isPaid,
    requiresApproval: type.requiresApproval,
    requiresDocument: type.requiresDocument,
    minDaysAdvance: type.minDaysAdvance,
    affectsBalance: type.affectsBalance,
    balanceType: type.balanceType,
    allowPartialDays: type.allowPartialDays,
    granularityMinutes: type.granularityMinutes,
    minimumDurationMinutes: type.minimumDurationMinutes,
    maxDurationMinutes: type.maxDurationMinutes,
    compensationFactor: Number(type.compensationFactor),
  }));
}

/**
 * Obtiene un tipo de ausencia por ID
 */
export async function getAbsenceTypeById(id: string) {
  const { orgId } = await getAuthenticatedUser();

  const absenceType = await prisma.absenceType.findUnique({
    where: {
      id,
      orgId,
    },
    include: {
      _count: {
        select: {
          ptoRequests: true,
        },
      },
    },
  });

  if (!absenceType) {
    throw new Error("Tipo de ausencia no encontrado");
  }

  return {
    id: absenceType.id,
    name: absenceType.name,
    code: absenceType.code,
    description: absenceType.description,
    color: absenceType.color,
    isPaid: absenceType.isPaid,
    requiresApproval: absenceType.requiresApproval,
    requiresDocument: absenceType.requiresDocument,
    minDaysAdvance: absenceType.minDaysAdvance,
    affectsBalance: absenceType.affectsBalance,
    balanceType: absenceType.balanceType,
    active: absenceType.active,
    allowPartialDays: absenceType.allowPartialDays,
    granularityMinutes: absenceType.granularityMinutes,
    minimumDurationMinutes: absenceType.minimumDurationMinutes,
    maxDurationMinutes: absenceType.maxDurationMinutes,
    compensationFactor: Number(absenceType.compensationFactor),
    createdAt: absenceType.createdAt,
    updatedAt: absenceType.updatedAt,
    usageCount: absenceType._count.ptoRequests,
  };
}

/**
 * Crea un nuevo tipo de ausencia
 */
export async function createAbsenceType(input: CreateAbsenceTypeInput) {
  const { orgId } = await getAuthenticatedUser();

  // Validar que el code sea único en la organización
  const existingType = await prisma.absenceType.findUnique({
    where: {
      orgId_code: {
        orgId,
        code: input.code.toUpperCase(),
      },
    },
  });

  if (existingType) {
    throw new Error(`Ya existe un tipo de ausencia con el código "${input.code}"`);
  }

  // Validaciones de granularidad
  if (input.allowPartialDays) {
    if (input.granularityMinutes < 1 || input.granularityMinutes > 480) {
      throw new Error("La granularidad debe estar entre 1 y 480 minutos (8 horas)");
    }

    if (input.minimumDurationMinutes < input.granularityMinutes) {
      throw new Error("La duración mínima no puede ser menor que la granularidad");
    }

    if (input.maxDurationMinutes && input.maxDurationMinutes < input.minimumDurationMinutes) {
      throw new Error("La duración máxima no puede ser menor que la duración mínima");
    }
  }

  const absenceType = await prisma.absenceType.create({
    data: {
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      color: input.color,
      isPaid: input.isPaid,
      requiresApproval: input.requiresApproval,
      requiresDocument: input.requiresDocument,
      minDaysAdvance: input.minDaysAdvance,
      affectsBalance: input.affectsBalance,
      balanceType: input.balanceType,
      active: true,
      allowPartialDays: input.allowPartialDays,
      granularityMinutes: input.granularityMinutes,
      minimumDurationMinutes: input.minimumDurationMinutes,
      maxDurationMinutes: input.maxDurationMinutes,
      compensationFactor: new Decimal(input.compensationFactor),
      orgId,
    },
  });

  return {
    id: absenceType.id,
    name: absenceType.name,
    code: absenceType.code,
    description: absenceType.description,
    color: absenceType.color,
    isPaid: absenceType.isPaid,
    requiresApproval: absenceType.requiresApproval,
    requiresDocument: absenceType.requiresDocument,
    minDaysAdvance: absenceType.minDaysAdvance,
    affectsBalance: absenceType.affectsBalance,
    balanceType: absenceType.balanceType,
    active: absenceType.active,
    allowPartialDays: absenceType.allowPartialDays,
    granularityMinutes: absenceType.granularityMinutes,
    minimumDurationMinutes: absenceType.minimumDurationMinutes,
    maxDurationMinutes: absenceType.maxDurationMinutes,
    compensationFactor: Number(absenceType.compensationFactor),
    createdAt: absenceType.createdAt,
    updatedAt: absenceType.updatedAt,
  };
}

/**
 * Actualiza un tipo de ausencia existente
 */
export async function updateAbsenceType(input: UpdateAbsenceTypeInput) {
  const { orgId } = await getAuthenticatedUser();

  // Verificar que el tipo de ausencia existe y pertenece a la organización
  const existingType = await prisma.absenceType.findUnique({
    where: {
      id: input.id,
      orgId,
    },
  });

  if (!existingType) {
    throw new Error("Tipo de ausencia no encontrado");
  }

  // Validar que el code sea único (si cambió)
  if (input.code.toUpperCase() !== existingType.code) {
    const duplicateCode = await prisma.absenceType.findUnique({
      where: {
        orgId_code: {
          orgId,
          code: input.code.toUpperCase(),
        },
      },
    });

    if (duplicateCode) {
      throw new Error(`Ya existe un tipo de ausencia con el código "${input.code}"`);
    }
  }

  // Validaciones de granularidad
  if (input.allowPartialDays) {
    if (input.granularityMinutes < 1 || input.granularityMinutes > 480) {
      throw new Error("La granularidad debe estar entre 1 y 480 minutos (8 horas)");
    }

    if (input.minimumDurationMinutes < input.granularityMinutes) {
      throw new Error("La duración mínima no puede ser menor que la granularidad");
    }

    if (input.maxDurationMinutes && input.maxDurationMinutes < input.minimumDurationMinutes) {
      throw new Error("La duración máxima no puede ser menor que la duración mínima");
    }
  }

  const absenceType = await prisma.absenceType.update({
    where: { id: input.id },
    data: {
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      color: input.color,
      isPaid: input.isPaid,
      requiresApproval: input.requiresApproval,
      requiresDocument: input.requiresDocument,
      minDaysAdvance: input.minDaysAdvance,
      affectsBalance: input.affectsBalance,
      balanceType: input.balanceType,
      allowPartialDays: input.allowPartialDays,
      granularityMinutes: input.granularityMinutes,
      minimumDurationMinutes: input.minimumDurationMinutes,
      maxDurationMinutes: input.maxDurationMinutes,
      compensationFactor: new Decimal(input.compensationFactor),
    },
  });

  return {
    id: absenceType.id,
    name: absenceType.name,
    code: absenceType.code,
    description: absenceType.description,
    color: absenceType.color,
    isPaid: absenceType.isPaid,
    requiresApproval: absenceType.requiresApproval,
    requiresDocument: absenceType.requiresDocument,
    minDaysAdvance: absenceType.minDaysAdvance,
    affectsBalance: absenceType.affectsBalance,
    balanceType: absenceType.balanceType,
    active: absenceType.active,
    allowPartialDays: absenceType.allowPartialDays,
    granularityMinutes: absenceType.granularityMinutes,
    minimumDurationMinutes: absenceType.minimumDurationMinutes,
    maxDurationMinutes: absenceType.maxDurationMinutes,
    compensationFactor: Number(absenceType.compensationFactor),
    createdAt: absenceType.createdAt,
    updatedAt: absenceType.updatedAt,
  };
}

/**
 * Activa o desactiva un tipo de ausencia (soft delete)
 */
export async function toggleAbsenceTypeStatus(id: string, active: boolean) {
  const { orgId } = await getAuthenticatedUser();

  const absenceType = await prisma.absenceType.findUnique({
    where: {
      id,
      orgId,
    },
  });

  if (!absenceType) {
    throw new Error("Tipo de ausencia no encontrado");
  }

  const updated = await prisma.absenceType.update({
    where: { id },
    data: { active },
  });

  return {
    id: updated.id,
    active: updated.active,
  };
}

/**
 * Elimina un tipo de ausencia (solo si no tiene solicitudes asociadas)
 */
export async function deleteAbsenceType(id: string) {
  const { orgId } = await getAuthenticatedUser();

  const absenceType = await prisma.absenceType.findUnique({
    where: {
      id,
      orgId,
    },
    include: {
      _count: {
        select: {
          ptoRequests: true,
        },
      },
    },
  });

  if (!absenceType) {
    throw new Error("Tipo de ausencia no encontrado");
  }

  if (absenceType._count.ptoRequests > 0) {
    throw new Error(
      "No se puede eliminar un tipo de ausencia que tiene solicitudes asociadas. Desactívalo en su lugar.",
    );
  }

  await prisma.absenceType.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * Crea tipos de ausencia por defecto para una organización nueva
 */
export async function createDefaultAbsenceTypes(orgId: string) {
  const defaultTypes: Omit<CreateAbsenceTypeInput, "code">[] = [
    {
      name: "Vacaciones",
      code: "VACATION",
      description: "Días de vacaciones anuales",
      color: "#3b82f6",
      isPaid: true,
      requiresApproval: true,
      minDaysAdvance: 15,
      affectsBalance: true,
      balanceType: "VACATION",
      allowPartialDays: false,
      granularityMinutes: 480, // 1 día completo
      minimumDurationMinutes: 480,
      maxDurationMinutes: undefined,
      compensationFactor: 1.0,
    },
    {
      name: "Asuntos Propios",
      code: "PERSONAL",
      description: "Días por asuntos personales",
      color: "#8b5cf6",
      isPaid: true,
      requiresApproval: true,
      minDaysAdvance: 3,
      affectsBalance: true,
      balanceType: "PERSONAL_MATTERS",
      allowPartialDays: false,
      granularityMinutes: 480,
      minimumDurationMinutes: 480,
      maxDurationMinutes: undefined,
      compensationFactor: 1.0,
    },
    {
      name: "Baja Médica",
      code: "SICK_LEAVE",
      description: "Ausencia por enfermedad",
      color: "#ef4444",
      isPaid: true,
      requiresApproval: false,
      minDaysAdvance: 0,
      affectsBalance: false,
      balanceType: "VACATION",
      allowPartialDays: false,
      granularityMinutes: 480,
      minimumDurationMinutes: 480,
      maxDurationMinutes: undefined,
      compensationFactor: 1.0,
    },
    {
      name: "Permiso por Horas",
      code: "HOURLY_LEAVE",
      description: "Permisos de corta duración (sector privado)",
      color: "#10b981",
      isPaid: true,
      requiresApproval: true,
      minDaysAdvance: 1,
      affectsBalance: true,
      balanceType: "PERSONAL_MATTERS",
      allowPartialDays: true,
      granularityMinutes: 60, // Por horas
      minimumDurationMinutes: 60,
      maxDurationMinutes: 240, // Máximo 4 horas
      compensationFactor: 1.0,
    },
  ];

  const createdTypes = await prisma.$transaction(
    defaultTypes.map((type) =>
      prisma.absenceType.create({
        data: {
          name: type.name,
          code: type.code,
          description: type.description,
          color: type.color,
          isPaid: type.isPaid,
          requiresApproval: type.requiresApproval,
          minDaysAdvance: type.minDaysAdvance,
          affectsBalance: type.affectsBalance,
          active: true,
          allowPartialDays: type.allowPartialDays,
          granularityMinutes: type.granularityMinutes,
          minimumDurationMinutes: type.minimumDurationMinutes,
          maxDurationMinutes: type.maxDurationMinutes,
          compensationFactor: new Decimal(type.compensationFactor),
          orgId,
        },
      }),
    ),
  );

  return createdTypes;
}
