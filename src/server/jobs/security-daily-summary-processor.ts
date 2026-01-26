import type { Prisma } from "@prisma/client";

import { sendSecurityDailySummaryEmail } from "@/lib/email/email-service";
import type { EmailRecipient } from "@/lib/email/types";
import { prisma } from "@/lib/prisma";
import { getLocalDayEndUtc, getLocalDayStartUtc } from "@/lib/timezone-utils";

const DEFAULT_TIMEZONE = "Europe/Madrid";
const DEFAULT_WINDOW_MINUTES = 30;
const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_DISPATCH_INTERVAL_MINUTES = 10;

const SECURITY_ACTIONS = ["LOGIN_FAILED", "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED"] as const;
type SecurityAction = (typeof SECURITY_ACTIONS)[number];

type SecurityDailySummaryConfig = {
  enabled: boolean;
  timeZone: string;
  dispatchHour: number;
  dispatchMinute: number;
  windowMinutes: number;
  lookbackHours: number;
  dispatchIntervalMinutes: number;
  recipients: EmailRecipient[];
  orgIds: string[];
  sendEmpty: boolean;
};

type SecuritySummaryBucket = {
  orgId: string | null;
  loginFailed: number;
  accountLocked: number;
  accountUnlocked: number;
  total: number;
};

type GlobalSecuritySummarySettings = {
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
};

function parseRecipientEntry(entry: string): EmailRecipient | null {
  const match = /^(.*)<([^>]+)>$/.exec(entry);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    if (!email.includes("@")) {
      return null;
    }
    return {
      email,
      name: name.length > 0 ? name : undefined,
    };
  }

  const trimmed = entry.trim();
  if (!trimmed.includes("@")) {
    return null;
  }

  return { email: trimmed };
}

function parseRecipientsFromArray(entries: string[]): EmailRecipient[] {
  const recipients: EmailRecipient[] = [];
  for (const entry of entries) {
    const parsed = parseRecipientEntry(entry);
    if (parsed) {
      recipients.push(parsed);
    }
  }
  return recipients;
}

async function fetchGlobalSettings(): Promise<GlobalSecuritySummarySettings | null> {
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

function normalizeFromSettings(settings: GlobalSecuritySummarySettings): SecurityDailySummaryConfig {
  return {
    enabled: typeof settings.securityDailySummaryEnabled === "boolean" ? settings.securityDailySummaryEnabled : false,
    timeZone: settings.securityDailySummaryTimezone ?? DEFAULT_TIMEZONE,
    dispatchHour: Number.isFinite(settings.securityDailySummaryHour) ? settings.securityDailySummaryHour : 22,
    dispatchMinute: Number.isFinite(settings.securityDailySummaryMinute) ? settings.securityDailySummaryMinute : 0,
    windowMinutes: Number.isFinite(settings.securityDailySummaryWindowMinutes)
      ? settings.securityDailySummaryWindowMinutes
      : DEFAULT_WINDOW_MINUTES,
    lookbackHours: Number.isFinite(settings.securityDailySummaryLookbackHours)
      ? settings.securityDailySummaryLookbackHours
      : DEFAULT_LOOKBACK_HOURS,
    dispatchIntervalMinutes: Number.isFinite(settings.securityDailySummaryDispatchIntervalMinutes)
      ? settings.securityDailySummaryDispatchIntervalMinutes
      : DEFAULT_DISPATCH_INTERVAL_MINUTES,
    recipients: parseRecipientsFromArray(settings.securityDailySummaryRecipients ?? []),
    orgIds: settings.securityDailySummaryOrgIds ?? [],
    sendEmpty:
      typeof settings.securityDailySummarySendEmpty === "boolean" ? settings.securityDailySummarySendEmpty : true,
  };
}

export async function resolveSecurityDailySummaryConfig(): Promise<SecurityDailySummaryConfig> {
  const settings = await fetchGlobalSettings();
  if (!settings) {
    return {
      enabled: false,
      timeZone: DEFAULT_TIMEZONE,
      dispatchHour: 22,
      dispatchMinute: 0,
      windowMinutes: DEFAULT_WINDOW_MINUTES,
      lookbackHours: DEFAULT_LOOKBACK_HOURS,
      dispatchIntervalMinutes: DEFAULT_DISPATCH_INTERVAL_MINUTES,
      recipients: [],
      orgIds: [],
      sendEmpty: true,
    };
  }

  return normalizeFromSettings(settings);
}

function resolveBucketKey(orgId: string | null) {
  return orgId ?? "__unassigned__";
}

function buildBuckets(groups: Array<{ orgId: string | null; action: SecurityAction; count: number }>) {
  const buckets = new Map<string, SecuritySummaryBucket>();

  for (const group of groups) {
    const key = resolveBucketKey(group.orgId);
    const existing = buckets.get(key) ?? {
      orgId: group.orgId,
      loginFailed: 0,
      accountLocked: 0,
      accountUnlocked: 0,
      total: 0,
    };

    const count = group.count;
    if (group.action === "LOGIN_FAILED") {
      existing.loginFailed += count;
    } else if (group.action === "ACCOUNT_LOCKED") {
      existing.accountLocked += count;
    } else if (group.action === "ACCOUNT_UNLOCKED") {
      existing.accountUnlocked += count;
    }

    existing.total += count;
    buckets.set(key, existing);
  }

  return buckets;
}

async function resolveOrganizationNames(orgIds: string[]) {
  if (orgIds.length === 0) return new Map<string, string>();

  const organizations = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true },
  });

  return new Map(organizations.map((org) => [org.id, org.name]));
}

export async function processSecurityDailySummary(referenceTime: Date = new Date()): Promise<void> {
  const config = await resolveSecurityDailySummaryConfig();
  if (!config.enabled) return;

  if (config.recipients.length === 0) {
    console.warn("[SecuritySummary] No hay destinatarios configurados para el resumen diario.");
    return;
  }

  const dayStartUtc = getLocalDayStartUtc(referenceTime, config.timeZone);
  const dayEndUtc = getLocalDayEndUtc(referenceTime, config.timeZone);

  const recipientEmails = config.recipients.map((recipient) => recipient.email.toLowerCase());
  const alreadySent = await prisma.emailLog.findMany({
    where: {
      templateId: "SECURITY_DAILY_SUMMARY",
      status: "SUCCESS",
      createdAt: {
        gte: dayStartUtc,
        lt: dayEndUtc,
      },
      toEmail: { in: recipientEmails },
    },
    select: { toEmail: true },
  });

  const sentEmails = new Set(alreadySent.map((entry) => entry.toEmail.toLowerCase()));
  const recipientsToSend = config.recipients.filter((recipient) => !sentEmails.has(recipient.email.toLowerCase()));

  if (recipientsToSend.length === 0) {
    return;
  }

  const rangeEnd = referenceTime;
  const rangeStart = new Date(rangeEnd.getTime() - config.lookbackHours * 60 * 60 * 1000);

  const where: Prisma.AuditLogWhereInput = {
    action: { in: SECURITY_ACTIONS },
    createdAt: {
      gte: rangeStart,
      lt: rangeEnd,
    },
  };

  if (config.orgIds.length > 0) {
    where.orgId = { in: config.orgIds };
  }

  const grouped = await prisma.auditLog.groupBy({
    by: ["orgId", "action"],
    where,
    _count: { _all: true },
  });

  const groups = grouped.map((group) => ({
    orgId: group.orgId,
    action: group.action as SecurityAction,
    // eslint-disable-next-line no-underscore-dangle
    count: group._count._all,
  }));

  const buckets = buildBuckets(groups);
  const orgIds = Array.from(buckets.values())
    .map((bucket) => bucket.orgId)
    .filter((orgId): orgId is string => Boolean(orgId));
  const orgNames = await resolveOrganizationNames(orgIds);

  const orgSummaries = Array.from(buckets.values()).map((bucket) => ({
    orgName: bucket.orgId ? (orgNames.get(bucket.orgId) ?? "Organización desconocida") : "Sin organización",
    loginFailed: bucket.loginFailed,
    accountLocked: bucket.accountLocked,
    accountUnlocked: bucket.accountUnlocked,
    total: bucket.total,
  }));

  orgSummaries.sort((a, b) => {
    if (a.total !== b.total) return b.total - a.total;
    return a.orgName.localeCompare(b.orgName, "es");
  });

  const totalLoginFailed = orgSummaries.reduce((acc, item) => acc + item.loginFailed, 0);
  const totalAccountLocked = orgSummaries.reduce((acc, item) => acc + item.accountLocked, 0);
  const totalAccountUnlocked = orgSummaries.reduce((acc, item) => acc + item.accountUnlocked, 0);
  const totalEvents = totalLoginFailed + totalAccountLocked + totalAccountUnlocked;

  if (!config.sendEmpty && totalEvents === 0) {
    return;
  }

  const metadata = {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
  };

  for (const recipient of recipientsToSend) {
    await sendSecurityDailySummaryEmail({
      to: recipient,
      rangeStart,
      rangeEnd,
      totalEvents,
      totalLoginFailed,
      totalAccountLocked,
      totalAccountUnlocked,
      orgSummaries,
      metadata,
      sendMode: "immediate",
    });
  }
}
