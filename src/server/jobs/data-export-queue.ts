import { getBoss } from "@/server/jobs/boss";

export const DATA_EXPORT_JOB = "data-export.generate";
export const DATA_EXPORT_CLEANUP_JOB = "data-export.cleanup";

export interface DataExportJobPayload {
  exportId: string;
}

export async function enqueueDataExportJob(payload: DataExportJobPayload) {
  const boss = await getBoss();

  await boss.createQueue(DATA_EXPORT_JOB);

  await boss.send(DATA_EXPORT_JOB, payload, {
    retryLimit: 3,
    retryDelay: 120,
    retryBackoff: true,
    expireInSeconds: 60 * 60,
  });
}

export async function enqueueDataExportCleanupJob() {
  const boss = await getBoss();

  await boss.createQueue(DATA_EXPORT_CLEANUP_JOB);

  await boss.send(DATA_EXPORT_CLEANUP_JOB, {}, { retryLimit: 1, retryDelay: 60, retryBackoff: true });
}
