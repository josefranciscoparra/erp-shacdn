import { getBoss } from "@/server/jobs/boss";

export const TIME_TRACKING_ROLLOVER_JOB = "time-tracking.open-punches.rollover";
export const TIME_TRACKING_SAFETY_CLOSE_JOB = "time-tracking.open-punches.safety-close";
export const TIME_TRACKING_ON_CALL_SETTLEMENT_JOB = "time-tracking.on-call.settlement";

export interface TimeTrackingRolloverPayload {
  orgId: string;
  lookbackDays: number;
}

export interface TimeTrackingSafetyClosePayload {
  orgId: string;
}

export interface TimeTrackingOnCallSettlementPayload {
  orgId: string;
  lookbackDays: number;
}

function buildSingletonKey(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(":");
}

export async function enqueueTimeTrackingRolloverJob(payload: TimeTrackingRolloverPayload) {
  const boss = await getBoss();

  await boss.createQueue(TIME_TRACKING_ROLLOVER_JOB);

  await boss.send(TIME_TRACKING_ROLLOVER_JOB, payload, {
    retryLimit: 1,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: buildSingletonKey([payload.orgId, `rollover-${payload.lookbackDays}`]),
    singletonSeconds: 60 * 30,
    expireInSeconds: 60 * 60,
  });
}

export async function enqueueTimeTrackingSafetyCloseJob(payload: TimeTrackingSafetyClosePayload) {
  const boss = await getBoss();

  await boss.createQueue(TIME_TRACKING_SAFETY_CLOSE_JOB);

  await boss.send(TIME_TRACKING_SAFETY_CLOSE_JOB, payload, {
    retryLimit: 1,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: buildSingletonKey([payload.orgId, "safety-close"]),
    singletonSeconds: 60 * 15,
    expireInSeconds: 60 * 30,
  });
}

export async function enqueueTimeTrackingOnCallSettlementJob(payload: TimeTrackingOnCallSettlementPayload) {
  const boss = await getBoss();

  await boss.createQueue(TIME_TRACKING_ON_CALL_SETTLEMENT_JOB);

  await boss.send(TIME_TRACKING_ON_CALL_SETTLEMENT_JOB, payload, {
    retryLimit: 1,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: buildSingletonKey([payload.orgId, `on-call-${payload.lookbackDays}`]),
    singletonSeconds: 60 * 30,
    expireInSeconds: 60 * 60,
  });
}
