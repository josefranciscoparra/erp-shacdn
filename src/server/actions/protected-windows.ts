"use server";

import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type ProtectedWindowInput = {
  name: string;
  description?: string | null;
  scope: "ORGANIZATION" | "EMPLOYEE";
  weekdays: number[];
  startMinutes: number;
  endMinutes: number;
  overrideToleranceMinutes?: number | null;
  overrideMaxOpenHours?: number | null;
  isActive: boolean;
  employeeId?: string | null;
};

function validateMinutes(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1440) {
    throw new Error(`${label} debe estar entre 0 y 1440 minutos`);
  }
}

function normalizeWeekdays(weekdays: number[]) {
  const unique = Array.from(new Set(weekdays));
  const filtered = unique.filter((day) => day >= 1 && day <= 7);
  if (filtered.length === 0) {
    throw new Error("Selecciona al menos un día de la semana");
  }
  return filtered.sort();
}

async function requireManagePermission() {
  const authz = await safePermission("manage_time_tracking");
  if (!authz.ok) {
    throw new Error(authz.error);
  }
  return authz.session.user.orgId;
}

async function requireViewPermission() {
  const authz = await safePermission("view_time_tracking");
  if (!authz.ok) {
    throw new Error(authz.error);
  }
  return authz.session.user.orgId;
}

export async function getProtectedWindows() {
  const orgId = await requireViewPermission();

  const windows = await prisma.protectedWindow.findMany({
    where: { orgId },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return windows.map((window) => ({
    id: window.id,
    name: window.name,
    description: window.description,
    scope: window.scope,
    weekdays: window.weekdays,
    startMinutes: window.startMinutes,
    endMinutes: window.endMinutes,
    overrideToleranceMinutes: window.overrideToleranceMinutes,
    overrideMaxOpenHours: window.overrideMaxOpenHours,
    isActive: window.isActive,
    employee: window.employee
      ? {
          id: window.employee.id,
          name: `${window.employee.firstName} ${window.employee.lastName}`.trim(),
          email: window.employee.user.email,
        }
      : null,
  }));
}

export async function createProtectedWindow(input: ProtectedWindowInput) {
  const orgId = await requireManagePermission();

  if (!input.name || input.name.trim().length < 3) {
    throw new Error("El nombre debe tener al menos 3 caracteres");
  }

  const weekdays = normalizeWeekdays(input.weekdays);
  validateMinutes(input.startMinutes, "La hora de inicio");
  validateMinutes(input.endMinutes, "La hora de fin");

  if (input.scope === "EMPLOYEE" && !input.employeeId) {
    throw new Error("Selecciona un empleado para el ámbito individual");
  }

  return await prisma.protectedWindow.create({
    data: {
      orgId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      scope: input.scope,
      weekdays,
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      overrideToleranceMinutes: input.overrideToleranceMinutes ?? null,
      overrideMaxOpenHours: input.overrideMaxOpenHours ?? null,
      isActive: input.isActive,
      employeeId: input.scope === "EMPLOYEE" ? (input.employeeId ?? null) : null,
    },
  });
}

export async function updateProtectedWindow(id: string, input: ProtectedWindowInput) {
  const orgId = await requireManagePermission();

  if (!id) {
    throw new Error("ID inválido");
  }

  if (!input.name || input.name.trim().length < 3) {
    throw new Error("El nombre debe tener al menos 3 caracteres");
  }

  const weekdays = normalizeWeekdays(input.weekdays);
  validateMinutes(input.startMinutes, "La hora de inicio");
  validateMinutes(input.endMinutes, "La hora de fin");

  if (input.scope === "EMPLOYEE" && !input.employeeId) {
    throw new Error("Selecciona un empleado para el ámbito individual");
  }

  const existing = await prisma.protectedWindow.findUnique({
    where: { id },
    select: { orgId: true },
  });

  if (!existing || existing.orgId !== orgId) {
    throw new Error("Ventana no encontrada");
  }

  return await prisma.protectedWindow.update({
    where: { id },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      scope: input.scope,
      weekdays,
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      overrideToleranceMinutes: input.overrideToleranceMinutes ?? null,
      overrideMaxOpenHours: input.overrideMaxOpenHours ?? null,
      isActive: input.isActive,
      employeeId: input.scope === "EMPLOYEE" ? (input.employeeId ?? null) : null,
    },
  });
}

export async function deleteProtectedWindow(id: string) {
  const orgId = await requireManagePermission();

  const existing = await prisma.protectedWindow.findUnique({
    where: { id },
    select: { orgId: true },
  });

  if (!existing || existing.orgId !== orgId) {
    throw new Error("Ventana no encontrada");
  }

  await prisma.protectedWindow.delete({ where: { id } });
  return { success: true };
}
