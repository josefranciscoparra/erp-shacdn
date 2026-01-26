import { LoginThrottleScope } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const rawThrottleEnabled = process.env.LOGIN_THROTTLE_ENABLED;
export const LOGIN_THROTTLE_ENABLED =
  rawThrottleEnabled === undefined ? true : rawThrottleEnabled.trim().toLowerCase() !== "false";

const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_BLOCK_MINUTES = 15;
const DEFAULT_LIMIT_IP = 25;
const DEFAULT_LIMIT_EMAIL = 5;
const DEFAULT_LIMIT_IP_EMAIL = 10;

const parsedWindowMs = Number(process.env.LOGIN_THROTTLE_WINDOW_MS);
export const LOGIN_THROTTLE_WINDOW_MS =
  Number.isFinite(parsedWindowMs) && parsedWindowMs > 0 ? parsedWindowMs : DEFAULT_WINDOW_MS;

const parsedBlockMinutes = Number(process.env.LOGIN_THROTTLE_BLOCK_MINUTES);
export const LOGIN_THROTTLE_BLOCK_MINUTES =
  Number.isFinite(parsedBlockMinutes) && parsedBlockMinutes > 0 ? parsedBlockMinutes : DEFAULT_BLOCK_MINUTES;

const parsedLimitIp = Number(process.env.LOGIN_THROTTLE_LIMIT_IP);
const parsedLimitEmail = Number(process.env.LOGIN_THROTTLE_LIMIT_EMAIL);
const parsedLimitIpEmail = Number(process.env.LOGIN_THROTTLE_LIMIT_IP_EMAIL);

const LOGIN_THROTTLE_LIMIT_IP = Number.isFinite(parsedLimitIp) && parsedLimitIp > 0 ? parsedLimitIp : DEFAULT_LIMIT_IP;
const LOGIN_THROTTLE_LIMIT_EMAIL =
  Number.isFinite(parsedLimitEmail) && parsedLimitEmail > 0 ? parsedLimitEmail : DEFAULT_LIMIT_EMAIL;
const LOGIN_THROTTLE_LIMIT_IP_EMAIL =
  Number.isFinite(parsedLimitIpEmail) && parsedLimitIpEmail > 0 ? parsedLimitIpEmail : DEFAULT_LIMIT_IP_EMAIL;

type ThrottleKey = {
  key: string;
  scope: LoginThrottleScope;
  limit: number;
};

type RateLimitCheckResult = {
  blocked: boolean;
  blockedUntil: Date | null;
};

type RateLimitInput = {
  ipAddress: string | null;
  email: string | null;
};

function buildThrottleKeys({ ipAddress, email }: RateLimitInput): ThrottleKey[] {
  const keys: ThrottleKey[] = [];

  if (ipAddress) {
    keys.push({ key: `ip:${ipAddress}`, scope: LoginThrottleScope.IP, limit: LOGIN_THROTTLE_LIMIT_IP });
  }

  if (email) {
    keys.push({ key: `email:${email}`, scope: LoginThrottleScope.EMAIL, limit: LOGIN_THROTTLE_LIMIT_EMAIL });
  }

  if (ipAddress && email) {
    keys.push({
      key: `ip-email:${ipAddress}:${email}`,
      scope: LoginThrottleScope.IP_EMAIL,
      limit: LOGIN_THROTTLE_LIMIT_IP_EMAIL,
    });
  }

  return keys;
}

async function touchThrottleAttempt(keyInfo: ThrottleKey, now: Date) {
  const existing = await prisma.loginThrottle.findUnique({
    where: { key: keyInfo.key },
  });

  if (!existing) {
    await prisma.loginThrottle.create({
      data: {
        key: keyInfo.key,
        scope: keyInfo.scope,
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      },
    });
    return;
  }

  if (existing.blockedUntil && existing.blockedUntil > now) {
    await prisma.loginThrottle.update({
      where: { key: keyInfo.key },
      data: { lastAttemptAt: now },
    });
    return;
  }

  const windowExpired = now.getTime() - existing.firstAttemptAt.getTime() > LOGIN_THROTTLE_WINDOW_MS;
  const nextAttempts = windowExpired ? 1 : existing.attempts + 1;
  const nextFirstAttemptAt = windowExpired ? now : existing.firstAttemptAt;
  const shouldBlock = nextAttempts >= keyInfo.limit;
  const blockedUntil = shouldBlock ? new Date(now.getTime() + LOGIN_THROTTLE_BLOCK_MINUTES * 60 * 1000) : null;

  await prisma.loginThrottle.update({
    where: { key: keyInfo.key },
    data: {
      attempts: nextAttempts,
      firstAttemptAt: nextFirstAttemptAt,
      lastAttemptAt: now,
      blockedUntil,
    },
  });
}

export async function checkLoginRateLimit(input: RateLimitInput): Promise<RateLimitCheckResult> {
  if (!LOGIN_THROTTLE_ENABLED) {
    return { blocked: false, blockedUntil: null };
  }

  const keys = buildThrottleKeys(input);
  if (keys.length === 0) {
    return { blocked: false, blockedUntil: null };
  }

  const now = new Date();
  const entries = await prisma.loginThrottle.findMany({
    where: { key: { in: keys.map((entry) => entry.key) } },
  });

  const blockedEntry = entries.find((entry) => entry.blockedUntil && entry.blockedUntil > now);
  if (!blockedEntry) {
    return { blocked: false, blockedUntil: null };
  }

  return { blocked: true, blockedUntil: blockedEntry.blockedUntil ?? null };
}

export async function recordLoginFailureRateLimit(input: RateLimitInput): Promise<void> {
  if (!LOGIN_THROTTLE_ENABLED) {
    return;
  }

  const keys = buildThrottleKeys(input);
  if (keys.length === 0) {
    return;
  }

  const now = new Date();
  for (const keyInfo of keys) {
    await touchThrottleAttempt(keyInfo, now);
  }
}

export async function clearLoginRateLimitForUser(input: RateLimitInput): Promise<void> {
  if (!LOGIN_THROTTLE_ENABLED) {
    return;
  }

  if (!input.email) {
    return;
  }

  const keys = buildThrottleKeys(input)
    .filter((entry) => entry.scope !== LoginThrottleScope.IP)
    .map((entry) => entry.key);

  if (keys.length === 0) {
    return;
  }

  await prisma.loginThrottle.deleteMany({
    where: { key: { in: keys } },
  });
}
