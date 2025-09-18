-- CreateEnum
CREATE TYPE "public"."EmploymentStatus" AS ENUM ('PENDING_CONTRACT', 'ACTIVE', 'ON_LEAVE', 'VACATION', 'SUSPENDED', 'TERMINATED', 'RETIRED');

-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "employmentStatus" "public"."EmploymentStatus" NOT NULL DEFAULT 'PENDING_CONTRACT';
