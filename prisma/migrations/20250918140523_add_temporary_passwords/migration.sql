-- CreateTable
CREATE TABLE "public"."temporary_passwords" (
    "id" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "notes" TEXT,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "temporary_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "temporary_passwords_userId_idx" ON "public"."temporary_passwords"("userId");

-- CreateIndex
CREATE INDEX "temporary_passwords_orgId_idx" ON "public"."temporary_passwords"("orgId");

-- CreateIndex
CREATE INDEX "temporary_passwords_active_idx" ON "public"."temporary_passwords"("active");

-- CreateIndex
CREATE INDEX "temporary_passwords_expiresAt_idx" ON "public"."temporary_passwords"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."temporary_passwords" ADD CONSTRAINT "temporary_passwords_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."temporary_passwords" ADD CONSTRAINT "temporary_passwords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."temporary_passwords" ADD CONSTRAINT "temporary_passwords_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
