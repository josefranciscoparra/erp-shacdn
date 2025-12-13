-- CreateTable
CREATE TABLE "payslip_batch_events" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_batch_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payslip_batch_events_batchId_idx" ON "payslip_batch_events"("batchId");

-- CreateIndex
CREATE INDEX "payslip_batch_events_createdAt_idx" ON "payslip_batch_events"("createdAt");

-- AddForeignKey
ALTER TABLE "payslip_batch_events" ADD CONSTRAINT "payslip_batch_events_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payslip_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
