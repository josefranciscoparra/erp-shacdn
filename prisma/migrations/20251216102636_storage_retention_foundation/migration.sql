-- CreateEnum
CREATE TYPE "public"."FileCategory" AS ENUM ('PAYROLL', 'CONTRACT', 'TIME_TRACKING', 'PTO', 'WHISTLEBLOWING', 'SIGNATURE', 'EXPENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RetentionPolicy" AS ENUM ('PAYROLL', 'CONTRACT', 'TIME_TRACKING', 'PTO', 'WHISTLEBLOWING', 'SIGNATURE', 'GENERIC');

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "storageLimitBytes" INTEGER NOT NULL DEFAULT 1073741824,
ADD COLUMN     "storageUsedBytes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."employee_documents" ADD COLUMN     "storedFileId" TEXT;

-- AlterTable
ALTER TABLE "public"."pto_request_documents" ADD COLUMN     "storedFileId" TEXT;

-- AlterTable
ALTER TABLE "public"."signable_documents" ADD COLUMN     "storedFileId" TEXT;

-- AlterTable
ALTER TABLE "public"."expense_attachments" ADD COLUMN     "storedFileId" TEXT;

-- AlterTable
ALTER TABLE "public"."whistleblowing_documents" ADD COLUMN     "storedFileId" TEXT;

-- CreateTable
CREATE TABLE "public"."stored_files" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT,
    "path" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "public"."FileCategory" NOT NULL,
    "retentionPolicy" "public"."RetentionPolicy" NOT NULL,
    "retainUntil" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "legalHoldReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stored_files_orgId_idx" ON "public"."stored_files"("orgId");

-- CreateIndex
CREATE INDEX "stored_files_retainUntil_idx" ON "public"."stored_files"("retainUntil");

-- CreateIndex
CREATE INDEX "employee_documents_storedFileId_idx" ON "public"."employee_documents"("storedFileId");

-- CreateIndex
CREATE INDEX "pto_request_documents_storedFileId_idx" ON "public"."pto_request_documents"("storedFileId");

-- CreateIndex
CREATE INDEX "signable_documents_storedFileId_idx" ON "public"."signable_documents"("storedFileId");

-- CreateIndex
CREATE INDEX "expense_attachments_storedFileId_idx" ON "public"."expense_attachments"("storedFileId");

-- CreateIndex
CREATE INDEX "whistleblowing_documents_storedFileId_idx" ON "public"."whistleblowing_documents"("storedFileId");

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stored_files" ADD CONSTRAINT "stored_files_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stored_files" ADD CONSTRAINT "stored_files_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stored_files" ADD CONSTRAINT "stored_files_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_request_documents" ADD CONSTRAINT "pto_request_documents_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signable_documents" ADD CONSTRAINT "signable_documents_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_attachments" ADD CONSTRAINT "expense_attachments_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_documents" ADD CONSTRAINT "whistleblowing_documents_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
