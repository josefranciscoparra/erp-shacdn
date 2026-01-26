-- CreateEnum
CREATE TYPE "LoginThrottleScope" AS ENUM ('IP', 'EMAIL', 'IP_EMAIL');

-- CreateTable
CREATE TABLE "public"."login_throttles" (
    "key" TEXT NOT NULL,
    "scope" "LoginThrottleScope" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3) NOT NULL,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_throttles_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "login_throttles_scope_idx" ON "public"."login_throttles"("scope");

-- CreateIndex
CREATE INDEX "login_throttles_blockedUntil_idx" ON "public"."login_throttles"("blockedUntil");
