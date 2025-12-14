-- Create enums for import job/row status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeImportJobStatus') THEN
    CREATE TYPE "EmployeeImportJobStatus" AS ENUM ('DRAFT', 'VALIDATED', 'RUNNING', 'DONE', 'FAILED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeImportRowStatus') THEN
    CREATE TYPE "EmployeeImportRowStatus" AS ENUM ('PENDING', 'READY', 'SKIPPED', 'ERROR', 'IMPORTED', 'FAILED');
  END IF;
END$$;

-- Tabla principal de jobs
CREATE TABLE IF NOT EXISTS "employee_import_jobs" (
  "id" TEXT PRIMARY KEY,
  "status" "EmployeeImportJobStatus" NOT NULL DEFAULT 'DRAFT',
  "options" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "filePath" TEXT,
  "fileName" TEXT,
  "fileHash" TEXT,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "readyRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "warningRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validatedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "orgId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "employee_import_jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_import_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "employee_import_jobs_orgId_idx" ON "employee_import_jobs" ("orgId");
CREATE INDEX IF NOT EXISTS "employee_import_jobs_status_idx" ON "employee_import_jobs" ("status");

-- Tabla de filas individuales
CREATE TABLE IF NOT EXISTS "employee_import_rows" (
  "id" TEXT PRIMARY KEY,
  "rowIndex" INTEGER NOT NULL,
  "rowHash" TEXT,
  "rawData" JSONB NOT NULL,
  "status" "EmployeeImportRowStatus" NOT NULL DEFAULT 'PENDING',
  "messages" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "errorReason" TEXT,
  "createdEmployeeId" TEXT,
  "createdUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "jobId" TEXT NOT NULL,
  CONSTRAINT "employee_import_rows_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "employee_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_import_rows_jobId_rowIndex_key" ON "employee_import_rows" ("jobId", "rowIndex");
CREATE INDEX IF NOT EXISTS "employee_import_rows_job_status_idx" ON "employee_import_rows" ("jobId", "status");
