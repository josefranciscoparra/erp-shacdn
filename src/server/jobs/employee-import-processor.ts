import type { EmployeeImportRow } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { hash } from "bcryptjs";

import { sendAuthInviteEmail } from "@/lib/email/email-service";
import type { EmployeeImportOptions, EmployeeImportRowData } from "@/lib/employee-import/types";
import { generateTemporaryPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { validateEmailDomain } from "@/lib/validations/email-domain";
import { createInviteToken, getAppUrl } from "@/server/actions/auth-tokens";
import { recalculateJobCounters } from "@/server/actions/employee-import/service";
import { generateSafeEmployeeNumber } from "@/services/employees";
import { daysToMinutes } from "@/services/pto";

interface ImportPerformedBy {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

async function sendImportInvitation(params: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName?: string | null;
  performedBy: { name: string | null; email: string };
}): Promise<string | null> {
  const { userId, email, firstName, lastName, organizationName, performedBy } = params;

  try {
    const inviteToken = await createInviteToken(userId);
    if (!inviteToken.success || !inviteToken.data) {
      return inviteToken.error ?? "No fue posible generar el token de invitación.";
    }

    const inviteLink = `${await getAppUrl()}/auth/accept-invite?token=${inviteToken.data.token}`;
    const emailResult = await sendAuthInviteEmail({
      to: { email, name: `${firstName} ${lastName}` },
      inviteLink,
      orgId: "", // Se establece internamente
      userId,
      companyName: organizationName ?? undefined,
      inviterName: performedBy.name ?? performedBy.email ?? undefined,
      expiresAt: inviteToken.data.expiresAt,
    });

    if (!emailResult.success) {
      return emailResult.error ?? "No fue posible enviar la invitación.";
    }

    return null;
  } catch (inviteError) {
    console.error("Error enviando invitación de importación:", inviteError);
    return inviteError instanceof Error ? inviteError.message : "Error desconocido al enviar invitación.";
  }
}

async function createEmployeeFromRow(params: {
  data: EmployeeImportRowData;
  options: EmployeeImportOptions;
  orgId: string;
  orgPrefix: string;
  allowedEmailDomains: string[];
  performedById: string;
}) {
  const { data, options, orgId, orgPrefix, allowedEmailDomains, performedById } = params;

  const startDate = new Date(data.startDate);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("La fecha de inicio no es válida.");
  }

  const emailValidation = validateEmailDomain(data.email, allowedEmailDomains);
  if (!emailValidation.valid) {
    throw new Error(emailValidation.error ?? "El correo no pertenece a los dominios permitidos.");
  }

  const userRole =
    data.role && ["EMPLOYEE", "MANAGER", "HR_ADMIN", "ORG_ADMIN"].includes(data.role) ? data.role : "EMPLOYEE";

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await hash(temporaryPassword, 10);
  const workdayMinutes = 480;
  const contractType = data.contractType ?? "INDEFINIDO";
  const weeklyHours = data.weeklyHours ?? 40;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
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

    await tx.temporaryPassword.create({
      data: {
        userId: user.id,
        orgId,
        password: temporaryPassword,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reason: "Importación masiva",
        createdById: performedById,
      },
    });

    const numberResult = await generateSafeEmployeeNumber(tx, orgId, orgPrefix);

    const employee = await tx.employee.create({
      data: {
        employeeNumber: numberResult.employeeNumber,
        requiresEmployeeNumberReview: numberResult.requiresReview,
        firstName: data.firstName,
        lastName: data.lastName,
        secondLastName: data.secondLastName,
        nifNie: data.nifNie,
        email: data.email,
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
      ? await tx.employee.findFirst({
          where: { orgId, email: data.managerEmail },
          select: { id: true },
        })
      : null;

    const contract = await tx.employmentContract.create({
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
      },
      select: { id: true },
    });

    await tx.employeeScheduleAssignment.create({
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

    await tx.ptoBalance.upsert({
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
  });

  return result;
}

async function processImportRow(params: {
  row: EmployeeImportRow;
  options: EmployeeImportOptions;
  orgId: string;
  prefix: string;
  allowedDomains: string[];
  organizationName?: string | null;
  performedBy: {
    id: string;
    email: string;
    role: string;
    name: string | null;
  };
}) {
  const { row, options, orgId, prefix, allowedDomains, performedBy, organizationName } = params;
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

    if (options.sendInvites && data.email) {
      const inviteWarning = await sendImportInvitation({
        userId: creationResult.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationName,
        performedBy,
      });

      if (inviteWarning) {
        const existingMessages = Array.isArray(row.messages) ? row.messages : [];
        await prisma.employeeImportRow.update({
          where: { id: row.id },
          data: {
            messages: [
              ...existingMessages,
              {
                type: "WARNING",
                field: "invite",
                message: `Invitación no enviada: ${inviteWarning}`,
              },
            ],
          },
        });
      }
    }

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
    select: { employeeNumberPrefix: true, allowedEmailDomains: true, name: true },
  });

  const prefix = organization?.employeeNumberPrefix ?? "EMP";
  const allowedDomains = organization?.allowedEmailDomains ?? [];
  const options = (job.options as EmployeeImportOptions) ?? {
    vacationMode: "BALANCE",
    sendInvites: true,
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
      organizationName: organization?.name ?? undefined,
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
}
