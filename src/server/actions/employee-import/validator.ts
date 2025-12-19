"use server";

import type { Role } from "@prisma/client";
import { isValid, parseISO } from "date-fns";

import {
  EMPLOYEE_IMPORT_ALLOWED_ROLES,
  EMPLOYEE_IMPORT_MAX_ROWS,
  EMPLOYEE_IMPORT_VACATION_MODES,
} from "@/lib/employee-import/constants";
import type {
  EmployeeImportOptions,
  ParsedEmployeeImportRow,
  RowMessage,
  RowValidationResult,
} from "@/lib/employee-import/types";
import { prisma } from "@/lib/prisma";

interface ValidationOutput {
  rows: RowValidationResult[];
  stats: {
    total: number;
    ready: number;
    error: number;
    warning: number;
  };
}

function normalizeId(value?: string | null) {
  return value?.trim() ? value.trim() : undefined;
}

export async function validateRowsForOrganization(params: {
  rows: ParsedEmployeeImportRow[];
  orgId: string;
  options: EmployeeImportOptions;
}): Promise<ValidationOutput> {
  const { rows, orgId, options } = params;

  if (!rows.length) {
    throw new Error("El archivo no contiene filas para importar.");
  }

  if (rows.length > EMPLOYEE_IMPORT_MAX_ROWS) {
    throw new Error(`El límite de filas por importación es ${EMPLOYEE_IMPORT_MAX_ROWS}.`);
  }

  const seenNif = new Set<string>();
  const seenEmails = new Set<string>();

  const scheduleIds = new Set<string>();
  const departmentIds = new Set<string>();
  const costCenterIds = new Set<string>();
  const managerEmails = new Set<string>();
  const nifList = new Set<string>();
  const emailList = new Set<string>();

  rows.forEach((row) => {
    const nif = row.data.nifNie?.trim().toUpperCase();
    if (nif) {
      nifList.add(nif);
    }
    const email = row.data.email?.trim().toLowerCase();
    if (email) {
      emailList.add(email);
    }
    const scheduleId = normalizeId(row.data.scheduleTemplateId);
    if (scheduleId) {
      scheduleIds.add(scheduleId);
    }
    const deptId = normalizeId(row.data.departmentId);
    if (deptId) {
      departmentIds.add(deptId);
    }
    const centerId = normalizeId(row.data.costCenterId);
    if (centerId) {
      costCenterIds.add(centerId);
    }
    const managerEmail = row.data.managerEmail?.trim().toLowerCase();
    if (managerEmail) {
      managerEmails.add(managerEmail);
    }
  });

  const [existingEmployees, existingUsers, schedules, departments, costCenters, managers] = await Promise.all([
    prisma.employee.findMany({
      where: {
        orgId,
        OR: [
          nifList.size ? { nifNie: { in: Array.from(nifList) } } : undefined,
          emailList.size ? { email: { in: Array.from(emailList) } } : undefined,
        ].filter(Boolean) as any,
      },
      select: { nifNie: true, email: true },
    }),
    prisma.user.findMany({
      where: {
        email: { in: Array.from(emailList) },
      },
      select: { email: true },
    }),
    prisma.scheduleTemplate.findMany({
      where: {
        orgId,
        id: { in: Array.from(scheduleIds) },
      },
      select: { id: true },
    }),
    prisma.department.findMany({
      where: {
        orgId,
        id: { in: Array.from(departmentIds) },
      },
      select: { id: true },
    }),
    prisma.costCenter.findMany({
      where: {
        orgId,
        id: { in: Array.from(costCenterIds) },
      },
      select: { id: true },
    }),
    prisma.employee.findMany({
      where: {
        orgId,
        email: { in: Array.from(managerEmails) },
      },
      select: { id: true, email: true },
    }),
  ]);

  const existingNifs = new Set(existingEmployees.map((emp) => emp.nifNie.toUpperCase()));
  const existingEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));
  const existingEmployeeEmails = new Set(
    existingEmployees.filter((emp) => emp.email).map((emp) => emp.email!.toLowerCase()),
  );

  const scheduleMap = new Map(schedules.map((schedule) => [schedule.id, true]));
  const departmentMap = new Map(departments.map((dept) => [dept.id, true]));
  const costCenterMap = new Map(costCenters.map((center) => [center.id, true]));
  const managerMap = new Map(managers.map((manager) => [manager.email?.toLowerCase(), manager.id]));

  const results: RowValidationResult[] = [];
  let ready = 0;
  let error = 0;
  let warning = 0;

  rows.forEach((row) => {
    const messages: RowMessage[] = [];
    const { data } = row;

    if (!data.firstName?.trim()) {
      messages.push({ type: "ERROR", field: "firstName", message: "El nombre es obligatorio." });
    }

    if (!data.lastName?.trim()) {
      messages.push({ type: "ERROR", field: "lastName", message: "El primer apellido es obligatorio." });
    }

    if (!data.nifNie?.trim()) {
      messages.push({ type: "ERROR", field: "nifNie", message: "El NIF/NIE es obligatorio." });
    }

    if (!data.email?.trim()) {
      messages.push({ type: "ERROR", field: "email", message: "El email es obligatorio." });
    }

    if (!data.scheduleTemplateId?.trim()) {
      messages.push({
        type: "ERROR",
        field: "scheduleTemplateId",
        message: "Debes indicar un horario (scheduleTemplateId).",
      });
    }

    if (!data.startDate?.trim()) {
      messages.push({ type: "ERROR", field: "startDate", message: "La fecha de inicio es obligatoria." });
    } else {
      const parsed = parseISO(data.startDate);
      if (!isValid(parsed)) {
        messages.push({
          type: "ERROR",
          field: "startDate",
          message: "La fecha de inicio no tiene un formato válido (YYYY-MM-DD).",
        });
      }
    }

    if (data.role && !EMPLOYEE_IMPORT_ALLOWED_ROLES.includes(data.role as Role)) {
      messages.push({
        type: "ERROR",
        field: "role",
        message: `El rol ${data.role} no es válido. Usa: ${EMPLOYEE_IMPORT_ALLOWED_ROLES.join(", ")}`,
      });
    }

    const nifKey = data.nifNie?.toUpperCase();
    if (nifKey) {
      if (seenNif.has(nifKey)) {
        messages.push({ type: "ERROR", field: "nifNie", message: "NIF/NIE duplicado en el archivo." });
      } else {
        seenNif.add(nifKey);
      }
      if (existingNifs.has(nifKey)) {
        messages.push({
          type: "ERROR",
          field: "nifNie",
          message: "Ya existe un empleado con este NIF/NIE en la organización.",
        });
      }
    }

    const emailKey = data.email?.toLowerCase();
    if (emailKey) {
      if (seenEmails.has(emailKey)) {
        messages.push({ type: "ERROR", field: "email", message: "Email duplicado en el archivo." });
      } else {
        seenEmails.add(emailKey);
      }
      if (existingEmails.has(emailKey)) {
        messages.push({
          type: "ERROR",
          field: "email",
          message: "Ya existe un usuario con este email en TimeNow.",
        });
      }
      if (existingEmployeeEmails.has(emailKey)) {
        messages.push({
          type: "ERROR",
          field: "email",
          message: "Ya existe un empleado activo con este email.",
        });
      }
    }

    if (data.scheduleTemplateId && !scheduleMap.has(data.scheduleTemplateId)) {
      messages.push({
        type: "ERROR",
        field: "scheduleTemplateId",
        message: `El horario ${data.scheduleTemplateId} no existe o no pertenece a tu organización.`,
      });
    }

    if (data.departmentId) {
      if (!departmentMap.has(data.departmentId)) {
        if (options.departmentPolicy === "REQUIRE_EXISTING") {
          messages.push({
            type: "ERROR",
            field: "departmentId",
            message: `El departamento ${data.departmentId} no existe.`,
          });
        } else {
          messages.push({
            type: "WARNING",
            field: "departmentId",
            message: `El departamento ${data.departmentId} no existe. Se ignorará.`,
          });
          row.data.departmentId = undefined;
        }
      }
    }

    if (data.costCenterId && !costCenterMap.has(data.costCenterId)) {
      messages.push({
        type: "WARNING",
        field: "costCenterId",
        message: `El centro de coste ${data.costCenterId} no existe. Se ignorará.`,
      });
      row.data.costCenterId = undefined;
    }

    if (data.managerEmail) {
      const managerKey = data.managerEmail.toLowerCase();
      const managerId = managerMap.get(managerKey);
      if (!managerId) {
        if (options.managerPolicy === "ERROR_IF_MISSING") {
          messages.push({
            type: "ERROR",
            field: "managerEmail",
            message: `No se encontró un manager con email ${data.managerEmail}.`,
          });
        } else {
          messages.push({
            type: "WARNING",
            field: "managerEmail",
            message: `No se encontró un manager con email ${data.managerEmail}.`,
          });
          row.data.managerEmail = undefined;
        }
      }
    }

    if (!EMPLOYEE_IMPORT_VACATION_MODES.includes(options.vacationMode)) {
      messages.push({ type: "ERROR", field: "vacationMode", message: "Modo de vacaciones no soportado." });
    } else if (options.vacationMode === "BALANCE") {
      if (!data.ptoBalanceDays && !data.ptoBalanceMinutes) {
        messages.push({
          type: "WARNING",
          field: "ptoBalanceDays",
          message: "No se especificó saldo de vacaciones. Se inicializará en 0.",
        });
      }
    } else if (options.vacationMode === "ANNUAL") {
      if (!data.ptoAnnualDays && !data.ptoAnnualMinutes) {
        messages.push({
          type: "ERROR",
          field: "ptoAnnualDays",
          message: "Debes indicar los días/minutos anuales de vacaciones para este modo.",
        });
      }
      if (data.ptoUsedDays && data.ptoAnnualDays && data.ptoUsedDays > data.ptoAnnualDays) {
        messages.push({
          type: "ERROR",
          field: "ptoUsedDays",
          message: "Los días consumidos no pueden ser mayores que los anuales.",
        });
      }
    }

    const hasError = messages.some((message) => message.type === "ERROR");
    const hasWarning = messages.some((message) => message.type === "WARNING");
    let status: RowValidationResult["status"] = "READY";

    if (hasError) {
      status = "ERROR";
      error += 1;
    } else {
      ready += 1;
      if (hasWarning) {
        warning += 1;
      }
    }

    results.push({
      ...row,
      status,
      messages,
    });
  });

  return {
    rows: results,
    stats: {
      total: rows.length,
      ready,
      error,
      warning,
    },
  };
}
