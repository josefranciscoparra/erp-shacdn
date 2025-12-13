-- CreateEnum
CREATE TYPE "PayslipBatchStatus" AS ENUM ('PROCESSING', 'REVIEW', 'READY_TO_PUBLISH', 'COMPLETED', 'PARTIAL', 'ERROR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayslipItemStatus" AS ENUM ('PENDING_OCR', 'PENDING_REVIEW', 'READY', 'PUBLISHED', 'BLOCKED_INACTIVE', 'ERROR', 'REVOKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PayslipBatchKind" AS ENUM ('BULK_UPLOAD', 'MANUAL_SINGLE');

-- CreateTable
CREATE TABLE "payslip_batches" (
    "id" TEXT NOT NULL,
    "kind" "PayslipBatchKind" NOT NULL DEFAULT 'BULK_UPLOAD',
    "month" INTEGER,
    "year" INTEGER,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "label" TEXT,
    "originalFileName" TEXT NOT NULL,
    "originalFileType" TEXT NOT NULL,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "assignedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "readyCount" INTEGER NOT NULL DEFAULT 0,
    "blockedInactive" INTEGER NOT NULL DEFAULT 0,
    "publishedCount" INTEGER NOT NULL DEFAULT 0,
    "revokedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PayslipBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "orgId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "payslip_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_upload_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "tempFilePath" TEXT NOT NULL,
    "originalFileName" TEXT,
    "pageNumber" INTEGER,
    "detectedDni" TEXT,
    "detectedName" TEXT,
    "detectedCode" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PayslipItemStatus" NOT NULL DEFAULT 'PENDING_OCR',
    "errorMessage" TEXT,
    "isAutoMatched" BOOLEAN NOT NULL DEFAULT false,
    "employeeId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "payslip_upload_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payslip_upload_items_documentId_key" UNIQUE ("documentId")
);

-- AlterTable
ALTER TABLE "employee_documents"
ADD COLUMN     "payslipMonth" INTEGER,
ADD COLUMN     "payslipYear" INTEGER,
ADD COLUMN     "payslipBatchId" TEXT,
ADD COLUMN     "isRevoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedById" TEXT,
ADD COLUMN     "revokeReason" TEXT;

-- CreateIndex
CREATE INDEX "payslip_batches_orgId_idx" ON "payslip_batches"("orgId");

-- CreateIndex
CREATE INDEX "payslip_batches_year_month_idx" ON "payslip_batches"("year", "month");

-- CreateIndex
CREATE INDEX "payslip_batches_status_idx" ON "payslip_batches"("status");

-- CreateIndex
CREATE INDEX "payslip_batches_kind_idx" ON "payslip_batches"("kind");

-- CreateIndex
CREATE INDEX "payslip_upload_items_batchId_idx" ON "payslip_upload_items"("batchId");

-- CreateIndex
CREATE INDEX "payslip_upload_items_orgId_idx" ON "payslip_upload_items"("orgId");

-- CreateIndex
CREATE INDEX "payslip_upload_items_status_idx" ON "payslip_upload_items"("status");

-- CreateIndex
CREATE INDEX "employee_documents_kind_payslipYear_payslipMonth_idx" ON "employee_documents"("kind", "payslipYear", "payslipMonth");

-- CreateIndex
CREATE INDEX "employee_documents_isRevoked_idx" ON "employee_documents"("isRevoked");

-- AddForeignKey
ALTER TABLE "payslip_batches" ADD CONSTRAINT "payslip_batches_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_batches" ADD CONSTRAINT "payslip_batches_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_batches" ADD CONSTRAINT "payslip_batches_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_batches" ADD CONSTRAINT "payslip_batches_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payslip_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "employee_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_payslipBatchId_fkey" FOREIGN KEY ("payslipBatchId") REFERENCES "payslip_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
