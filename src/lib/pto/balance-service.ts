import { prisma } from "@/lib/prisma";
import {
  calculateVacationBalance,
  calculateWorkdayMinutes,
  daysToMinutes,
  minutesToDays,
  roundDays,
} from "@/lib/vacation";
import { DiscontinuousVacationStrategy } from "@/lib/vacation/strategies/discontinuous-strategy";
import { StandardVacationStrategy } from "@/lib/vacation/strategies/standard-strategy";
import type { CalculateBalanceOptions, ContractInfo, VacationBalance } from "@/lib/vacation/types";
import { calculateUsageFromRequests } from "@/lib/vacation/utils/usage-utils";

import { DEFAULT_PTO_BALANCE_TYPE, type PtoBalanceType } from "./balance-types";

const standardStrategy = new StandardVacationStrategy();
const discontinuousStrategy = new DiscontinuousVacationStrategy();

const BALANCE_LABELS: Record<PtoBalanceType, string> = {
  VACATION: "Vacaciones asignadas",
  PERSONAL_MATTERS: "Asuntos propios asignados",
  COMP_TIME: "Compensación asignada",
};

function getStrategy(contractType: string) {
  if (contractType === "FIJO_DISCONTINUO") {
    return discontinuousStrategy;
  }
  return standardStrategy;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toContractInfo(contract: any): ContractInfo {
  const weeklyHours = typeof contract.weeklyHours === "number" ? contract.weeklyHours : contract.weeklyHours.toNumber();
  const workingDaysPerWeek =
    typeof contract.workingDaysPerWeek === "number"
      ? contract.workingDaysPerWeek
      : contract.workingDaysPerWeek.toNumber();

  return {
    id: contract.id,
    contractType: contract.contractType,
    startDate: contract.startDate,
    endDate: contract.endDate,
    weeklyHours,
    workingDaysPerWeek,
    workdayMinutes: contract.workdayMinutes,
    discontinuousStatus: contract.discontinuousStatus as "ACTIVE" | "PAUSED" | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pauseHistory: (contract.pauseHistory ?? []).map((ph: any) => ({
      id: ph.id,
      action: ph.action as "PAUSE" | "RESUME",
      startDate: ph.startDate,
      endDate: ph.endDate,
      reason: ph.reason,
      performedAt: ph.performedAt,
    })),
  };
}

function resolveAnnualDays(
  balanceType: PtoBalanceType,
  organization: {
    annualPtoDays?: number | null;
    ptoConfig?: {
      personalMattersDays?: unknown | null;
      compTimeDays?: unknown | null;
    } | null;
  },
): number {
  if (balanceType === "VACATION") {
    return organization.annualPtoDays ?? 23;
  }

  const personalMattersDays =
    organization.ptoConfig?.personalMattersDays === null || organization.ptoConfig?.personalMattersDays === undefined
      ? 0
      : Number(organization.ptoConfig.personalMattersDays);
  const compTimeDays =
    organization.ptoConfig?.compTimeDays === null || organization.ptoConfig?.compTimeDays === undefined
      ? 0
      : Number(organization.ptoConfig.compTimeDays);

  if (balanceType === "PERSONAL_MATTERS") {
    return personalMattersDays;
  }

  return compTimeDays;
}

async function getBalanceAdjustments(
  employeeId: string,
  orgId: string,
  year: number,
  balanceType: PtoBalanceType,
  workdayMinutes: number,
): Promise<{ days: number; minutes: number }> {
  const manualAdjustments = await prisma.ptoBalanceAdjustment.findMany({
    where: {
      orgId,
      ptoBalance: {
        employeeId,
        year,
        balanceType,
      },
    },
    select: {
      daysAdjusted: true,
    },
  });

  const recurringAdjustments = await prisma.recurringPtoAdjustment.findMany({
    where: {
      employeeId,
      orgId,
      active: true,
      startYear: {
        lte: year,
      },
      balanceType,
    },
    select: {
      extraDays: true,
    },
  });

  const manualDays = manualAdjustments.reduce((total, adj) => total + Number(adj.daysAdjusted), 0);
  const recurringDays = recurringAdjustments.reduce((total, adj) => total + Number(adj.extraDays), 0);
  const totalDays = manualDays + recurringDays;

  return {
    days: totalDays,
    minutes: daysToMinutes(totalDays, workdayMinutes),
  };
}

export type PtoBalanceSnapshot = VacationBalance & { balanceType: PtoBalanceType };

export async function calculatePtoBalanceByType(
  employeeId: string,
  balanceType: PtoBalanceType = DEFAULT_PTO_BALANCE_TYPE,
  options: CalculateBalanceOptions = {},
): Promise<PtoBalanceSnapshot> {
  if (balanceType === "VACATION") {
    const vacationBalance = await calculateVacationBalance(employeeId, options);
    return {
      ...vacationBalance,
      balanceType: "VACATION",
    };
  }

  const { year = new Date().getFullYear() } = options;
  const cutoffDate = options.cutoffDate ?? new Date();
  const includePending = options.includePending ?? true;
  const accrualMode = options.accrualMode ?? "ASSIGNED";

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      organization: {
        select: {
          annualPtoDays: true,
          ptoConfig: {
            select: {
              personalMattersDays: true,
              compTimeDays: true,
            },
          },
        },
      },
      employmentContracts: {
        where: { active: true },
        include: {
          pauseHistory: {
            orderBy: { startDate: "asc" },
          },
        },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  const contract = employee.employmentContracts[0];
  if (!contract) {
    throw new Error("El empleado no tiene contrato activo");
  }

  const annualDays = resolveAnnualDays(balanceType, employee.organization);
  const contractInfo = toContractInfo(contract);
  const workdayMinutes =
    contract.workdayMinutes ?? calculateWorkdayMinutes(contractInfo.weeklyHours, contractInfo.workingDaysPerWeek);
  const strategy = getStrategy(contract.contractType);
  const accrued = strategy.calculateAccrued(contractInfo, cutoffDate, annualDays, workdayMinutes);
  const adjustments = await getBalanceAdjustments(employeeId, employee.orgId, year, balanceType, workdayMinutes);
  const assignedBaseDays = accrued.assignedDays ?? annualDays;
  const annualAllowanceDays = roundDays(assignedBaseDays + adjustments.days);

  const accrualBaseDays =
    accrualMode === "ASSIGNED" && accrued.assignedDays !== undefined ? accrued.assignedDays : accrued.days;
  const accrualBaseMinutes =
    accrualMode === "ASSIGNED" && accrued.assignedDays !== undefined
      ? daysToMinutes(accrualBaseDays, workdayMinutes)
      : accrued.minutes;

  const accruedMinutesWithAdjustments = accrualBaseMinutes + adjustments.minutes;
  const accruedDaysWithAdjustments = roundDays(minutesToDays(accruedMinutesWithAdjustments, workdayMinutes));

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const ptoRequests = await prisma.ptoRequest.findMany({
    where: {
      employeeId,
      absenceType: {
        affectsBalance: true,
        balanceType,
      },
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
    },
    select: {
      status: true,
      durationMinutes: true,
      effectiveMinutes: true,
      workingDays: true,
      startDate: true,
      endDate: true,
      submittedAt: true,
    },
  });

  const usageAllYear = calculateUsageFromRequests(ptoRequests, workdayMinutes, {
    includePending,
    cutoffDate,
    windowStart: yearStart,
    windowEnd: yearEnd,
  });

  const usageAllYearTotal = usageAllYear.usedMinutes + usageAllYear.pendingMinutes;
  const availableMinutes = accruedMinutesWithAdjustments - usageAllYearTotal;

  return {
    annualAllowanceDays,
    accruedDays: roundDays(accruedDaysWithAdjustments),
    usedDays: usageAllYear.usedDays,
    pendingDays: usageAllYear.pendingDays,
    availableDays: roundDays(minutesToDays(availableMinutes, workdayMinutes)),
    accruedMinutes: accruedMinutesWithAdjustments,
    usedMinutes: usageAllYear.usedMinutes,
    pendingMinutes: usageAllYear.pendingMinutes,
    availableMinutes: Math.max(0, availableMinutes),
    workdayMinutes,
    displayLabel: BALANCE_LABELS[balanceType] ?? "Balance asignado",
    contractType: contract.contractType,
    discontinuousStatus: contractInfo.discontinuousStatus,
    balanceType,
  };
}
