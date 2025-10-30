-- CreateEnum
CREATE TYPE "HierarchyType" AS ENUM ('FLAT', 'DEPARTMENTAL', 'HIERARCHICAL');

-- CreateEnum
CREATE TYPE "ManualTimeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignatureRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatureResult" AS ENUM ('SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignerStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PtoAdjustmentType" AS ENUM ('MANUAL', 'RECURRING', 'SYSTEM');

-- AlterEnum
ALTER TYPE "PtoNotificationType" ADD VALUE 'SIGNATURE_PENDING';
ALTER TYPE "PtoNotificationType" ADD VALUE 'SIGNATURE_COMPLETED';
ALTER TYPE "PtoNotificationType" ADD VALUE 'SIGNATURE_REJECTED';
ALTER TYPE "PtoNotificationType" ADD VALUE 'SIGNATURE_EXPIRED';
ALTER TYPE "PtoNotificationType" ADD VALUE 'MANUAL_TIME_ENTRY_SUBMITTED';
ALTER TYPE "PtoNotificationType" ADD VALUE 'MANUAL_TIME_ENTRY_APPROVED';
ALTER TYPE "PtoNotificationType" ADD VALUE 'MANUAL_TIME_ENTRY_REJECTED';

-- AlterTable organizations
ALTER TABLE "organizations" ADD COLUMN "hierarchyType" "HierarchyType" NOT NULL DEFAULT 'DEPARTMENTAL';

-- AlterTable time_entries
ALTER TABLE "time_entries" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "time_entries" ADD COLUMN "manualRequestId" TEXT;

-- AlterTable pto_notifications
ALTER TABLE "pto_notifications" ADD COLUMN "manualTimeEntryRequestId" TEXT;

-- CreateTable manual_time_entry_requests
CREATE TABLE "manual_time_entry_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ManualTimeEntryStatus" NOT NULL DEFAULT 'PENDING',
    "approverId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_time_entry_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable organization_pto_config
CREATE TABLE "organization_pto_config" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "annualPtoDays" INTEGER NOT NULL DEFAULT 23,
    "ptoCalculationMethod" TEXT NOT NULL DEFAULT 'PROPORTIONAL',
    "allowNegativeBalance" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "maxAdvanceRequestDays" INTEGER NOT NULL DEFAULT 365,
    "minAdvanceNoticeDays" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pto_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable pto_balance_adjustments
CREATE TABLE "pto_balance_adjustments" (
    "id" TEXT NOT NULL,
    "ptoBalanceId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "adjustmentDays" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "type" "PtoAdjustmentType" NOT NULL DEFAULT 'MANUAL',
    "recurringAdjustmentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pto_balance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable recurring_pto_adjustments
CREATE TABLE "recurring_pto_adjustments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adjustmentDays" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_pto_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable signable_documents
CREATE TABLE "signable_documents" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signable_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable signature_requests
CREATE TABLE "signature_requests" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "status" "SignatureRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable signers
CREATE TABLE "signers" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "SignerStatus" NOT NULL DEFAULT 'PENDING',
    "signToken" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signers_pkey" PRIMARY KEY ("id")
);

-- CreateTable signature_evidences
CREATE TABLE "signature_evidences" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "result" "SignatureResult" NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "geolocation" TEXT,
    "evidenceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manual_time_entry_requests_employeeId_idx" ON "manual_time_entry_requests"("employeeId");
CREATE INDEX "manual_time_entry_requests_orgId_idx" ON "manual_time_entry_requests"("orgId");
CREATE INDEX "manual_time_entry_requests_date_idx" ON "manual_time_entry_requests"("date");
CREATE INDEX "manual_time_entry_requests_status_idx" ON "manual_time_entry_requests"("status");
CREATE INDEX "manual_time_entry_requests_approverId_idx" ON "manual_time_entry_requests"("approverId");
CREATE INDEX "manual_time_entry_requests_submittedAt_idx" ON "manual_time_entry_requests"("submittedAt");

CREATE UNIQUE INDEX "organization_pto_config_orgId_key" ON "organization_pto_config"("orgId");

CREATE INDEX "pto_balance_adjustments_ptoBalanceId_idx" ON "pto_balance_adjustments"("ptoBalanceId");
CREATE INDEX "pto_balance_adjustments_orgId_idx" ON "pto_balance_adjustments"("orgId");
CREATE INDEX "pto_balance_adjustments_createdById_idx" ON "pto_balance_adjustments"("createdById");
CREATE INDEX "pto_balance_adjustments_createdAt_idx" ON "pto_balance_adjustments"("createdAt");

CREATE INDEX "recurring_pto_adjustments_employeeId_idx" ON "recurring_pto_adjustments"("employeeId");
CREATE INDEX "recurring_pto_adjustments_orgId_idx" ON "recurring_pto_adjustments"("orgId");
CREATE INDEX "recurring_pto_adjustments_startYear_idx" ON "recurring_pto_adjustments"("startYear");
CREATE INDEX "recurring_pto_adjustments_active_idx" ON "recurring_pto_adjustments"("active");

CREATE INDEX "signable_documents_orgId_idx" ON "signable_documents"("orgId");
CREATE INDEX "signable_documents_category_idx" ON "signable_documents"("category");
CREATE INDEX "signable_documents_createdById_idx" ON "signable_documents"("createdById");

CREATE INDEX "signature_requests_documentId_idx" ON "signature_requests"("documentId");
CREATE INDEX "signature_requests_orgId_idx" ON "signature_requests"("orgId");
CREATE INDEX "signature_requests_status_idx" ON "signature_requests"("status");
CREATE INDEX "signature_requests_expiresAt_idx" ON "signature_requests"("expiresAt");

CREATE UNIQUE INDEX "signers_signToken_key" ON "signers"("signToken");
CREATE INDEX "signers_requestId_idx" ON "signers"("requestId");
CREATE INDEX "signers_employeeId_idx" ON "signers"("employeeId");
CREATE INDEX "signers_status_idx" ON "signers"("status");
CREATE INDEX "signers_signToken_idx" ON "signers"("signToken");

CREATE INDEX "signature_evidences_requestId_idx" ON "signature_evidences"("requestId");
CREATE INDEX "signature_evidences_signerId_idx" ON "signature_evidences"("signerId");
CREATE INDEX "signature_evidences_result_idx" ON "signature_evidences"("result");
CREATE INDEX "signature_evidences_createdAt_idx" ON "signature_evidences"("createdAt");

CREATE INDEX "pto_notifications_manualTimeEntryRequestId_idx" ON "pto_notifications"("manualTimeEntryRequestId");

-- AddForeignKey
ALTER TABLE "manual_time_entry_requests" ADD CONSTRAINT "manual_time_entry_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manual_time_entry_requests" ADD CONSTRAINT "manual_time_entry_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manual_time_entry_requests" ADD CONSTRAINT "manual_time_entry_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "organization_pto_config" ADD CONSTRAINT "organization_pto_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pto_balance_adjustments" ADD CONSTRAINT "pto_balance_adjustments_ptoBalanceId_fkey" FOREIGN KEY ("ptoBalanceId") REFERENCES "pto_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pto_balance_adjustments" ADD CONSTRAINT "pto_balance_adjustments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pto_balance_adjustments" ADD CONSTRAINT "pto_balance_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_pto_adjustments" ADD CONSTRAINT "recurring_pto_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_pto_adjustments" ADD CONSTRAINT "recurring_pto_adjustments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_pto_adjustments" ADD CONSTRAINT "recurring_pto_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "signable_documents" ADD CONSTRAINT "signable_documents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signable_documents" ADD CONSTRAINT "signable_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "signable_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "signers" ADD CONSTRAINT "signers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "signature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signers" ADD CONSTRAINT "signers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "signature_evidences" ADD CONSTRAINT "signature_evidences_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "signature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signature_evidences" ADD CONSTRAINT "signature_evidences_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "signers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pto_notifications" ADD CONSTRAINT "pto_notifications_manualTimeEntryRequestId_fkey" FOREIGN KEY ("manualTimeEntryRequestId") REFERENCES "manual_time_entry_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
