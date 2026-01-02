import { upsertRowMessage } from "@/lib/employee-import/message-utils";
import type { EmployeeImportOptions, EmployeeImportRowData, RowMessage } from "@/lib/employee-import/types";
import { prisma } from "@/lib/prisma";
import { recalculateJobCounters } from "@/server/actions/employee-import/service";
import { createEmployeeFromRow } from "@/server/jobs/employee-import-processor";

class SimulationRollbackError extends Error {
  constructor() {
    super("SIMULATION_ROLLBACK");
  }
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Error desconocido";
}

async function simulateEmployeeCreation(params: {
  data: EmployeeImportRowData;
  options: EmployeeImportOptions;
  orgId: string;
  orgPrefix: string;
  allowedEmailDomains: string[];
  performedById: string;
}) {
  try {
    await prisma.$transaction(async (tx) => {
      await createEmployeeFromRow({
        ...params,
        db: tx,
      });
      throw new SimulationRollbackError();
    });
  } catch (error) {
    if (error instanceof SimulationRollbackError) {
      return { success: true as const };
    }
    return { success: false as const, error };
  }
}

export async function processEmployeeImportSimulation(params: {
  jobId: string;
  orgId: string;
  performedBy: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  userAgent?: string | null;
}) {
  const { jobId, orgId, performedBy, userAgent } = params;

  const job = await prisma.employeeImportJob.findFirst({
    where: { id: jobId, orgId },
    select: { id: true, status: true, options: true, orgId: true },
  });

  if (!job) {
    throw new Error("Importación no encontrada.");
  }

  if (job.status !== "VALIDATED" && job.status !== "RUNNING") {
    throw new Error("La importación no está lista para simular.");
  }

  const rows = await prisma.employeeImportRow.findMany({
    where: { jobId, status: "READY" },
    orderBy: { rowIndex: "asc" },
  });

  if (!rows.length) {
    return { simulated: 0, failed: 0 };
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

  let simulated = 0;
  let failed = 0;

  for (const row of rows) {
    const data = row.rawData as EmployeeImportRowData | undefined;
    const messages = Array.isArray(row.messages) ? (row.messages as RowMessage[]) : [];

    if (!data) {
      const updatedMessages = upsertRowMessage({
        messages,
        field: "simulation",
        type: "ERROR",
        message: "Simulación fallida: la fila no tiene datos normalizados.",
      });

      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: {
          status: "ERROR",
          messages: updatedMessages,
          errorReason: "Simulación fallida: la fila no tiene datos normalizados.",
        },
      });
      failed += 1;
      continue;
    }

    const outcome = await simulateEmployeeCreation({
      data,
      options,
      orgId,
      orgPrefix: prefix,
      allowedEmailDomains: allowedDomains,
      performedById: performedBy.id,
    });

    if (outcome.success) {
      const updatedMessages = upsertRowMessage({
        messages,
        field: "simulation",
        type: "SUCCESS",
        message: "Simulación OK: la fila se puede importar.",
      });

      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: {
          status: "READY",
          messages: updatedMessages,
          errorReason: null,
        },
      });
      simulated += 1;
    } else {
      const errorMessage = resolveErrorMessage(outcome.error);
      const updatedMessages = upsertRowMessage({
        messages,
        field: "simulation",
        type: "ERROR",
        message: `Simulación fallida: ${errorMessage}`,
      });

      await prisma.employeeImportRow.update({
        where: { id: row.id },
        data: {
          status: "ERROR",
          messages: updatedMessages,
          errorReason: errorMessage,
        },
      });
      failed += 1;
    }
  }

  await recalculateJobCounters(jobId);

  await prisma.auditLog.create({
    data: {
      action: "BULK_IMPORT_SIMULATION_COMPLETED",
      category: "EMPLOYEE",
      entityId: job.id,
      entityType: "EmployeeImportJob",
      description: `Simulación completada. OK: ${simulated}, errores: ${failed}.`,
      performedById: performedBy.id,
      performedByEmail: performedBy.email,
      performedByName: performedBy.name ?? performedBy.email,
      performedByRole: performedBy.role,
      orgId,
      userAgent: userAgent ?? undefined,
    },
  });

  return { simulated, failed };
}
