-- CreateEnum
CREATE TYPE "public"."CalendarType" AS ENUM ('NATIONAL_HOLIDAY', 'LOCAL_HOLIDAY', 'CORPORATE_EVENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."CalendarEventType" AS ENUM ('HOLIDAY', 'CLOSURE', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TimeEntryType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "public"."WorkdayStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'INCOMPLETE', 'ABSENT');

-- CreateEnum
CREATE TYPE "public"."PtoRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PtoNotificationType" AS ENUM ('PTO_SUBMITTED', 'PTO_APPROVED', 'PTO_REJECTED', 'PTO_CANCELLED', 'PTO_REMINDER', 'DOCUMENT_UPLOADED', 'SYSTEM_ANNOUNCEMENT');

-- AlterTable
ALTER TABLE "public"."employment_contracts" ADD COLUMN     "fridayHours" DECIMAL(4,2),
ADD COLUMN     "hasCustomWeeklyPattern" BOOLEAN DEFAULT false,
ADD COLUMN     "hasIntensiveSchedule" BOOLEAN DEFAULT false,
ADD COLUMN     "intensiveEndDate" TEXT,
ADD COLUMN     "intensiveFridayHours" DECIMAL(4,2),
ADD COLUMN     "intensiveMondayHours" DECIMAL(4,2),
ADD COLUMN     "intensiveSaturdayHours" DECIMAL(4,2),
ADD COLUMN     "intensiveStartDate" TEXT,
ADD COLUMN     "intensiveSundayHours" DECIMAL(4,2),
ADD COLUMN     "intensiveThursdayHours" DECIMAL(4,2),
ADD COLUMN     "intensiveTuesdayHours" DECIMAL(4,2),
ADD COLUMN     "intensiveWednesdayHours" DECIMAL(4,2),
ADD COLUMN     "intensiveWeeklyHours" DECIMAL(5,2),
ADD COLUMN     "mondayHours" DECIMAL(4,2),
ADD COLUMN     "saturdayHours" DECIMAL(4,2),
ADD COLUMN     "sundayHours" DECIMAL(4,2),
ADD COLUMN     "thursdayHours" DECIMAL(4,2),
ADD COLUMN     "tuesdayHours" DECIMAL(4,2),
ADD COLUMN     "wednesdayHours" DECIMAL(4,2),
ADD COLUMN     "workingDaysPerWeek" DECIMAL(3,1) DEFAULT 5;

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "annualPtoDays" INTEGER NOT NULL DEFAULT 23,
ADD COLUMN     "ptoAccrualStartDate" TEXT NOT NULL DEFAULT 'CONTRACT_START',
ADD COLUMN     "ptoCalculationMethod" TEXT NOT NULL DEFAULT 'PROPORTIONAL';

-- AlterTable
ALTER TABLE "public"."positions" DROP COLUMN "level",
ADD COLUMN     "levelId" TEXT;

-- CreateTable
CREATE TABLE "public"."position_levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "minSalary" DECIMAL(10,2),
    "maxSalary" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "position_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER NOT NULL,
    "calendarType" "public"."CalendarType" NOT NULL DEFAULT 'NATIONAL_HOLIDAY',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "costCenterId" TEXT,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "eventType" "public"."CalendarEventType" NOT NULL DEFAULT 'HOLIDAY',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "calendarId" TEXT NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_clock_terminals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "ipAddress" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "costCenterId" TEXT,

    CONSTRAINT "time_clock_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_entries" (
    "id" TEXT NOT NULL,
    "entryType" "public"."TimeEntryType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "notes" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "terminalId" TEXT,
    "workdayId" TEXT,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workday_summaries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "totalWorkedMinutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalBreakMinutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "public"."WorkdayStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "workday_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."absence_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "minDaysAdvance" INTEGER NOT NULL DEFAULT 0,
    "affectsBalance" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "absence_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pto_balances" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annualAllowance" DECIMAL(5,2) NOT NULL,
    "daysUsed" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "daysPending" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "daysAvailable" DECIMAL(5,2) NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "pto_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pto_requests" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "workingDays" DECIMAL(5,2) NOT NULL,
    "status" "public"."PtoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "attachmentUrl" TEXT,
    "approverId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approverComments" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "absenceTypeId" TEXT NOT NULL,

    CONSTRAINT "pto_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pto_notifications" (
    "id" TEXT NOT NULL,
    "type" "public"."PtoNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "ptoRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "pto_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "position_levels_orgId_idx" ON "public"."position_levels"("orgId");

-- CreateIndex
CREATE INDEX "position_levels_order_idx" ON "public"."position_levels"("order");

-- CreateIndex
CREATE UNIQUE INDEX "position_levels_orgId_name_key" ON "public"."position_levels"("orgId", "name");

-- CreateIndex
CREATE INDEX "calendars_orgId_idx" ON "public"."calendars"("orgId");

-- CreateIndex
CREATE INDEX "calendars_costCenterId_idx" ON "public"."calendars"("costCenterId");

-- CreateIndex
CREATE INDEX "calendars_year_idx" ON "public"."calendars"("year");

-- CreateIndex
CREATE INDEX "calendar_events_calendarId_idx" ON "public"."calendar_events"("calendarId");

-- CreateIndex
CREATE INDEX "calendar_events_date_idx" ON "public"."calendar_events"("date");

-- CreateIndex
CREATE INDEX "time_clock_terminals_orgId_idx" ON "public"."time_clock_terminals"("orgId");

-- CreateIndex
CREATE INDEX "time_clock_terminals_costCenterId_idx" ON "public"."time_clock_terminals"("costCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "time_clock_terminals_orgId_code_key" ON "public"."time_clock_terminals"("orgId", "code");

-- CreateIndex
CREATE INDEX "time_entries_orgId_idx" ON "public"."time_entries"("orgId");

-- CreateIndex
CREATE INDEX "time_entries_employeeId_idx" ON "public"."time_entries"("employeeId");

-- CreateIndex
CREATE INDEX "time_entries_timestamp_idx" ON "public"."time_entries"("timestamp");

-- CreateIndex
CREATE INDEX "time_entries_entryType_idx" ON "public"."time_entries"("entryType");

-- CreateIndex
CREATE INDEX "time_entries_workdayId_idx" ON "public"."time_entries"("workdayId");

-- CreateIndex
CREATE INDEX "workday_summaries_orgId_idx" ON "public"."workday_summaries"("orgId");

-- CreateIndex
CREATE INDEX "workday_summaries_employeeId_idx" ON "public"."workday_summaries"("employeeId");

-- CreateIndex
CREATE INDEX "workday_summaries_date_idx" ON "public"."workday_summaries"("date");

-- CreateIndex
CREATE INDEX "workday_summaries_status_idx" ON "public"."workday_summaries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workday_summaries_orgId_employeeId_date_key" ON "public"."workday_summaries"("orgId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "absence_types_orgId_idx" ON "public"."absence_types"("orgId");

-- CreateIndex
CREATE INDEX "absence_types_active_idx" ON "public"."absence_types"("active");

-- CreateIndex
CREATE UNIQUE INDEX "absence_types_orgId_code_key" ON "public"."absence_types"("orgId", "code");

-- CreateIndex
CREATE INDEX "pto_balances_orgId_idx" ON "public"."pto_balances"("orgId");

-- CreateIndex
CREATE INDEX "pto_balances_employeeId_idx" ON "public"."pto_balances"("employeeId");

-- CreateIndex
CREATE INDEX "pto_balances_year_idx" ON "public"."pto_balances"("year");

-- CreateIndex
CREATE UNIQUE INDEX "pto_balances_orgId_employeeId_year_key" ON "public"."pto_balances"("orgId", "employeeId", "year");

-- CreateIndex
CREATE INDEX "pto_requests_orgId_idx" ON "public"."pto_requests"("orgId");

-- CreateIndex
CREATE INDEX "pto_requests_employeeId_idx" ON "public"."pto_requests"("employeeId");

-- CreateIndex
CREATE INDEX "pto_requests_approverId_idx" ON "public"."pto_requests"("approverId");

-- CreateIndex
CREATE INDEX "pto_requests_status_idx" ON "public"."pto_requests"("status");

-- CreateIndex
CREATE INDEX "pto_requests_startDate_idx" ON "public"."pto_requests"("startDate");

-- CreateIndex
CREATE INDEX "pto_requests_submittedAt_idx" ON "public"."pto_requests"("submittedAt");

-- CreateIndex
CREATE INDEX "pto_notifications_orgId_idx" ON "public"."pto_notifications"("orgId");

-- CreateIndex
CREATE INDEX "pto_notifications_userId_idx" ON "public"."pto_notifications"("userId");

-- CreateIndex
CREATE INDEX "pto_notifications_isRead_idx" ON "public"."pto_notifications"("isRead");

-- CreateIndex
CREATE INDEX "pto_notifications_createdAt_idx" ON "public"."pto_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "pto_notifications_ptoRequestId_idx" ON "public"."pto_notifications"("ptoRequestId");

-- CreateIndex
CREATE INDEX "positions_levelId_idx" ON "public"."positions"("levelId");

-- AddForeignKey
ALTER TABLE "public"."position_levels" ADD CONSTRAINT "position_levels_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "public"."position_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendars" ADD CONSTRAINT "calendars_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendars" ADD CONSTRAINT "calendars_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "public"."calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_clock_terminals" ADD CONSTRAINT "time_clock_terminals_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_clock_terminals" ADD CONSTRAINT "time_clock_terminals_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "public"."time_clock_terminals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_workdayId_fkey" FOREIGN KEY ("workdayId") REFERENCES "public"."workday_summaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workday_summaries" ADD CONSTRAINT "workday_summaries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workday_summaries" ADD CONSTRAINT "workday_summaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."absence_types" ADD CONSTRAINT "absence_types_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_balances" ADD CONSTRAINT "pto_balances_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_balances" ADD CONSTRAINT "pto_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_requests" ADD CONSTRAINT "pto_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_requests" ADD CONSTRAINT "pto_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_requests" ADD CONSTRAINT "pto_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_requests" ADD CONSTRAINT "pto_requests_absenceTypeId_fkey" FOREIGN KEY ("absenceTypeId") REFERENCES "public"."absence_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_notifications" ADD CONSTRAINT "pto_notifications_ptoRequestId_fkey" FOREIGN KEY ("ptoRequestId") REFERENCES "public"."pto_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_notifications" ADD CONSTRAINT "pto_notifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_notifications" ADD CONSTRAINT "pto_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

