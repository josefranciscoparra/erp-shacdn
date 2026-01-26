"use server";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS = {
  securityDailySummaryEnabled: false,
  securityDailySummaryHour: 22,
  securityDailySummaryMinute: 0,
  securityDailySummaryWindowMinutes: 30,
  securityDailySummaryLookbackHours: 24,
  securityDailySummaryDispatchIntervalMinutes: 10,
  securityDailySummaryTimezone: "Europe/Madrid",
  securityDailySummaryRecipients: [] as string[],
  securityDailySummaryOrgIds: [] as string[],
  securityDailySummarySendEmpty: true,
} as const;

type SuperAdminContext = {
  userId: string;
  role: Role;
  orgId: string;
  email: string;
  name: string;
};

async function requireSuperAdmin(): Promise<SuperAdminContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  const role = session.user.role as Role;
  if (role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return {
    userId: session.user.id,
    role,
    orgId: session.user.orgId,
    email: session.user.email,
    name: session.user.name ?? session.user.email ?? "Superadmin",
  };
}

export interface GlobalSecurityDailySummarySettings {
  enabled: boolean;
  timeZone: string;
  dispatchHour: number;
  dispatchMinute: number;
  windowMinutes: number;
  lookbackHours: number;
  dispatchIntervalMinutes: number;
  recipients: string[];
  orgIds: string[];
  sendEmpty: boolean;
}

function normalizeStringArray(values?: string[] | null) {
  if (!values || values.length === 0) return [];
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeSettings(
  settings: {
    securityDailySummaryEnabled: boolean;
    securityDailySummaryHour: number;
    securityDailySummaryMinute: number;
    securityDailySummaryWindowMinutes: number;
    securityDailySummaryLookbackHours: number;
    securityDailySummaryDispatchIntervalMinutes: number;
    securityDailySummaryTimezone: string;
    securityDailySummaryRecipients: string[];
    securityDailySummaryOrgIds: string[];
    securityDailySummarySendEmpty: boolean;
  } | null,
): GlobalSecurityDailySummarySettings {
  return {
    enabled:
      typeof settings?.securityDailySummaryEnabled === "boolean"
        ? settings.securityDailySummaryEnabled
        : DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS.securityDailySummaryEnabled,
    timeZone:
      settings && settings.securityDailySummaryTimezone
        ? settings.securityDailySummaryTimezone
        : DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS.securityDailySummaryTimezone,
    dispatchHour:
      typeof settings?.securityDailySummaryHour === "number"
        ? settings.securityDailySummaryHour
        : DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS.securityDailySummaryHour,
    dispatchMinute:
      typeof settings?.securityDailySummaryMinute === "number"
        ? settings.securityDailySummaryMinute
        : DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS.securityDailySummaryMinute,
    windowMinutes:
      typeof settings?.securityDailySummaryWindowMinutes === "number"
        ? settings.securityDailySummaryWindowMinutes
        : DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS.securityDailySummaryWindowMinutes,
    lookbackHours:
      typeof settings?.securityDailySummaryLookbackHours === "number"
        ? settings.securityDailySummaryLookbackHours
        : DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS.securityDailySummaryLookbackHours,
    dispatchIntervalMinutes:
      typeof settings?.securityDailySummaryDispatchIntervalMinutes === "number"
        ? settings.securityDailySummaryDispatchIntervalMinutes
        : DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS.securityDailySummaryDispatchIntervalMinutes,
    recipients: normalizeStringArray(settings?.securityDailySummaryRecipients),
    orgIds: normalizeStringArray(settings?.securityDailySummaryOrgIds),
    sendEmpty:
      typeof settings?.securityDailySummarySendEmpty === "boolean"
        ? settings.securityDailySummarySendEmpty
        : DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS.securityDailySummarySendEmpty,
  };
}

async function fetchGlobalSettings() {
  return prisma.globalSettings.findUnique({
    where: { id: "global" },
    select: {
      securityDailySummaryEnabled: true,
      securityDailySummaryHour: true,
      securityDailySummaryMinute: true,
      securityDailySummaryWindowMinutes: true,
      securityDailySummaryLookbackHours: true,
      securityDailySummaryDispatchIntervalMinutes: true,
      securityDailySummaryTimezone: true,
      securityDailySummaryRecipients: true,
      securityDailySummaryOrgIds: true,
      securityDailySummarySendEmpty: true,
    },
  });
}

function normalizeRecipients(list: string[]) {
  return list
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = /^(.*)<([^>]+)>$/.exec(entry);
      if (!match) return entry;
      const name = match[1].trim();
      const email = match[2].trim();
      if (!email) return entry;
      return name ? `${name} <${email}>` : email;
    })
    .filter((entry) => entry.includes("@"));
}

function normalizeOrgIds(list: string[]) {
  return list.map((entry) => entry.trim()).filter(Boolean);
}

function validateTimezone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone }).format(new Date());
  } catch {
    throw new Error("Zona horaria inválida");
  }
}

export async function getGlobalSecurityDailySummarySettings(): Promise<GlobalSecurityDailySummarySettings> {
  await requireSuperAdmin();
  const settings = await fetchGlobalSettings();
  return normalizeSettings(settings);
}

export async function updateGlobalSecurityDailySummarySettings(
  data: GlobalSecurityDailySummarySettings,
): Promise<{ success: boolean }> {
  const context = await requireSuperAdmin();

  if (data.dispatchHour < 0 || data.dispatchHour > 23) {
    throw new Error("La hora debe estar entre 0 y 23");
  }
  if (data.dispatchMinute < 0 || data.dispatchMinute > 59) {
    throw new Error("Los minutos deben estar entre 0 y 59");
  }
  if (data.windowMinutes < 5 || data.windowMinutes > 180) {
    throw new Error("La ventana debe estar entre 5 y 180 minutos");
  }
  if (data.lookbackHours < 1 || data.lookbackHours > 168) {
    throw new Error("El periodo debe estar entre 1 y 168 horas");
  }
  if (data.dispatchIntervalMinutes < 1 || data.dispatchIntervalMinutes > 60) {
    throw new Error("El intervalo debe estar entre 1 y 60 minutos");
  }

  validateTimezone(data.timeZone);

  const recipients = normalizeRecipients(data.recipients);
  const orgIds = normalizeOrgIds(data.orgIds);

  if (data.enabled && recipients.length === 0) {
    throw new Error("Debes indicar al menos un destinatario");
  }

  const previous = await fetchGlobalSettings();

  await prisma.globalSettings.upsert({
    where: { id: "global" },
    update: {
      securityDailySummaryEnabled: data.enabled,
      securityDailySummaryHour: data.dispatchHour,
      securityDailySummaryMinute: data.dispatchMinute,
      securityDailySummaryWindowMinutes: data.windowMinutes,
      securityDailySummaryLookbackHours: data.lookbackHours,
      securityDailySummaryDispatchIntervalMinutes: data.dispatchIntervalMinutes,
      securityDailySummaryTimezone: data.timeZone,
      securityDailySummaryRecipients: recipients,
      securityDailySummaryOrgIds: orgIds,
      securityDailySummarySendEmpty: data.sendEmpty,
    },
    create: {
      id: "global",
      securityDailySummaryEnabled: data.enabled,
      securityDailySummaryHour: data.dispatchHour,
      securityDailySummaryMinute: data.dispatchMinute,
      securityDailySummaryWindowMinutes: data.windowMinutes,
      securityDailySummaryLookbackHours: data.lookbackHours,
      securityDailySummaryDispatchIntervalMinutes: data.dispatchIntervalMinutes,
      securityDailySummaryTimezone: data.timeZone,
      securityDailySummaryRecipients: recipients,
      securityDailySummaryOrgIds: orgIds,
      securityDailySummarySendEmpty: data.sendEmpty,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "GLOBAL_SECURITY_DAILY_SUMMARY_UPDATED",
      category: "SETTINGS",
      entityId: "global",
      entityType: "GlobalSettings",
      entityData: {
        previous: previous ?? DEFAULT_SECURITY_DAILY_SUMMARY_SETTINGS,
        next: {
          ...data,
          recipients,
          orgIds,
        },
      },
      description: `Resumen diario de seguridad actualizado por ${context.name ?? context.email}`,
      performedById: context.userId,
      performedByEmail: context.email,
      performedByName: context.name,
      performedByRole: context.role,
      orgId: context.orgId,
    },
  });

  return { success: true };
}
