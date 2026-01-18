import type { EmployeeImportRow, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { hash } from "bcryptjs";

import { DEFAULT_CONTRACT_TYPE, normalizeContractTypeInput } from "@/lib/contracts/contract-types";
import type { EmployeeImportOptions, EmployeeImportRowData } from "@/lib/employee-import/types";
import { generateTemporaryPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validations/email";
import { validateEmailDomain } from "@/lib/validations/email-domain";
import { recalculateJobCounters } from "@/server/actions/employee-import/service";
import { enqueueEmployeeImportInviteJob } from "@/server/jobs/employee-import-invite-queue";
import { generateSafeEmployeeNumber } from "@/services/employees";
import { daysToMinutes } from "@/services/pto";

interface ImportPerformedBy {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

async function createEmployeeRecords(params: {
  db: PrismaClientLike;
  data: EmployeeImportRowData;
  options: EmployeeImportOptions;
  orgId: string;
  orgPrefix: string;
  allowedEmailDomains: string[];
  performedById: string;
}) {
  const { db, data, options, orgId, orgPrefix, allowedEmailDomains, performedById } = params;

  const startDate = new Date(data.startDate);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("La fecha de inicio no es válida.");
  }

  const normalizedEmail = normalizeEmail(data.email);

  if (!normalizedEmail) {
    throw new Error("El email es obligatorio.");
  }

  const emailValidation = validateEmailDomain(normalizedEmail, allowedEmailDomains);
  if (!emailValidation.valid) {
    throw new Error(emailValidation.error ?? "El correo no pertenece a los dominios permitidos.");
  }

  const userRole =
    data.role && ["EMPLOYEE", "MANAGER", "HR_ADMIN", "HR_ASSISTANT", "ORG_ADMIN"].includes(data.role)
      ? data.role
      : "EMPLOYEE";

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await hash(temporaryPassword, 10);
  const workdayMinutes = 480;
  const contractTypeInput = data.contractType?.trim();
  const normalizedContractType = contractTypeInput ? normalizeContractTypeInput(contractTypeInput) : null;
  if (contractTypeInput && !normalizedContractType) {
    throw new Error(`Tipo de contrato no válido: ${data.contractType}`);
  }
  const contractType = normalizedContractType ?? DEFAULT_CONTRACT_TYPE;
  const weeklyHours = data.weeklyHours ?? 40;

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: `${data.firstName} ${data.lastName}`,
      role: userRole as any,
      orgId,
      mustChangePassword: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  await db.temporaryPassword.create({
    data: {
      userId: user.id,
      orgId,
      password: temporaryPassword,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reason: "Importación masiva",
      createdById: performedById,
    },
  });

  const numberResult = await generateSafeEmployeeNumber(db, orgId, orgPrefix);

  const employee = await db.employee.create({
    data: {
      employeeNumber: numberResult.employeeNumber,
      requiresEmployeeNumberReview: numberResult.requiresReview,
      firstName: data.firstName,
      lastName: data.lastName,
      secondLastName: data.secondLastName,
      nifNie: data.nifNie,
      email: normalizedEmail,
      phone: data.phone,
      mobilePhone: data.mobilePhone,
      employmentStatus: "ACTIVE",
      notes: data.notes,
      orgId,
      userId: user.id,
    },
    select: { id: true },
  });

  const manager = data.managerEmail
    ? await db.employee.findFirst({
        where: { orgId, email: data.managerEmail },
        select: { id: true },
      })
    : null;

  const contract = await db.employmentContract.create({
    data: {
      employeeId: employee.id,
      orgId,
      contractType,
      startDate,
      weeklyHours: new Decimal(weeklyHours),
      workingDaysPerWeek: new Decimal(5),
      active: true,
      departmentId: data.departmentId ?? null,
      costCenterId: data.costCenterId ?? null,
      managerId: manager?.id ?? null,
      workScheduleType: "FIXED",
      ...(contractType === "FIJO_DISCONTINUO" && {
        discontinuousStatus: "ACTIVE",
      }),
    },
    select: { id: true },
  });

  await db.employeeScheduleAssignment.create({
    data: {
      employeeId: employee.id,
      scheduleTemplateId: data.scheduleTemplateId,
      assignmentType: "FIXED",
      validFrom: startDate,
      isActive: true,
    },
  });

  const currentYear = new Date().getFullYear();
  const allowanceDays = options.vacationMode === "ANNUAL" ? (data.ptoAnnualDays ?? 0) : (data.ptoBalanceDays ?? 0);
  const usedDays = options.vacationMode === "ANNUAL" ? (data.ptoUsedDays ?? 0) : 0;
  const availableDays = options.vacationMode === "ANNUAL" ? Math.max(allowanceDays - usedDays, 0) : allowanceDays;

  const allowanceMinutes =
    data.ptoAnnualMinutes ??
    (options.vacationMode === "ANNUAL"
      ? daysToMinutes(allowanceDays, workdayMinutes)
      : daysToMinutes(allowanceDays, workdayMinutes));
  const usedMinutes =
    data.ptoUsedMinutes ?? (options.vacationMode === "ANNUAL" ? daysToMinutes(usedDays, workdayMinutes) : 0);
  const balanceMinutes =
    data.ptoBalanceMinutes ??
    (options.vacationMode === "ANNUAL"
      ? daysToMinutes(availableDays, workdayMinutes)
      : daysToMinutes(allowanceDays, workdayMinutes));

  await db.ptoBalance.upsert({
    where: {
      orgId_employeeId_year_balanceType: {
        orgId,
        employeeId: employee.id,
        year: currentYear,
        balanceType: "VACATION",
      },
    },
    create: {
      orgId,
      employeeId: employee.id,
      year: currentYear,
      balanceType: "VACATION",
      annualAllowance: new Decimal(allowanceDays),
      daysUsed: new Decimal(usedDays),
      daysPending: new Decimal(0),
      daysAvailable: new Decimal(availableDays),
      annualAllowanceMinutes: allowanceMinutes,
      minutesUsed: usedMinutes,
      minutesPending: 0,
      minutesAvailable: balanceMinutes,
      workdayMinutesSnapshot: workdayMinutes,
      contractStartDate: startDate,
    },
    update: {
      annualAllowance: new Decimal(allowanceDays),
      daysUsed: new Decimal(usedDays),
      daysAvailable: new Decimal(availableDays),
      annualAllowanceMinutes: allowanceMinutes,
      minutesUsed: usedMinutes,
      minutesAvailable: balanceMinutes,
    },
  });

  return {
    employeeId: employee.id,
    contractId: contract.id,
    userId: user.id,
    temporaryPassword,
  };
}

export async function createEmployeeFromRow(params: {
  data: EmployeeImportRowData;
  options: EmployeeImportOptions;
  orgId: string;
  orgPrefix: string;
  allowedEmailDomains: string[];
  performedById: string;
  db?: PrismaClientLike;
}) {
  const { db, ...rest } = params;

  if (db) {
    return createEmployeeRecords({ db, ...rest });
  }

  const result = await prisma.$transaction(async (tx) => {
    return createEmployeeRecords({ db: tx, ...rest });
  });

  return result;
}

async function processImportRow(params: {
  row: EmployeeImportRow;
  options: EmployeeImportOptions;
  orgId: string;
  prefix: string;
  allowedDomains: string[];
  performedBy: {
    id: string;
    email: string;
    role: string;
    name: string | null;
  };
}) {
  const { row, options, orgId, prefix, allowedDomains, performedBy } = params;
  const data = row.rawData as EmployeeImportRowData | undefined;
  if (!data) {
    throw new Error("Fila sin datos normalizados.");
  }

  try {
    const creationResult = await createEmployeeFromRow({
      data,
      options,
      orgId,
      orgPrefix: prefix,
      allowedEmailDomains: allowedDomains,
      performedById: performedBy.id,
    });

    await prisma.employeeImportRow.update({
      where: { id: row.id },
      data: {
        status: "IMPORTED",
        createdEmployeeId: creationResult.employeeId,
        createdUserId: creationResult.userId,
        errorReason: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "EMPLOYEE_CREATED_FROM_IMPORT",
        category: "EMPLOYEE",
        entityId: creationResult.employeeId,
        entityType: "Employee",
        description: `Empleado importado desde archivo (${data.email}).`,
        performedById: performedBy.id,
        performedByEmail: performedBy.email,
        performedByName: performedBy.name ?? performedBy.email,
        performedByRole: performedBy.role,
        orgId,
        entityData: data,
      },
    });

    return { success: true as const };
  } catch (error) {
    await prisma.employeeImportRow.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        errorReason: error instanceof Error ? error.message : "Error desconocido",
      },
    });
    return { success: false as const, error };
  }
}

export async function processEmployeeImportJob(params: {
  jobId: string;
  orgId: string;
  performedBy: ImportPerformedBy;
  userAgent?: string | null;
}) {
  const { jobId, orgId, performedBy, userAgent } = params;

  const job = await prisma.employeeImportJob.findFirst({
    where: { id: jobId, orgId },
    select: {
      id: true,
      status: true,
      options: true,
      orgId: true,
    },
  });

  if (!job) {
    throw new Error("Importación no encontrada.");
  }

  if (job.status === "DONE" || job.status === "FAILED") {
    console.warn(`[EmployeeImport] Job ${jobId} ya finalizado con estado ${job.status}`);
    return;
  }

  if (job.status === "VALIDATED") {
    await prisma.employeeImportJob.update({
      where: { id: jobId },
      data: { status: "RUNNING" },
    });
  }

  const rows = await prisma.employeeImportRow.findMany({
    where: { jobId, status: "READY" },
    orderBy: { rowIndex: "asc" },
  });

  if (!rows.length) {
    await prisma.employeeImportJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });
    return;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { employeeNumberPrefix: true, allowedEmailDomains: true },
  });

  const prefix = organization?.employeeNumberPrefix ?? "EMP";
  const allowedDomains = organization?.allowedEmailDomains ?? [];
  const options = (job.options as EmployeeImportOptions) ?? {
    vacationMode: "BALANCE",
    sendInvites: false,
    departmentPolicy: "REQUIRE_EXISTING",
    managerPolicy: "ALLOW_MISSING_WARNING",
  };

  let successes = 0;
  let failures = 0;

  for (const row of rows) {
    const outcome = await processImportRow({
      row,
      options,
      orgId,
      prefix,
      allowedDomains,
      performedBy,
    });

    if (outcome.success) {
      successes += 1;
    } else {
      failures += 1;
    }
  }

  await recalculateJobCounters(jobId);

  await prisma.employeeImportJob.update({
    where: { id: jobId },
    data: {
      status: failures === rows.length ? "FAILED" : "DONE",
      completedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "BULK_IMPORT_COMPLETED",
      category: "EMPLOYEE",
      entityId: job.id,
      entityType: "EmployeeImportJob",
      description: `Importación completada. Éxitos: ${successes}, errores: ${failures}.`,
      performedById: performedBy.id,
      performedByEmail: performedBy.email,
      performedByName: performedBy.name ?? performedBy.email,
      performedByRole: performedBy.role,
      orgId,
      userAgent: userAgent ?? undefined,
    },
  });

  if (options.sendInvites && successes > 0) {
    try {
      await enqueueEmployeeImportInviteJob({
        jobId,
        orgId,
        mode: "PENDING",
        performedBy,
        userAgent: userAgent ?? undefined,
      });
    } catch (error) {
      console.error("[EmployeeImport] Error encolando invitaciones:", error);
    }
  }
}
