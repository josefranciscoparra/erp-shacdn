-- AlterTable
ALTER TABLE "public"."departments" ADD COLUMN     "managerId" TEXT;

-- CreateIndex
CREATE INDEX "departments_managerId_idx" ON "public"."departments"("managerId");

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
