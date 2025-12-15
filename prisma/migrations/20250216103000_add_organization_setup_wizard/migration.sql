-- CreateEnum
CREATE TYPE "OrganizationSetupStatus" AS ENUM ('DRAFT', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "organization_setup_jobs" (
    "id" TEXT NOT NULL,
    "status" "OrganizationSetupStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "organization_setup_jobs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "organization_setup_jobs" ADD CONSTRAINT "organization_setup_jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_setup_jobs" ADD CONSTRAINT "organization_setup_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "organization_setup_jobs_orgId_idx" ON "organization_setup_jobs"("orgId");

-- CreateIndex
CREATE INDEX "organization_setup_jobs_createdById_idx" ON "organization_setup_jobs"("createdById");
