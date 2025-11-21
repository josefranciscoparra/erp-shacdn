"use server";

import { revalidatePath } from "next/cache";

import { resolveAlert as resolveAlertBase, dismissAlert as dismissAlertBase } from "./alert-detection";

/**
 * Resuelve una alerta y revalida la bandeja de aprobaciones
 */
export async function resolveAlert(alertId: string, comment?: string) {
  const result = await resolveAlertBase(alertId, comment);
  if (result.success) {
    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/time-tracking/alerts");
  }
  return result;
}

/**
 * Descarta una alerta y revalida la bandeja de aprobaciones
 */
export async function dismissAlert(alertId: string, comment?: string) {
  const result = await dismissAlertBase(alertId, comment);
  if (result.success) {
    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/time-tracking/alerts");
  }
  return result;
}
