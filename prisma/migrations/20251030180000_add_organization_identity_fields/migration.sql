-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "allowedEmailDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "employeeNumberCounter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "employeeNumberPrefix" TEXT;
