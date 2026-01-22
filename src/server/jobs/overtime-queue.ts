import { getBoss } from "@/server/jobs/boss";

export const OVERTIME_WORKDAY_JOB = "overtime.workday.process";
export const OVERTIME_WEEKLY_RECONCILIATION_JOB = "overtime.weekly.reconcile";
export const OVERTIME_WORKDAY_SWEEP_JOB = "overtime.workday.sweep";
export const OVERTIME_AUTHORIZATION_EXPIRE_JOB = "overtime.authorization.expire";

export interface OvertimeWorkdayJobPayload {
  orgId: string;
  employeeId: string;
  date: string; // ISO date (YYYY-MM-DD)
}

export interface OvertimeWeeklyJobPayload {
  orgId: string;
  weekStart: string; // ISO date (YYYY-MM-DD, lunes)
}

export interface OvertimeWorkdaySweepPayload {
  orgId: string;
  lookbackDays: number;
}

export interface OvertimeAuthorizationExpirePayload {
  orgId: string;
  expiryDays: number;
}

function buildSingletonKey(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(":");
}

export async function enqueueOvertimeWorkdayJob(payload: OvertimeWorkdayJobPayload) {
  const boss = await getBoss();

  await boss.createQueue(OVERTIME_WORKDAY_JOB);

  await boss.send(OVERTIME_WORKDAY_JOB, payload, {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    singletonKey: buildSingletonKey([payload.orgId, payload.employeeId, payload.date]),
    expireInSeconds: 60 * 30,
  });
}

export async function enqueueOvertimeWeeklyReconciliationJob(payload: OvertimeWeeklyJobPayload) {
  const boss = await getBoss();

  await boss.createQueue(OVERTIME_WEEKLY_RECONCILIATION_JOB);

  await boss.send(OVERTIME_WEEKLY_RECONCILIATION_JOB, payload, {
    retryLimit: 2,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: buildSingletonKey([payload.orgId, payload.weekStart]),
    singletonSeconds: 60 * 60,
    expireInSeconds: 60 * 60,
  });
}

export async function enqueueOvertimeWorkdaySweepJob(payload: OvertimeWorkdaySweepPayload) {
  const boss = await getBoss();

  await boss.createQueue(OVERTIME_WORKDAY_SWEEP_JOB);

  await boss.send(OVERTIME_WORKDAY_SWEEP_JOB, payload, {
    retryLimit: 1,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: buildSingletonKey([payload.orgId, `sweep-${payload.lookbackDays}`]),
    singletonSeconds: 60 * 60,
    expireInSeconds: 60 * 60,
  });
}

export async function enqueueOvertimeAuthorizationExpireJob(payload: OvertimeAuthorizationExpirePayload) {
  const boss = await getBoss();

  await boss.createQueue(OVERTIME_AUTHORIZATION_EXPIRE_JOB);

  await boss.send(OVERTIME_AUTHORIZATION_EXPIRE_JOB, payload, {
    retryLimit: 1,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: buildSingletonKey([payload.orgId, `auth-expire-${payload.expiryDays}`]),
    singletonSeconds: 60 * 60,
    expireInSeconds: 60 * 60,
  });
}
