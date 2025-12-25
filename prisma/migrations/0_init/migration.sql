-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."OrganizationGroupOrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AuthTokenType" AS ENUM ('INVITE', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "public"."HierarchyType" AS ENUM ('FLAT', 'DEPARTMENTAL', 'HIERARCHICAL');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'HR_ASSISTANT', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "public"."ExpenseMode" AS ENUM ('PRIVATE', 'PUBLIC', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."DiscontinuousStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."SettlementStatus" AS ENUM ('PENDING', 'PAID', 'COMPENSATED');

-- CreateEnum
CREATE TYPE "public"."DocumentKind" AS ENUM ('CONTRACT', 'PAYSLIP', 'ID_DOCUMENT', 'SS_DOCUMENT', 'CERTIFICATE', 'MEDICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FileCategory" AS ENUM ('PAYROLL', 'CONTRACT', 'TIME_TRACKING', 'PTO', 'WHISTLEBLOWING', 'SIGNATURE', 'EXPENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RetentionPolicy" AS ENUM ('PAYROLL', 'CONTRACT', 'TIME_TRACKING', 'PTO', 'WHISTLEBLOWING', 'SIGNATURE', 'GENERIC');

-- CreateEnum
CREATE TYPE "public"."PayslipBatchStatus" AS ENUM ('PROCESSING', 'REVIEW', 'READY_TO_PUBLISH', 'COMPLETED', 'PARTIAL', 'ERROR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PayslipItemStatus" AS ENUM ('PENDING_OCR', 'PENDING_REVIEW', 'READY', 'PUBLISHED', 'BLOCKED_INACTIVE', 'ERROR', 'REVOKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."PayslipBatchKind" AS ENUM ('BULK_UPLOAD', 'MANUAL_SINGLE');

-- CreateEnum
CREATE TYPE "public"."EmploymentStatus" AS ENUM ('PENDING_CONTRACT', 'ACTIVE', 'ON_LEAVE', 'VACATION', 'SUSPENDED', 'TERMINATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."CalendarType" AS ENUM ('NATIONAL_HOLIDAY', 'LOCAL_HOLIDAY', 'CORPORATE_EVENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."CalendarEventType" AS ENUM ('HOLIDAY', 'CLOSURE', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TimeEntryType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'PROJECT_SWITCH');

-- CreateEnum
CREATE TYPE "public"."WorkdayStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'INCOMPLETE', 'ABSENT');

-- CreateEnum
CREATE TYPE "public"."CancellationReason" AS ENUM ('EXCESSIVE_DURATION', 'USER_ERROR', 'SYSTEM_ERROR', 'ADMIN_CORRECTION', 'REPLACED_BY_MANUAL_REQUEST');

-- CreateEnum
CREATE TYPE "public"."TimeBankMovementType" AS ENUM ('EXTRA', 'DEFICIT', 'FESTIVE', 'ADJUSTMENT', 'RECOVERY', 'FLEX', 'CORRECTION');

-- CreateEnum
CREATE TYPE "public"."TimeBankMovementOrigin" AS ENUM ('AUTO_DAILY', 'AUTO_FESTIVE', 'AUTO_DEFICIT', 'MANUAL_ADMIN', 'EMPLOYEE_REQUEST', 'OVERTIME_AUTHORIZATION', 'FLEX_WINDOW', 'CORRECTION');

-- CreateEnum
CREATE TYPE "public"."TimeBankMovementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."TimeBankRequestType" AS ENUM ('RECOVERY', 'FESTIVE_COMPENSATION', 'CORRECTION');

-- CreateEnum
CREATE TYPE "public"."TimeBankRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'APPLIED');

-- CreateEnum
CREATE TYPE "public"."OverworkAuthorizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."TimeBankApprovalFlow" AS ENUM ('MIRROR_PTO', 'HR_ONLY');

-- CreateEnum
CREATE TYPE "public"."PtoBalanceType" AS ENUM ('VACATION', 'PERSONAL_MATTERS', 'COMP_TIME');

-- CreateEnum
CREATE TYPE "public"."PtoRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PtoNotificationType" AS ENUM ('PTO_SUBMITTED', 'PTO_APPROVED', 'PTO_REJECTED', 'PTO_CANCELLED', 'PTO_REMINDER', 'DOCUMENT_UPLOADED', 'SYSTEM_ANNOUNCEMENT', 'SIGNATURE_PENDING', 'SIGNATURE_COMPLETED', 'SIGNATURE_REJECTED', 'SIGNATURE_EXPIRED', 'MANUAL_TIME_ENTRY_SUBMITTED', 'MANUAL_TIME_ENTRY_APPROVED', 'MANUAL_TIME_ENTRY_REJECTED', 'TIME_ENTRY_EXCESSIVE', 'EXPENSE_SUBMITTED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'EXPENSE_REIMBURSED', 'TIME_BANK_REQUEST_SUBMITTED', 'TIME_BANK_REQUEST_APPROVED', 'TIME_BANK_REQUEST_REJECTED', 'PAYSLIP_AVAILABLE', 'SIGNATURE_REMINDER');

-- CreateEnum
CREATE TYPE "public"."SignatureBatchStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SecondSignerRole" AS ENUM ('MANAGER', 'HR', 'SPECIFIC_USER');

-- CreateEnum
CREATE TYPE "public"."PtoAdjustmentType" AS ENUM ('MANUAL_ADD', 'MANUAL_SUBTRACT', 'SENIORITY_BONUS', 'COLLECTIVE_AGREEMENT', 'COMPENSATION', 'CORRECTION', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'SICK_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PtoCarryoverMode" AS ENUM ('NONE', 'UNTIL_DATE', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "public"."PtoRoundingMode" AS ENUM ('DOWN', 'NEAREST', 'UP');

-- CreateEnum
CREATE TYPE "public"."SignatureRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SignerStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SignatureResult" AS ENUM ('SUCCESS', 'REJECTED', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."ManualTimeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ProcedureStatus" AS ENUM ('DRAFT', 'PENDING_AUTHORIZATION', 'AUTHORIZED', 'JUSTIFICATION_PENDING', 'JUSTIFIED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ExpensePayer" AS ENUM ('EMPLOYEE', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "public"."ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED');

-- CreateEnum
CREATE TYPE "public"."ExpenseCategory" AS ENUM ('FUEL', 'MILEAGE', 'MEAL', 'TOLL', 'PARKING', 'LODGING', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ReimbursementMethod" AS ENUM ('TRANSFER', 'PAYROLL', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SensitiveDataType" AS ENUM ('IBAN', 'SALARY', 'SSN', 'MEDICAL_DATA', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('SENT', 'READ');

-- CreateEnum
CREATE TYPE "public"."ScheduleTemplateType" AS ENUM ('FIXED', 'SHIFT', 'ROTATION', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "public"."SchedulePeriodType" AS ENUM ('REGULAR', 'INTENSIVE', 'SPECIAL');

-- CreateEnum
CREATE TYPE "public"."TimeSlotType" AS ENUM ('WORK', 'BREAK', 'ON_CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PresenceType" AS ENUM ('MANDATORY', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "public"."ScheduleAssignmentType" AS ENUM ('FIXED', 'SHIFT', 'ROTATION', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "public"."ManualShiftStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "public"."ExceptionType" AS ENUM ('HOLIDAY', 'REDUCED_HOURS', 'SPECIAL_SCHEDULE', 'TRAINING', 'EARLY_CLOSURE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."ProjectAccessType" AS ENUM ('OPEN', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "public"."EmployeeImportJobStatus" AS ENUM ('DRAFT', 'VALIDATED', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."EmployeeImportRowStatus" AS ENUM ('PENDING', 'READY', 'SKIPPED', 'ERROR', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."OrganizationSetupStatus" AS ENUM ('DRAFT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ReporterType" AS ENUM ('EMPLOYEE', 'EXTERNAL', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "public"."WhistleblowingStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."WhistleblowingPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."ResolutionType" AS ENUM ('SUBSTANTIATED', 'UNSUBSTANTIATED', 'PARTIALLY_SUBSTANTIATED', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "public"."WhistleblowingActivityType" AS ENUM ('CREATED', 'SUBMITTED', 'ASSIGNED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'DOCUMENT_ADDED', 'INTERNAL_NOTE', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vat" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hierarchyType" "public"."HierarchyType" NOT NULL DEFAULT 'DEPARTMENTAL',
    "approvalSettings" JSONB NOT NULL DEFAULT '{}',
    "employeeNumberPrefix" TEXT,
    "employeeNumberCounter" INTEGER NOT NULL DEFAULT 0,
    "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "annualPtoDays" INTEGER NOT NULL DEFAULT 23,
    "ptoCalculationMethod" TEXT NOT NULL DEFAULT 'PROPORTIONAL',
    "ptoAccrualStartDate" TEXT NOT NULL DEFAULT 'CONTRACT_START',
    "geolocationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "geolocationRequired" BOOLEAN NOT NULL DEFAULT false,
    "geolocationMinAccuracy" INTEGER NOT NULL DEFAULT 100,
    "geolocationMaxRadius" INTEGER NOT NULL DEFAULT 200,
    "clockInToleranceMinutes" INTEGER NOT NULL DEFAULT 15,
    "clockOutToleranceMinutes" INTEGER NOT NULL DEFAULT 15,
    "earlyClockInToleranceMinutes" INTEGER NOT NULL DEFAULT 30,
    "lateClockOutToleranceMinutes" INTEGER NOT NULL DEFAULT 30,
    "nonWorkdayClockInAllowed" BOOLEAN NOT NULL DEFAULT false,
    "nonWorkdayClockInWarning" BOOLEAN NOT NULL DEFAULT true,
    "autoCloseMissingClockOutEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoCloseMissingClockOutThresholdPercent" INTEGER NOT NULL DEFAULT 150,
    "criticalLateArrivalMinutes" INTEGER NOT NULL DEFAULT 30,
    "criticalEarlyDepartureMinutes" INTEGER NOT NULL DEFAULT 30,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertsRequireResolution" BOOLEAN NOT NULL DEFAULT true,
    "alertNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "alertNotificationRoles" TEXT[] DEFAULT ARRAY['RRHH']::TEXT[],
    "chatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shiftsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shiftMinRestMinutes" INTEGER NOT NULL DEFAULT 720,
    "features" JSONB NOT NULL DEFAULT '{}',
    "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
    "storageLimitBytes" BIGINT NOT NULL DEFAULT 1073741824,
    "storageReservedBytes" BIGINT NOT NULL DEFAULT 0,
    "expenseMode" "public"."ExpenseMode" NOT NULL DEFAULT 'PRIVATE',
    "whistleblowingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whistleblowingPublicSlug" TEXT,
    "whistleblowingManagerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_group_organizations" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "public"."OrganizationGroupOrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_group_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_group_users" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_group_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."storage_reservations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "bytes" BIGINT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "fileKey" TEXT,

    CONSTRAINT "storage_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."org_role_permission_overrides" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "grantPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revokePermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "org_role_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'EMPLOYEE',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPasswordChangeAt" TIMESTAMP(3),
    "failedPasswordAttempts" INTEGER NOT NULL DEFAULT 0,
    "passwordLockedUntil" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_organizations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'EMPLOYEE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canManageUserOrganizations" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."AuthTokenType" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cost_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "allowedRadiusMeters" INTEGER DEFAULT 100,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "costCenterId" TEXT,
    "managerId" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "public"."positions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "levelId" TEXT,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "requiresEmployeeNumberReview" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "secondLastName" TEXT,
    "nifNie" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'ES',
    "birthDate" TIMESTAMP(3),
    "nationality" TEXT,
    "iban" TEXT,
    "preferredReimbursementMethod" "public"."ReimbursementMethod",
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyRelationship" TEXT,
    "employmentStatus" "public"."EmploymentStatus" NOT NULL DEFAULT 'PENDING_CONTRACT',
    "photoUrl" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "expenseApproverId" TEXT,
    "teamId" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employment_contracts" (
    "id" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "weeklyHours" DECIMAL(5,2) NOT NULL,
    "workingDaysPerWeek" DECIMAL(3,1) DEFAULT 5,
    "grossSalary" DECIMAL(10,2),
    "workdayMinutes" INTEGER,
    "workScheduleType" "public"."ScheduleAssignmentType" NOT NULL DEFAULT 'FIXED',
    "discontinuousStatus" "public"."DiscontinuousStatus",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "positionId" TEXT,
    "departmentId" TEXT,
    "costCenterId" TEXT,
    "managerId" TEXT,

    CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contract_pause_history" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "reason" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_pause_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vacation_settlements" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractId" TEXT,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "accruedDays" DECIMAL(5,2) NOT NULL,
    "usedDays" DECIMAL(5,2) NOT NULL,
    "pendingDays" DECIMAL(5,2) NOT NULL,
    "balanceDays" DECIMAL(5,2) NOT NULL,
    "accruedMinutes" INTEGER NOT NULL DEFAULT 0,
    "usedMinutes" INTEGER NOT NULL DEFAULT 0,
    "pendingMinutes" INTEGER NOT NULL DEFAULT 0,
    "balanceMinutes" INTEGER NOT NULL DEFAULT 0,
    "workdayMinutes" INTEGER NOT NULL DEFAULT 480,
    "status" "public"."SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_documents" (
    "id" TEXT NOT NULL,
    "kind" "public"."DocumentKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storedFileId" TEXT,
    "payslipMonth" INTEGER,
    "payslipYear" INTEGER,
    "payslipBatchId" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."payslip_batches" (
    "id" TEXT NOT NULL,
    "kind" "public"."PayslipBatchKind" NOT NULL DEFAULT 'BULK_UPLOAD',
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
    "status" "public"."PayslipBatchStatus" NOT NULL DEFAULT 'PROCESSING',
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
CREATE TABLE "public"."payslip_batch_events" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_batch_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payslip_upload_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "tempFilePath" TEXT NOT NULL,
    "originalFileName" TEXT,
    "pageNumber" INTEGER,
    "detectedDni" TEXT,
    "detectedName" TEXT,
    "detectedCode" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."PayslipItemStatus" NOT NULL DEFAULT 'PENDING_OCR',
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

    CONSTRAINT "payslip_upload_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."temporary_passwords" (
    "id" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "invalidatedAt" TIMESTAMP(3),
    "invalidatedReason" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "temporary_passwords_pkey" PRIMARY KEY ("id")
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
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "accuracy" DECIMAL(10,2),
    "isWithinAllowedArea" BOOLEAN,
    "distanceFromCenter" DECIMAL(10,2),
    "nearestCostCenterId" TEXT,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "terminalId" TEXT,
    "workdayId" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "manualRequestId" TEXT,
    "validationWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "validationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviationMinutes" INTEGER,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReason" "public"."CancellationReason",
    "cancelledAt" TIMESTAMP(3),
    "originalDurationHours" DECIMAL(6,2),
    "cancellationNotes" TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "automaticBreakSlotId" TEXT,
    "automaticBreakNotes" TEXT,
    "projectId" TEXT,
    "task" VARCHAR(255),

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
    "excessiveTimeNotified" BOOLEAN NOT NULL DEFAULT false,
    "expectedMinutes" DECIMAL(6,2),
    "deviationMinutes" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "workday_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_bank_settings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "maxPositiveMinutes" INTEGER NOT NULL DEFAULT 4800,
    "maxNegativeMinutes" INTEGER NOT NULL DEFAULT 480,
    "dailyExcessLimitMinutes" INTEGER NOT NULL DEFAULT 120,
    "dailyDeficitLimitMinutes" INTEGER NOT NULL DEFAULT 60,
    "roundingIncrementMinutes" INTEGER NOT NULL DEFAULT 5,
    "deficitGraceMinutes" INTEGER NOT NULL DEFAULT 10,
    "excessGraceMinutes" INTEGER NOT NULL DEFAULT 15,
    "holidayCompensationFactor" DECIMAL(4,2) NOT NULL DEFAULT 1.50,
    "allowFlexibleWindows" BOOLEAN NOT NULL DEFAULT true,
    "requireOvertimeAuthorization" BOOLEAN NOT NULL DEFAULT true,
    "autoCloseMissingClockOut" BOOLEAN NOT NULL DEFAULT true,
    "allowCashConversion" BOOLEAN NOT NULL DEFAULT false,
    "approvalFlow" "public"."TimeBankApprovalFlow" NOT NULL DEFAULT 'MIRROR_PTO',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "time_bank_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_bank_movements" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "type" "public"."TimeBankMovementType" NOT NULL DEFAULT 'EXTRA',
    "origin" "public"."TimeBankMovementOrigin" NOT NULL DEFAULT 'AUTO_DAILY',
    "status" "public"."TimeBankMovementStatus" NOT NULL DEFAULT 'SETTLED',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB,
    "workdayId" TEXT,
    "requestId" TEXT,
    "overworkAuthorizationId" TEXT,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_bank_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_bank_requests" (
    "id" TEXT NOT NULL,
    "type" "public"."TimeBankRequestType" NOT NULL DEFAULT 'RECOVERY',
    "status" "public"."TimeBankRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedMinutes" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_bank_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."overwork_authorizations" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutesApproved" INTEGER NOT NULL,
    "justification" TEXT,
    "status" "public"."OverworkAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overwork_authorizations_pkey" PRIMARY KEY ("id")
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
    "allowPartialDays" BOOLEAN NOT NULL DEFAULT false,
    "countsCalendarDays" BOOLEAN NOT NULL DEFAULT false,
    "granularityMinutes" INTEGER NOT NULL DEFAULT 480,
    "minimumDurationMinutes" INTEGER NOT NULL DEFAULT 480,
    "maxDurationMinutes" INTEGER,
    "compensationFactor" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "balanceType" "public"."PtoBalanceType" NOT NULL DEFAULT 'VACATION',
    "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "absence_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pto_balances" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "balanceType" "public"."PtoBalanceType" NOT NULL DEFAULT 'VACATION',
    "annualAllowance" DECIMAL(5,2) NOT NULL,
    "daysUsed" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "daysPending" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "daysAvailable" DECIMAL(5,2) NOT NULL,
    "annualAllowanceMinutes" INTEGER NOT NULL DEFAULT 0,
    "minutesUsed" INTEGER NOT NULL DEFAULT 0,
    "minutesPending" INTEGER NOT NULL DEFAULT 0,
    "minutesAvailable" INTEGER NOT NULL DEFAULT 0,
    "compensatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "freeDisposalMinutes" INTEGER NOT NULL DEFAULT 0,
    "personalMattersMinutes" INTEGER NOT NULL DEFAULT 0,
    "workdayMinutesSnapshot" INTEGER NOT NULL DEFAULT 480,
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
    "startTime" INTEGER,
    "endTime" INTEGER,
    "durationMinutes" INTEGER,
    "effectiveMinutes" INTEGER NOT NULL DEFAULT 0,
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
CREATE TABLE "public"."pto_request_documents" (
    "id" TEXT NOT NULL,
    "ptoRequestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storedFileId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "pto_request_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pto_notifications" (
    "id" TEXT NOT NULL,
    "type" "public"."PtoNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "ptoRequestId" TEXT,
    "manualTimeEntryRequestId" TEXT,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "pto_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pto_balance_adjustments" (
    "id" TEXT NOT NULL,
    "adjustmentType" "public"."PtoAdjustmentType" NOT NULL,
    "daysAdjusted" DECIMAL(5,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ptoBalanceId" TEXT NOT NULL,

    CONSTRAINT "pto_balance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_pto_config" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "maternityLeaveWeeks" INTEGER NOT NULL DEFAULT 17,
    "paternityLeaveWeeks" INTEGER NOT NULL DEFAULT 17,
    "seniorityRules" JSONB NOT NULL DEFAULT '[]',
    "allowNegativeBalance" BOOLEAN NOT NULL DEFAULT false,
    "maxAdvanceRequestMonths" INTEGER NOT NULL DEFAULT 12,
    "carryoverMode" "public"."PtoCarryoverMode" NOT NULL DEFAULT 'NONE',
    "carryoverDeadlineMonth" INTEGER NOT NULL DEFAULT 1,
    "carryoverDeadlineDay" INTEGER NOT NULL DEFAULT 29,
    "carryoverRequestDeadlineMonth" INTEGER NOT NULL DEFAULT 1,
    "carryoverRequestDeadlineDay" INTEGER NOT NULL DEFAULT 29,
    "vacationRoundingUnit" DECIMAL(4,2) NOT NULL DEFAULT 0.1,
    "vacationRoundingMode" "public"."PtoRoundingMode" NOT NULL DEFAULT 'NEAREST',
    "personalMattersDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "compTimeDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pto_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurring_pto_adjustments" (
    "id" TEXT NOT NULL,
    "extraDays" DECIMAL(5,2) NOT NULL,
    "balanceType" "public"."PtoBalanceType" NOT NULL DEFAULT 'VACATION',
    "adjustmentType" "public"."PtoAdjustmentType" NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "recurring_pto_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."signable_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "originalFileUrl" TEXT NOT NULL,
    "originalHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "storedFileId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "signable_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."signature_batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."SignatureBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "documentId" TEXT NOT NULL,
    "requireDoubleSignature" BOOLEAN NOT NULL DEFAULT false,
    "secondSignerRole" "public"."SecondSignerRole",
    "secondSignerUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reminderDays" INTEGER[] DEFAULT ARRAY[7, 3, 1]::INTEGER[],
    "lastReminderAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "signedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "signature_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."signature_requests" (
    "id" TEXT NOT NULL,
    "status" "public"."SignatureRequestStatus" NOT NULL DEFAULT 'PENDING',
    "policy" TEXT NOT NULL DEFAULT 'SES',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "batchId" TEXT,
    "secondSignerMissing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."signers" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."SignerStatus" NOT NULL DEFAULT 'PENDING',
    "signToken" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signedFileUrl" TEXT,
    "signedHash" TEXT,
    "consentGivenAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "signers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."signature_evidences" (
    "id" TEXT NOT NULL,
    "timeline" JSONB NOT NULL,
    "preSignHash" TEXT NOT NULL,
    "postSignHash" TEXT,
    "signerMetadata" JSONB NOT NULL,
    "policy" TEXT NOT NULL,
    "result" "public"."SignatureResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,

    CONSTRAINT "signature_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manual_time_entry_requests" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockInTime" TIMESTAMP(3) NOT NULL,
    "clockOutTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "public"."ManualTimeEntryStatus" NOT NULL DEFAULT 'PENDING',
    "approverId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approverComments" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdClockInId" TEXT,
    "createdClockOutId" TEXT,
    "replacesIncompleteEntry" BOOLEAN NOT NULL DEFAULT false,
    "replacedEntryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warningMessage" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "manual_time_entry_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_procedures" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."ProcedureStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "estimatedAmount" DECIMAL(10,2),
    "approvedAmount" DECIMAL(10,2),
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_procedure_history" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "public"."ProcedureStatus",
    "newStatus" "public"."ProcedureStatus",
    "comment" TEXT,
    "details" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_procedure_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_approvers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_approvers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "amount" DECIMAL(10,2) NOT NULL,
    "vatPercent" DECIMAL(5,2),
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "category" "public"."ExpenseCategory" NOT NULL,
    "mileageKm" DECIMAL(10,2),
    "mileageRate" DECIMAL(5,3),
    "costCenterId" TEXT,
    "notes" TEXT,
    "merchantName" TEXT,
    "merchantVat" TEXT,
    "ocrRawData" JSONB,
    "status" "public"."ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "reimbursedAt" TIMESTAMP(3),
    "reimbursedBy" TEXT,
    "reimbursementMethod" "public"."ReimbursementMethod",
    "reimbursementReference" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reportId" TEXT,
    "procedureId" TEXT,
    "paidBy" "public"."ExpensePayer" NOT NULL DEFAULT 'EMPLOYEE',

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_attachments" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER NOT NULL,
    "storedFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expenseId" TEXT NOT NULL,

    CONSTRAINT "expense_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_approvals" (
    "id" TEXT NOT NULL,
    "decision" "public"."ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "level" INTEGER NOT NULL DEFAULT 1,
    "approverId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,

    CONSTRAINT "expense_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "expense_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."policy_snapshots" (
    "id" TEXT NOT NULL,
    "mileageRateEurPerKm" DECIMAL(5,3),
    "mealDailyLimit" DECIMAL(10,2),
    "lodgingDailyLimit" DECIMAL(10,2),
    "fuelRequiresReceipt" BOOLEAN NOT NULL DEFAULT true,
    "vatAllowed" BOOLEAN NOT NULL DEFAULT true,
    "costCenterRequired" BOOLEAN NOT NULL DEFAULT false,
    "expenseId" TEXT NOT NULL,

    CONSTRAINT "policy_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_policies" (
    "id" TEXT NOT NULL,
    "mileageRateEurPerKm" DECIMAL(5,3) NOT NULL DEFAULT 0.26,
    "mealDailyLimit" DECIMAL(10,2),
    "lodgingDailyLimit" DECIMAL(10,2),
    "categoryRequirements" JSONB NOT NULL DEFAULT '{}',
    "attachmentRequired" BOOLEAN NOT NULL DEFAULT true,
    "costCenterRequired" BOOLEAN NOT NULL DEFAULT false,
    "vatAllowed" BOOLEAN NOT NULL DEFAULT true,
    "approvalLevels" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "expense_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."geolocation_consents" (
    "id" TEXT NOT NULL,
    "consentGivenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "ipAddress" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "geolocation_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sensitive_data_access" (
    "id" TEXT NOT NULL,
    "dataType" "public"."SensitiveDataType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "sensitive_data_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "unreadCountUserA" INTEGER NOT NULL DEFAULT 0,
    "unreadCountUserB" INTEGER NOT NULL DEFAULT 0,
    "hiddenByUserA" BOOLEAN NOT NULL DEFAULT false,
    "hiddenByUserB" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "public"."MessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dismissed_notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "dismissed_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateType" "public"."ScheduleTemplateType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_periods" (
    "id" TEXT NOT NULL,
    "scheduleTemplateId" TEXT NOT NULL,
    "periodType" "public"."SchedulePeriodType" NOT NULL,
    "name" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_day_patterns" (
    "id" TEXT NOT NULL,
    "schedulePeriodId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "work_day_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_slots" (
    "id" TEXT NOT NULL,
    "workDayPatternId" TEXT NOT NULL,
    "startTimeMinutes" INTEGER NOT NULL,
    "endTimeMinutes" INTEGER NOT NULL,
    "slotType" "public"."TimeSlotType" NOT NULL DEFAULT 'WORK',
    "presenceType" "public"."PresenceType" NOT NULL DEFAULT 'MANDATORY',
    "countsAsWork" BOOLEAN NOT NULL DEFAULT true,
    "compensationFactor" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "description" TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manual_shift_assignments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "scheduleTemplateId" TEXT,
    "date" DATE NOT NULL,
    "startTimeMinutes" INTEGER,
    "endTimeMinutes" INTEGER,
    "costCenterId" TEXT,
    "workZoneId" TEXT,
    "breakMinutes" INTEGER,
    "customRole" TEXT,
    "notes" TEXT,
    "status" "public"."ManualShiftStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manual_shift_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pattern" TEXT[],
    "shiftDurationMinutes" INTEGER NOT NULL DEFAULT 480,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiredCoverage" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "costCenterId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shift_rotation_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_rotation_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shift_rotation_steps" (
    "id" TEXT NOT NULL,
    "rotationPatternId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "scheduleTemplateId" TEXT NOT NULL,

    CONSTRAINT "shift_rotation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_schedule_assignments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignmentType" "public"."ScheduleAssignmentType" NOT NULL,
    "scheduleTemplateId" TEXT,
    "rotationPatternId" TEXT,
    "rotationStartDate" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exception_day_overrides" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "scheduleTemplateId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "departmentId" TEXT,
    "costCenterId" TEXT,
    "date" DATE NOT NULL,
    "endDate" DATE,
    "reason" TEXT,
    "exceptionType" "public"."ExceptionType" NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exception_day_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exception_time_slots" (
    "id" TEXT NOT NULL,
    "exceptionDayId" TEXT NOT NULL,
    "startTimeMinutes" INTEGER NOT NULL,
    "endTimeMinutes" INTEGER NOT NULL,
    "slotType" "public"."TimeSlotType" NOT NULL,
    "presenceType" "public"."PresenceType" NOT NULL,

    CONSTRAINT "exception_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teams" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "orgId" TEXT NOT NULL,
    "departmentId" TEXT,
    "costCenterId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "color" TEXT,
    "accessType" "public"."ProjectAccessType" NOT NULL DEFAULT 'OPEN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_assignments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."area_responsibles" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "departmentId" TEXT,
    "costCenterId" TEXT,
    "teamId" TEXT,
    "permissions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "area_responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alert_subscriptions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "departmentId" TEXT,
    "costCenterId" TEXT,
    "teamId" TEXT,
    "alertTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "severityLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT false,
    "maxAlertsPerDay" INTEGER,
    "digestMode" BOOLEAN NOT NULL DEFAULT false,
    "digestTime" TEXT,
    "onlyFirstOccurrence" BOOLEAN NOT NULL DEFAULT false,
    "isUserOverride" BOOLEAN NOT NULL DEFAULT false,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alert_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alerts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "timeEntryId" TEXT,
    "workdaySummaryId" TEXT,
    "deviationMinutes" INTEGER,
    "incidents" JSONB,
    "costCenterId" TEXT,
    "originalCostCenterId" TEXT,
    "departmentId" TEXT,
    "teamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionComment" TEXT,
    "notifiedUsers" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alert_assignments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT,
    "source" TEXT NOT NULL,

    CONSTRAINT "alert_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alert_notes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "alert_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_active_contexts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "activeScope" TEXT NOT NULL DEFAULT 'ALL',
    "activeDepartmentId" TEXT,
    "activeCostCenterId" TEXT,
    "activeTeamId" TEXT,

    CONSTRAINT "user_active_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityData" JSONB,
    "description" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedByEmail" TEXT NOT NULL,
    "performedByName" TEXT NOT NULL,
    "performedByRole" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_import_jobs" (
    "id" TEXT NOT NULL,
    "status" "public"."EmployeeImportJobStatus" NOT NULL DEFAULT 'DRAFT',
    "options" JSONB NOT NULL DEFAULT '{}',
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "employee_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_import_rows" (
    "id" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rowHash" TEXT,
    "rawData" JSONB NOT NULL,
    "status" "public"."EmployeeImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "errorReason" TEXT,
    "createdEmployeeId" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobId" TEXT NOT NULL,

    CONSTRAINT "employee_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_setup_jobs" (
    "id" TEXT NOT NULL,
    "status" "public"."OrganizationSetupStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "organization_setup_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whistleblowing_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whistleblowing_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whistleblowing_reports" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "accessCodeHash" TEXT,
    "reporterType" "public"."ReporterType" NOT NULL,
    "reporterDisplayLabel" TEXT,
    "reporterMetadata" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "involvedParties" TEXT,
    "incidentDate" TIMESTAMP(3),
    "incidentLocation" TEXT,
    "status" "public"."WhistleblowingStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "public"."WhistleblowingPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolutionType" "public"."ResolutionType",
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "employeeId" TEXT,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "whistleblowing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whistleblowing_documents" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "storedFileId" TEXT,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whistleblowing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whistleblowing_activities" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "public"."WhistleblowingActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "performedById" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "whistleblowing_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "userId" TEXT,
    "orgId" TEXT,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "providerId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_vat_key" ON "public"."organizations"("vat");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_whistleblowingPublicSlug_key" ON "public"."organizations"("whistleblowingPublicSlug");

-- CreateIndex
CREATE INDEX "organization_group_organizations_groupId_idx" ON "public"."organization_group_organizations"("groupId");

-- CreateIndex
CREATE INDEX "organization_group_organizations_organizationId_idx" ON "public"."organization_group_organizations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_group_organizations_groupId_organizationId_key" ON "public"."organization_group_organizations"("groupId", "organizationId");

-- CreateIndex
CREATE INDEX "organization_group_users_groupId_idx" ON "public"."organization_group_users"("groupId");

-- CreateIndex
CREATE INDEX "organization_group_users_userId_idx" ON "public"."organization_group_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_group_users_groupId_userId_key" ON "public"."organization_group_users"("groupId", "userId");

-- CreateIndex
CREATE INDEX "storage_reservations_orgId_idx" ON "public"."storage_reservations"("orgId");

-- CreateIndex
CREATE INDEX "storage_reservations_expiresAt_idx" ON "public"."storage_reservations"("expiresAt");

-- CreateIndex
CREATE INDEX "org_role_permission_overrides_orgId_idx" ON "public"."org_role_permission_overrides"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_role_permission_overrides_orgId_role_key" ON "public"."org_role_permission_overrides"("orgId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "public"."users"("orgId");

-- CreateIndex
CREATE INDEX "user_organizations_userId_idx" ON "public"."user_organizations"("userId");

-- CreateIndex
CREATE INDEX "user_organizations_orgId_idx" ON "public"."user_organizations"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "user_organizations_userId_orgId_key" ON "public"."user_organizations"("userId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "public"."sessions"("userId");

-- CreateIndex
CREATE INDEX "password_history_userId_createdAt_idx" ON "public"."password_history"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_key" ON "public"."auth_tokens"("token");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_type_idx" ON "public"."auth_tokens"("userId", "type");

-- CreateIndex
CREATE INDEX "auth_tokens_token_idx" ON "public"."auth_tokens"("token");

-- CreateIndex
CREATE INDEX "cost_centers_orgId_idx" ON "public"."cost_centers"("orgId");

-- CreateIndex
CREATE INDEX "departments_orgId_idx" ON "public"."departments"("orgId");

-- CreateIndex
CREATE INDEX "departments_managerId_idx" ON "public"."departments"("managerId");

-- CreateIndex
CREATE INDEX "position_levels_orgId_idx" ON "public"."position_levels"("orgId");

-- CreateIndex
CREATE INDEX "position_levels_order_idx" ON "public"."position_levels"("order");

-- CreateIndex
CREATE UNIQUE INDEX "position_levels_orgId_name_key" ON "public"."position_levels"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "position_levels_orgId_order_key" ON "public"."position_levels"("orgId", "order");

-- CreateIndex
CREATE INDEX "positions_orgId_idx" ON "public"."positions"("orgId");

-- CreateIndex
CREATE INDEX "positions_levelId_idx" ON "public"."positions"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "public"."employees"("userId");

-- CreateIndex
CREATE INDEX "employees_orgId_idx" ON "public"."employees"("orgId");

-- CreateIndex
CREATE INDEX "employees_email_idx" ON "public"."employees"("email");

-- CreateIndex
CREATE INDEX "employees_expenseApproverId_idx" ON "public"."employees"("expenseApproverId");

-- CreateIndex
CREATE INDEX "employees_teamId_idx" ON "public"."employees"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_orgId_employeeNumber_key" ON "public"."employees"("orgId", "employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_orgId_nifNie_key" ON "public"."employees"("orgId", "nifNie");

-- CreateIndex
CREATE INDEX "employment_contracts_orgId_idx" ON "public"."employment_contracts"("orgId");

-- CreateIndex
CREATE INDEX "employment_contracts_employeeId_idx" ON "public"."employment_contracts"("employeeId");

-- CreateIndex
CREATE INDEX "contract_pause_history_contractId_idx" ON "public"."contract_pause_history"("contractId");

-- CreateIndex
CREATE INDEX "vacation_settlements_orgId_idx" ON "public"."vacation_settlements"("orgId");

-- CreateIndex
CREATE INDEX "vacation_settlements_employeeId_idx" ON "public"."vacation_settlements"("employeeId");

-- CreateIndex
CREATE INDEX "employee_documents_orgId_idx" ON "public"."employee_documents"("orgId");

-- CreateIndex
CREATE INDEX "employee_documents_employeeId_idx" ON "public"."employee_documents"("employeeId");

-- CreateIndex
CREATE INDEX "employee_documents_kind_payslipYear_payslipMonth_idx" ON "public"."employee_documents"("kind", "payslipYear", "payslipMonth");

-- CreateIndex
CREATE INDEX "employee_documents_isRevoked_idx" ON "public"."employee_documents"("isRevoked");

-- CreateIndex
CREATE INDEX "employee_documents_storedFileId_idx" ON "public"."employee_documents"("storedFileId");

-- CreateIndex
CREATE INDEX "employee_documents_deletedAt_idx" ON "public"."employee_documents"("deletedAt");

-- CreateIndex
CREATE INDEX "stored_files_orgId_idx" ON "public"."stored_files"("orgId");

-- CreateIndex
CREATE INDEX "stored_files_retainUntil_idx" ON "public"."stored_files"("retainUntil");

-- CreateIndex
CREATE INDEX "payslip_batches_orgId_idx" ON "public"."payslip_batches"("orgId");

-- CreateIndex
CREATE INDEX "payslip_batches_year_month_idx" ON "public"."payslip_batches"("year", "month");

-- CreateIndex
CREATE INDEX "payslip_batches_status_idx" ON "public"."payslip_batches"("status");

-- CreateIndex
CREATE INDEX "payslip_batches_kind_idx" ON "public"."payslip_batches"("kind");

-- CreateIndex
CREATE INDEX "payslip_batch_events_batchId_idx" ON "public"."payslip_batch_events"("batchId");

-- CreateIndex
CREATE INDEX "payslip_batch_events_createdAt_idx" ON "public"."payslip_batch_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payslip_upload_items_documentId_key" ON "public"."payslip_upload_items"("documentId");

-- CreateIndex
CREATE INDEX "payslip_upload_items_batchId_idx" ON "public"."payslip_upload_items"("batchId");

-- CreateIndex
CREATE INDEX "payslip_upload_items_orgId_idx" ON "public"."payslip_upload_items"("orgId");

-- CreateIndex
CREATE INDEX "payslip_upload_items_status_idx" ON "public"."payslip_upload_items"("status");

-- CreateIndex
CREATE INDEX "temporary_passwords_userId_idx" ON "public"."temporary_passwords"("userId");

-- CreateIndex
CREATE INDEX "temporary_passwords_orgId_idx" ON "public"."temporary_passwords"("orgId");

-- CreateIndex
CREATE INDEX "temporary_passwords_active_idx" ON "public"."temporary_passwords"("active");

-- CreateIndex
CREATE INDEX "temporary_passwords_expiresAt_idx" ON "public"."temporary_passwords"("expiresAt");

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
CREATE INDEX "time_entries_projectId_idx" ON "public"."time_entries"("projectId");

-- CreateIndex
CREATE INDEX "time_entries_employeeId_idx" ON "public"."time_entries"("employeeId");

-- CreateIndex
CREATE INDEX "time_entries_timestamp_idx" ON "public"."time_entries"("timestamp");

-- CreateIndex
CREATE INDEX "time_entries_entryType_idx" ON "public"."time_entries"("entryType");

-- CreateIndex
CREATE INDEX "time_entries_workdayId_idx" ON "public"."time_entries"("workdayId");

-- CreateIndex
CREATE INDEX "time_entries_isCancelled_idx" ON "public"."time_entries"("isCancelled");

-- CreateIndex
CREATE INDEX "time_entries_employeeId_orgId_timestamp_idx" ON "public"."time_entries"("employeeId", "orgId", "timestamp");

-- CreateIndex
CREATE INDEX "time_entries_employeeId_orgId_entryType_timestamp_idx" ON "public"."time_entries"("employeeId", "orgId", "entryType", "timestamp");

-- CreateIndex
CREATE INDEX "time_entries_employeeId_orgId_isCancelled_timestamp_idx" ON "public"."time_entries"("employeeId", "orgId", "isCancelled", "timestamp");

-- CreateIndex
CREATE INDEX "workday_summaries_orgId_idx" ON "public"."workday_summaries"("orgId");

-- CreateIndex
CREATE INDEX "workday_summaries_employeeId_idx" ON "public"."workday_summaries"("employeeId");

-- CreateIndex
CREATE INDEX "workday_summaries_date_idx" ON "public"."workday_summaries"("date");

-- CreateIndex
CREATE INDEX "workday_summaries_status_idx" ON "public"."workday_summaries"("status");

-- CreateIndex
CREATE INDEX "workday_summaries_employeeId_date_idx" ON "public"."workday_summaries"("employeeId", "date");

-- CreateIndex
CREATE INDEX "workday_summaries_orgId_date_idx" ON "public"."workday_summaries"("orgId", "date");

-- CreateIndex
CREATE INDEX "workday_summaries_orgId_employeeId_status_idx" ON "public"."workday_summaries"("orgId", "employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workday_summaries_orgId_employeeId_date_key" ON "public"."workday_summaries"("orgId", "employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "time_bank_settings_orgId_key" ON "public"."time_bank_settings"("orgId");

-- CreateIndex
CREATE INDEX "time_bank_settings_orgId_idx" ON "public"."time_bank_settings"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "time_bank_movements_requestId_key" ON "public"."time_bank_movements"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "time_bank_movements_overworkAuthorizationId_key" ON "public"."time_bank_movements"("overworkAuthorizationId");

-- CreateIndex
CREATE INDEX "time_bank_movements_orgId_employeeId_date_idx" ON "public"."time_bank_movements"("orgId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "time_bank_movements_workdayId_idx" ON "public"."time_bank_movements"("workdayId");

-- CreateIndex
CREATE INDEX "time_bank_movements_requestId_idx" ON "public"."time_bank_movements"("requestId");

-- CreateIndex
CREATE INDEX "time_bank_movements_overworkAuthorizationId_idx" ON "public"."time_bank_movements"("overworkAuthorizationId");

-- CreateIndex
CREATE INDEX "time_bank_movements_status_idx" ON "public"."time_bank_movements"("status");

-- CreateIndex
CREATE INDEX "time_bank_requests_orgId_employeeId_status_idx" ON "public"."time_bank_requests"("orgId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "time_bank_requests_reviewerId_idx" ON "public"."time_bank_requests"("reviewerId");

-- CreateIndex
CREATE INDEX "time_bank_requests_submittedAt_idx" ON "public"."time_bank_requests"("submittedAt");

-- CreateIndex
CREATE INDEX "overwork_authorizations_orgId_employeeId_status_idx" ON "public"."overwork_authorizations"("orgId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "overwork_authorizations_requestedById_idx" ON "public"."overwork_authorizations"("requestedById");

-- CreateIndex
CREATE INDEX "overwork_authorizations_approvedById_idx" ON "public"."overwork_authorizations"("approvedById");

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
CREATE UNIQUE INDEX "pto_balances_orgId_employeeId_year_balanceType_key" ON "public"."pto_balances"("orgId", "employeeId", "year", "balanceType");

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
CREATE INDEX "pto_requests_employeeId_startDate_endDate_idx" ON "public"."pto_requests"("employeeId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "pto_requests_orgId_status_startDate_idx" ON "public"."pto_requests"("orgId", "status", "startDate");

-- CreateIndex
CREATE INDEX "pto_requests_employeeId_status_idx" ON "public"."pto_requests"("employeeId", "status");

-- CreateIndex
CREATE INDEX "pto_request_documents_ptoRequestId_idx" ON "public"."pto_request_documents"("ptoRequestId");

-- CreateIndex
CREATE INDEX "pto_request_documents_uploadedById_idx" ON "public"."pto_request_documents"("uploadedById");

-- CreateIndex
CREATE INDEX "pto_request_documents_storedFileId_idx" ON "public"."pto_request_documents"("storedFileId");

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
CREATE INDEX "pto_notifications_manualTimeEntryRequestId_idx" ON "public"."pto_notifications"("manualTimeEntryRequestId");

-- CreateIndex
CREATE INDEX "pto_notifications_expenseId_idx" ON "public"."pto_notifications"("expenseId");

-- CreateIndex
CREATE INDEX "pto_balance_adjustments_orgId_idx" ON "public"."pto_balance_adjustments"("orgId");

-- CreateIndex
CREATE INDEX "pto_balance_adjustments_ptoBalanceId_idx" ON "public"."pto_balance_adjustments"("ptoBalanceId");

-- CreateIndex
CREATE INDEX "pto_balance_adjustments_createdById_idx" ON "public"."pto_balance_adjustments"("createdById");

-- CreateIndex
CREATE INDEX "pto_balance_adjustments_createdAt_idx" ON "public"."pto_balance_adjustments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_pto_config_orgId_key" ON "public"."organization_pto_config"("orgId");

-- CreateIndex
CREATE INDEX "recurring_pto_adjustments_orgId_idx" ON "public"."recurring_pto_adjustments"("orgId");

-- CreateIndex
CREATE INDEX "recurring_pto_adjustments_employeeId_idx" ON "public"."recurring_pto_adjustments"("employeeId");

-- CreateIndex
CREATE INDEX "recurring_pto_adjustments_active_idx" ON "public"."recurring_pto_adjustments"("active");

-- CreateIndex
CREATE INDEX "recurring_pto_adjustments_startYear_idx" ON "public"."recurring_pto_adjustments"("startYear");

-- CreateIndex
CREATE INDEX "signable_documents_orgId_idx" ON "public"."signable_documents"("orgId");

-- CreateIndex
CREATE INDEX "signable_documents_createdById_idx" ON "public"."signable_documents"("createdById");

-- CreateIndex
CREATE INDEX "signable_documents_category_idx" ON "public"."signable_documents"("category");

-- CreateIndex
CREATE INDEX "signable_documents_storedFileId_idx" ON "public"."signable_documents"("storedFileId");

-- CreateIndex
CREATE INDEX "signature_batches_orgId_status_idx" ON "public"."signature_batches"("orgId", "status");

-- CreateIndex
CREATE INDEX "signature_batches_documentId_idx" ON "public"."signature_batches"("documentId");

-- CreateIndex
CREATE INDEX "signature_batches_createdById_idx" ON "public"."signature_batches"("createdById");

-- CreateIndex
CREATE INDEX "signature_batches_expiresAt_idx" ON "public"."signature_batches"("expiresAt");

-- CreateIndex
CREATE INDEX "signature_requests_orgId_idx" ON "public"."signature_requests"("orgId");

-- CreateIndex
CREATE INDEX "signature_requests_documentId_idx" ON "public"."signature_requests"("documentId");

-- CreateIndex
CREATE INDEX "signature_requests_status_idx" ON "public"."signature_requests"("status");

-- CreateIndex
CREATE INDEX "signature_requests_expiresAt_idx" ON "public"."signature_requests"("expiresAt");

-- CreateIndex
CREATE INDEX "signature_requests_batchId_idx" ON "public"."signature_requests"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "signers_signToken_key" ON "public"."signers"("signToken");

-- CreateIndex
CREATE INDEX "signers_requestId_idx" ON "public"."signers"("requestId");

-- CreateIndex
CREATE INDEX "signers_employeeId_idx" ON "public"."signers"("employeeId");

-- CreateIndex
CREATE INDEX "signers_status_idx" ON "public"."signers"("status");

-- CreateIndex
CREATE INDEX "signers_signToken_idx" ON "public"."signers"("signToken");

-- CreateIndex
CREATE INDEX "signature_evidences_requestId_idx" ON "public"."signature_evidences"("requestId");

-- CreateIndex
CREATE INDEX "signature_evidences_signerId_idx" ON "public"."signature_evidences"("signerId");

-- CreateIndex
CREATE INDEX "signature_evidences_result_idx" ON "public"."signature_evidences"("result");

-- CreateIndex
CREATE INDEX "signature_evidences_createdAt_idx" ON "public"."signature_evidences"("createdAt");

-- CreateIndex
CREATE INDEX "manual_time_entry_requests_orgId_idx" ON "public"."manual_time_entry_requests"("orgId");

-- CreateIndex
CREATE INDEX "manual_time_entry_requests_employeeId_idx" ON "public"."manual_time_entry_requests"("employeeId");

-- CreateIndex
CREATE INDEX "manual_time_entry_requests_approverId_idx" ON "public"."manual_time_entry_requests"("approverId");

-- CreateIndex
CREATE INDEX "manual_time_entry_requests_status_idx" ON "public"."manual_time_entry_requests"("status");

-- CreateIndex
CREATE INDEX "manual_time_entry_requests_date_idx" ON "public"."manual_time_entry_requests"("date");

-- CreateIndex
CREATE INDEX "manual_time_entry_requests_submittedAt_idx" ON "public"."manual_time_entry_requests"("submittedAt");

-- CreateIndex
CREATE INDEX "expense_procedures_orgId_idx" ON "public"."expense_procedures"("orgId");

-- CreateIndex
CREATE INDEX "expense_procedures_employeeId_idx" ON "public"."expense_procedures"("employeeId");

-- CreateIndex
CREATE INDEX "expense_procedures_status_idx" ON "public"."expense_procedures"("status");

-- CreateIndex
CREATE INDEX "expense_procedure_history_procedureId_idx" ON "public"."expense_procedure_history"("procedureId");

-- CreateIndex
CREATE INDEX "expense_procedure_history_actorId_idx" ON "public"."expense_procedure_history"("actorId");

-- CreateIndex
CREATE INDEX "expense_approvers_orgId_idx" ON "public"."expense_approvers"("orgId");

-- CreateIndex
CREATE INDEX "expense_approvers_userId_idx" ON "public"."expense_approvers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_approvers_userId_orgId_key" ON "public"."expense_approvers"("userId", "orgId");

-- CreateIndex
CREATE INDEX "expenses_orgId_idx" ON "public"."expenses"("orgId");

-- CreateIndex
CREATE INDEX "expenses_employeeId_idx" ON "public"."expenses"("employeeId");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "public"."expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "public"."expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "public"."expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_reportId_idx" ON "public"."expenses"("reportId");

-- CreateIndex
CREATE INDEX "expense_attachments_expenseId_idx" ON "public"."expense_attachments"("expenseId");

-- CreateIndex
CREATE INDEX "expense_attachments_storedFileId_idx" ON "public"."expense_attachments"("storedFileId");

-- CreateIndex
CREATE INDEX "expense_approvals_expenseId_idx" ON "public"."expense_approvals"("expenseId");

-- CreateIndex
CREATE INDEX "expense_approvals_approverId_idx" ON "public"."expense_approvals"("approverId");

-- CreateIndex
CREATE INDEX "expense_approvals_decision_idx" ON "public"."expense_approvals"("decision");

-- CreateIndex
CREATE INDEX "expense_reports_orgId_idx" ON "public"."expense_reports"("orgId");

-- CreateIndex
CREATE INDEX "expense_reports_ownerId_idx" ON "public"."expense_reports"("ownerId");

-- CreateIndex
CREATE INDEX "expense_reports_status_idx" ON "public"."expense_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "policy_snapshots_expenseId_key" ON "public"."policy_snapshots"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_policies_orgId_key" ON "public"."expense_policies"("orgId");

-- CreateIndex
CREATE INDEX "geolocation_consents_orgId_idx" ON "public"."geolocation_consents"("orgId");

-- CreateIndex
CREATE INDEX "geolocation_consents_userId_idx" ON "public"."geolocation_consents"("userId");

-- CreateIndex
CREATE INDEX "geolocation_consents_active_idx" ON "public"."geolocation_consents"("active");

-- CreateIndex
CREATE UNIQUE INDEX "geolocation_consents_userId_orgId_key" ON "public"."geolocation_consents"("userId", "orgId");

-- CreateIndex
CREATE INDEX "sensitive_data_access_orgId_idx" ON "public"."sensitive_data_access"("orgId");

-- CreateIndex
CREATE INDEX "sensitive_data_access_userId_idx" ON "public"."sensitive_data_access"("userId");

-- CreateIndex
CREATE INDEX "sensitive_data_access_resourceId_idx" ON "public"."sensitive_data_access"("resourceId");

-- CreateIndex
CREATE INDEX "sensitive_data_access_dataType_idx" ON "public"."sensitive_data_access"("dataType");

-- CreateIndex
CREATE INDEX "sensitive_data_access_accessedAt_idx" ON "public"."sensitive_data_access"("accessedAt");

-- CreateIndex
CREATE INDEX "conversations_orgId_idx" ON "public"."conversations"("orgId");

-- CreateIndex
CREATE INDEX "conversations_userAId_idx" ON "public"."conversations"("userAId");

-- CreateIndex
CREATE INDEX "conversations_userBId_idx" ON "public"."conversations"("userBId");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "public"."conversations"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_orgId_userAId_userBId_key" ON "public"."conversations"("orgId", "userAId", "userBId");

-- CreateIndex
CREATE INDEX "messages_orgId_idx" ON "public"."messages"("orgId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "public"."messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "public"."messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "public"."messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "public"."messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "dismissed_notifications_userId_type_idx" ON "public"."dismissed_notifications"("userId", "type");

-- CreateIndex
CREATE INDEX "dismissed_notifications_orgId_idx" ON "public"."dismissed_notifications"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "dismissed_notifications_userId_type_referenceId_key" ON "public"."dismissed_notifications"("userId", "type", "referenceId");

-- CreateIndex
CREATE INDEX "schedule_templates_orgId_idx" ON "public"."schedule_templates"("orgId");

-- CreateIndex
CREATE INDEX "schedule_periods_scheduleTemplateId_idx" ON "public"."schedule_periods"("scheduleTemplateId");

-- CreateIndex
CREATE INDEX "work_day_patterns_schedulePeriodId_idx" ON "public"."work_day_patterns"("schedulePeriodId");

-- CreateIndex
CREATE INDEX "time_slots_workDayPatternId_idx" ON "public"."time_slots"("workDayPatternId");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_orgId_idx" ON "public"."manual_shift_assignments"("orgId");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_scheduleTemplateId_idx" ON "public"."manual_shift_assignments"("scheduleTemplateId");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_costCenterId_idx" ON "public"."manual_shift_assignments"("costCenterId");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_workZoneId_idx" ON "public"."manual_shift_assignments"("workZoneId");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_status_idx" ON "public"."manual_shift_assignments"("status");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_date_idx" ON "public"."manual_shift_assignments"("date");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_orgId_date_idx" ON "public"."manual_shift_assignments"("orgId", "date");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_orgId_date_status_idx" ON "public"."manual_shift_assignments"("orgId", "date", "status");

-- CreateIndex
CREATE INDEX "manual_shift_assignments_costCenterId_date_idx" ON "public"."manual_shift_assignments"("costCenterId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "manual_shift_assignments_employeeId_date_key" ON "public"."manual_shift_assignments"("employeeId", "date");

-- CreateIndex
CREATE INDEX "manual_shift_templates_orgId_idx" ON "public"."manual_shift_templates"("orgId");

-- CreateIndex
CREATE INDEX "work_zones_orgId_idx" ON "public"."work_zones"("orgId");

-- CreateIndex
CREATE INDEX "work_zones_costCenterId_idx" ON "public"."work_zones"("costCenterId");

-- CreateIndex
CREATE INDEX "shift_rotation_patterns_orgId_idx" ON "public"."shift_rotation_patterns"("orgId");

-- CreateIndex
CREATE INDEX "shift_rotation_steps_rotationPatternId_idx" ON "public"."shift_rotation_steps"("rotationPatternId");

-- CreateIndex
CREATE INDEX "employee_schedule_assignments_employeeId_idx" ON "public"."employee_schedule_assignments"("employeeId");

-- CreateIndex
CREATE INDEX "employee_schedule_assignments_employeeId_isActive_validFrom_idx" ON "public"."employee_schedule_assignments"("employeeId", "isActive", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "exception_day_overrides_employeeId_idx" ON "public"."exception_day_overrides"("employeeId");

-- CreateIndex
CREATE INDEX "exception_day_overrides_scheduleTemplateId_idx" ON "public"."exception_day_overrides"("scheduleTemplateId");

-- CreateIndex
CREATE INDEX "exception_day_overrides_departmentId_idx" ON "public"."exception_day_overrides"("departmentId");

-- CreateIndex
CREATE INDEX "exception_day_overrides_costCenterId_idx" ON "public"."exception_day_overrides"("costCenterId");

-- CreateIndex
CREATE INDEX "exception_day_overrides_orgId_idx" ON "public"."exception_day_overrides"("orgId");

-- CreateIndex
CREATE INDEX "exception_day_overrides_date_idx" ON "public"."exception_day_overrides"("date");

-- CreateIndex
CREATE INDEX "exception_day_overrides_isGlobal_idx" ON "public"."exception_day_overrides"("isGlobal");

-- CreateIndex
CREATE INDEX "exception_day_overrides_deletedAt_idx" ON "public"."exception_day_overrides"("deletedAt");

-- CreateIndex
CREATE INDEX "exception_day_overrides_createdBy_idx" ON "public"."exception_day_overrides"("createdBy");

-- CreateIndex
CREATE INDEX "exception_day_overrides_deletedBy_idx" ON "public"."exception_day_overrides"("deletedBy");

-- CreateIndex
CREATE INDEX "exception_time_slots_exceptionDayId_idx" ON "public"."exception_time_slots"("exceptionDayId");

-- CreateIndex
CREATE INDEX "teams_orgId_idx" ON "public"."teams"("orgId");

-- CreateIndex
CREATE INDEX "teams_costCenterId_idx" ON "public"."teams"("costCenterId");

-- CreateIndex
CREATE INDEX "teams_isActive_idx" ON "public"."teams"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "teams_orgId_code_key" ON "public"."teams"("orgId", "code");

-- CreateIndex
CREATE INDEX "projects_orgId_idx" ON "public"."projects"("orgId");

-- CreateIndex
CREATE INDEX "projects_isActive_idx" ON "public"."projects"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "projects_orgId_name_key" ON "public"."projects"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "projects_orgId_code_key" ON "public"."projects"("orgId", "code");

-- CreateIndex
CREATE INDEX "project_assignments_projectId_idx" ON "public"."project_assignments"("projectId");

-- CreateIndex
CREATE INDEX "project_assignments_employeeId_idx" ON "public"."project_assignments"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_projectId_employeeId_key" ON "public"."project_assignments"("projectId", "employeeId");

-- CreateIndex
CREATE INDEX "area_responsibles_userId_idx" ON "public"."area_responsibles"("userId");

-- CreateIndex
CREATE INDEX "area_responsibles_orgId_idx" ON "public"."area_responsibles"("orgId");

-- CreateIndex
CREATE INDEX "area_responsibles_departmentId_idx" ON "public"."area_responsibles"("departmentId");

-- CreateIndex
CREATE INDEX "area_responsibles_costCenterId_idx" ON "public"."area_responsibles"("costCenterId");

-- CreateIndex
CREATE INDEX "area_responsibles_teamId_idx" ON "public"."area_responsibles"("teamId");

-- CreateIndex
CREATE INDEX "area_responsibles_isActive_idx" ON "public"."area_responsibles"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "area_responsibles_userId_scope_departmentId_costCenterId_te_key" ON "public"."area_responsibles"("userId", "scope", "departmentId", "costCenterId", "teamId");

-- CreateIndex
CREATE INDEX "alert_subscriptions_userId_idx" ON "public"."alert_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "alert_subscriptions_orgId_idx" ON "public"."alert_subscriptions"("orgId");

-- CreateIndex
CREATE INDEX "alert_subscriptions_departmentId_idx" ON "public"."alert_subscriptions"("departmentId");

-- CreateIndex
CREATE INDEX "alert_subscriptions_costCenterId_idx" ON "public"."alert_subscriptions"("costCenterId");

-- CreateIndex
CREATE INDEX "alert_subscriptions_teamId_idx" ON "public"."alert_subscriptions"("teamId");

-- CreateIndex
CREATE INDEX "alert_subscriptions_isActive_idx" ON "public"."alert_subscriptions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "alert_subscriptions_userId_scope_departmentId_costCenterId__key" ON "public"."alert_subscriptions"("userId", "scope", "departmentId", "costCenterId", "teamId");

-- CreateIndex
CREATE INDEX "alerts_orgId_idx" ON "public"."alerts"("orgId");

-- CreateIndex
CREATE INDEX "alerts_employeeId_idx" ON "public"."alerts"("employeeId");

-- CreateIndex
CREATE INDEX "alerts_departmentId_idx" ON "public"."alerts"("departmentId");

-- CreateIndex
CREATE INDEX "alerts_costCenterId_idx" ON "public"."alerts"("costCenterId");

-- CreateIndex
CREATE INDEX "alerts_originalCostCenterId_idx" ON "public"."alerts"("originalCostCenterId");

-- CreateIndex
CREATE INDEX "alerts_teamId_idx" ON "public"."alerts"("teamId");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "public"."alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_date_idx" ON "public"."alerts"("date");

-- CreateIndex
CREATE INDEX "alerts_type_idx" ON "public"."alerts"("type");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "public"."alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "public"."alerts"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_timeEntryId_idx" ON "public"."alerts"("timeEntryId");

-- CreateIndex
CREATE INDEX "alerts_orgId_status_severity_idx" ON "public"."alerts"("orgId", "status", "severity");

-- CreateIndex
CREATE INDEX "alerts_costCenterId_status_date_idx" ON "public"."alerts"("costCenterId", "status", "date");

-- CreateIndex
CREATE INDEX "alerts_teamId_status_date_idx" ON "public"."alerts"("teamId", "status", "date");

-- CreateIndex
CREATE INDEX "alerts_employeeId_date_type_idx" ON "public"."alerts"("employeeId", "date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_employeeId_date_type_key" ON "public"."alerts"("employeeId", "date", "type");

-- CreateIndex
CREATE INDEX "alert_assignments_alertId_idx" ON "public"."alert_assignments"("alertId");

-- CreateIndex
CREATE INDEX "alert_assignments_userId_idx" ON "public"."alert_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "alert_assignments_alertId_userId_key" ON "public"."alert_assignments"("alertId", "userId");

-- CreateIndex
CREATE INDEX "alert_notes_alertId_idx" ON "public"."alert_notes"("alertId");

-- CreateIndex
CREATE INDEX "alert_notes_userId_idx" ON "public"."alert_notes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_active_contexts_userId_key" ON "public"."user_active_contexts"("userId");

-- CreateIndex
CREATE INDEX "user_active_contexts_userId_idx" ON "public"."user_active_contexts"("userId");

-- CreateIndex
CREATE INDEX "user_active_contexts_orgId_idx" ON "public"."user_active_contexts"("orgId");

-- CreateIndex
CREATE INDEX "user_active_contexts_activeScope_idx" ON "public"."user_active_contexts"("activeScope");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_idx" ON "public"."audit_logs"("orgId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_performedById_idx" ON "public"."audit_logs"("performedById");

-- CreateIndex
CREATE INDEX "employee_import_jobs_orgId_idx" ON "public"."employee_import_jobs"("orgId");

-- CreateIndex
CREATE INDEX "employee_import_jobs_status_idx" ON "public"."employee_import_jobs"("status");

-- CreateIndex
CREATE INDEX "employee_import_rows_jobId_status_idx" ON "public"."employee_import_rows"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_import_rows_jobId_rowIndex_key" ON "public"."employee_import_rows"("jobId", "rowIndex");

-- CreateIndex
CREATE INDEX "organization_setup_jobs_orgId_idx" ON "public"."organization_setup_jobs"("orgId");

-- CreateIndex
CREATE INDEX "organization_setup_jobs_createdById_idx" ON "public"."organization_setup_jobs"("createdById");

-- CreateIndex
CREATE INDEX "whistleblowing_categories_orgId_idx" ON "public"."whistleblowing_categories"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "whistleblowing_reports_trackingCode_key" ON "public"."whistleblowing_reports"("trackingCode");

-- CreateIndex
CREATE INDEX "whistleblowing_reports_orgId_status_idx" ON "public"."whistleblowing_reports"("orgId", "status");

-- CreateIndex
CREATE INDEX "whistleblowing_reports_trackingCode_idx" ON "public"."whistleblowing_reports"("trackingCode");

-- CreateIndex
CREATE INDEX "whistleblowing_reports_assignedToId_idx" ON "public"."whistleblowing_reports"("assignedToId");

-- CreateIndex
CREATE INDEX "whistleblowing_documents_reportId_idx" ON "public"."whistleblowing_documents"("reportId");

-- CreateIndex
CREATE INDEX "whistleblowing_documents_storedFileId_idx" ON "public"."whistleblowing_documents"("storedFileId");

-- CreateIndex
CREATE INDEX "whistleblowing_activities_reportId_idx" ON "public"."whistleblowing_activities"("reportId");

-- CreateIndex
CREATE INDEX "email_logs_userId_idx" ON "public"."email_logs"("userId");

-- CreateIndex
CREATE INDEX "email_logs_orgId_idx" ON "public"."email_logs"("orgId");

-- CreateIndex
CREATE INDEX "email_logs_templateId_idx" ON "public"."email_logs"("templateId");

-- CreateIndex
CREATE INDEX "email_logs_createdAt_idx" ON "public"."email_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."organization_group_organizations" ADD CONSTRAINT "organization_group_organizations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."organization_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_group_organizations" ADD CONSTRAINT "organization_group_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_group_users" ADD CONSTRAINT "organization_group_users_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."organization_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_group_users" ADD CONSTRAINT "organization_group_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."storage_reservations" ADD CONSTRAINT "storage_reservations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_role_permission_overrides" ADD CONSTRAINT "org_role_permission_overrides_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_organizations" ADD CONSTRAINT "user_organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_organizations" ADD CONSTRAINT "user_organizations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_history" ADD CONSTRAINT "password_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cost_centers" ADD CONSTRAINT "cost_centers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."position_levels" ADD CONSTRAINT "position_levels_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "public"."position_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_expenseApproverId_fkey" FOREIGN KEY ("expenseApproverId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employment_contracts" ADD CONSTRAINT "employment_contracts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employment_contracts" ADD CONSTRAINT "employment_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employment_contracts" ADD CONSTRAINT "employment_contracts_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employment_contracts" ADD CONSTRAINT "employment_contracts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employment_contracts" ADD CONSTRAINT "employment_contracts_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employment_contracts" ADD CONSTRAINT "employment_contracts_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contract_pause_history" ADD CONSTRAINT "contract_pause_history_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."employment_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vacation_settlements" ADD CONSTRAINT "vacation_settlements_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vacation_settlements" ADD CONSTRAINT "vacation_settlements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_payslipBatchId_fkey" FOREIGN KEY ("payslipBatchId") REFERENCES "public"."payslip_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stored_files" ADD CONSTRAINT "stored_files_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stored_files" ADD CONSTRAINT "stored_files_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stored_files" ADD CONSTRAINT "stored_files_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_batches" ADD CONSTRAINT "payslip_batches_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_batches" ADD CONSTRAINT "payslip_batches_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_batches" ADD CONSTRAINT "payslip_batches_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_batches" ADD CONSTRAINT "payslip_batches_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_batch_events" ADD CONSTRAINT "payslip_batch_events_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."payslip_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."payslip_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."employee_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payslip_upload_items" ADD CONSTRAINT "payslip_upload_items_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."temporary_passwords" ADD CONSTRAINT "temporary_passwords_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."temporary_passwords" ADD CONSTRAINT "temporary_passwords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."temporary_passwords" ADD CONSTRAINT "temporary_passwords_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workday_summaries" ADD CONSTRAINT "workday_summaries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workday_summaries" ADD CONSTRAINT "workday_summaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_settings" ADD CONSTRAINT "time_bank_settings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_settings" ADD CONSTRAINT "time_bank_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_settings" ADD CONSTRAINT "time_bank_settings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_movements" ADD CONSTRAINT "time_bank_movements_workdayId_fkey" FOREIGN KEY ("workdayId") REFERENCES "public"."workday_summaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_movements" ADD CONSTRAINT "time_bank_movements_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."time_bank_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_movements" ADD CONSTRAINT "time_bank_movements_overworkAuthorizationId_fkey" FOREIGN KEY ("overworkAuthorizationId") REFERENCES "public"."overwork_authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_movements" ADD CONSTRAINT "time_bank_movements_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_movements" ADD CONSTRAINT "time_bank_movements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_movements" ADD CONSTRAINT "time_bank_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_movements" ADD CONSTRAINT "time_bank_movements_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_requests" ADD CONSTRAINT "time_bank_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_requests" ADD CONSTRAINT "time_bank_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_requests" ADD CONSTRAINT "time_bank_requests_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_bank_requests" ADD CONSTRAINT "time_bank_requests_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."overwork_authorizations" ADD CONSTRAINT "overwork_authorizations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."overwork_authorizations" ADD CONSTRAINT "overwork_authorizations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."overwork_authorizations" ADD CONSTRAINT "overwork_authorizations_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."overwork_authorizations" ADD CONSTRAINT "overwork_authorizations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "public"."pto_request_documents" ADD CONSTRAINT "pto_request_documents_ptoRequestId_fkey" FOREIGN KEY ("ptoRequestId") REFERENCES "public"."pto_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_request_documents" ADD CONSTRAINT "pto_request_documents_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_request_documents" ADD CONSTRAINT "pto_request_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_notifications" ADD CONSTRAINT "pto_notifications_ptoRequestId_fkey" FOREIGN KEY ("ptoRequestId") REFERENCES "public"."pto_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_notifications" ADD CONSTRAINT "pto_notifications_manualTimeEntryRequestId_fkey" FOREIGN KEY ("manualTimeEntryRequestId") REFERENCES "public"."manual_time_entry_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_notifications" ADD CONSTRAINT "pto_notifications_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_notifications" ADD CONSTRAINT "pto_notifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_notifications" ADD CONSTRAINT "pto_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_balance_adjustments" ADD CONSTRAINT "pto_balance_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_balance_adjustments" ADD CONSTRAINT "pto_balance_adjustments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pto_balance_adjustments" ADD CONSTRAINT "pto_balance_adjustments_ptoBalanceId_fkey" FOREIGN KEY ("ptoBalanceId") REFERENCES "public"."pto_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_pto_config" ADD CONSTRAINT "organization_pto_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_pto_adjustments" ADD CONSTRAINT "recurring_pto_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_pto_adjustments" ADD CONSTRAINT "recurring_pto_adjustments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_pto_adjustments" ADD CONSTRAINT "recurring_pto_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signable_documents" ADD CONSTRAINT "signable_documents_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signable_documents" ADD CONSTRAINT "signable_documents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signable_documents" ADD CONSTRAINT "signable_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_batches" ADD CONSTRAINT "signature_batches_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."signable_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_batches" ADD CONSTRAINT "signature_batches_secondSignerUserId_fkey" FOREIGN KEY ("secondSignerUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_batches" ADD CONSTRAINT "signature_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_batches" ADD CONSTRAINT "signature_batches_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_requests" ADD CONSTRAINT "signature_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_requests" ADD CONSTRAINT "signature_requests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."signable_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_requests" ADD CONSTRAINT "signature_requests_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."signature_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signers" ADD CONSTRAINT "signers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signers" ADD CONSTRAINT "signers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."signature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_evidences" ADD CONSTRAINT "signature_evidences_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."signature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature_evidences" ADD CONSTRAINT "signature_evidences_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "public"."signers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_time_entry_requests" ADD CONSTRAINT "manual_time_entry_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_time_entry_requests" ADD CONSTRAINT "manual_time_entry_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_time_entry_requests" ADD CONSTRAINT "manual_time_entry_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_procedures" ADD CONSTRAINT "expense_procedures_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_procedures" ADD CONSTRAINT "expense_procedures_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_procedures" ADD CONSTRAINT "expense_procedures_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_procedure_history" ADD CONSTRAINT "expense_procedure_history_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "public"."expense_procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_procedure_history" ADD CONSTRAINT "expense_procedure_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_approvers" ADD CONSTRAINT "expense_approvers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_approvers" ADD CONSTRAINT "expense_approvers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_reimbursedBy_fkey" FOREIGN KEY ("reimbursedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."expense_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "public"."expense_procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_attachments" ADD CONSTRAINT "expense_attachments_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_attachments" ADD CONSTRAINT "expense_attachments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_approvals" ADD CONSTRAINT "expense_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_approvals" ADD CONSTRAINT "expense_approvals_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_reports" ADD CONSTRAINT "expense_reports_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_reports" ADD CONSTRAINT "expense_reports_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."policy_snapshots" ADD CONSTRAINT "policy_snapshots_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_policies" ADD CONSTRAINT "expense_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."geolocation_consents" ADD CONSTRAINT "geolocation_consents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."geolocation_consents" ADD CONSTRAINT "geolocation_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sensitive_data_access" ADD CONSTRAINT "sensitive_data_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sensitive_data_access" ADD CONSTRAINT "sensitive_data_access_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dismissed_notifications" ADD CONSTRAINT "dismissed_notifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dismissed_notifications" ADD CONSTRAINT "dismissed_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_templates" ADD CONSTRAINT "schedule_templates_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_periods" ADD CONSTRAINT "schedule_periods_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "public"."schedule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_day_patterns" ADD CONSTRAINT "work_day_patterns_schedulePeriodId_fkey" FOREIGN KEY ("schedulePeriodId") REFERENCES "public"."schedule_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_slots" ADD CONSTRAINT "time_slots_workDayPatternId_fkey" FOREIGN KEY ("workDayPatternId") REFERENCES "public"."work_day_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_shift_assignments" ADD CONSTRAINT "manual_shift_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_shift_assignments" ADD CONSTRAINT "manual_shift_assignments_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "public"."schedule_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_shift_assignments" ADD CONSTRAINT "manual_shift_assignments_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_shift_assignments" ADD CONSTRAINT "manual_shift_assignments_workZoneId_fkey" FOREIGN KEY ("workZoneId") REFERENCES "public"."work_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_shift_assignments" ADD CONSTRAINT "manual_shift_assignments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_shift_templates" ADD CONSTRAINT "manual_shift_templates_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_zones" ADD CONSTRAINT "work_zones_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_zones" ADD CONSTRAINT "work_zones_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_rotation_patterns" ADD CONSTRAINT "shift_rotation_patterns_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_rotation_steps" ADD CONSTRAINT "shift_rotation_steps_rotationPatternId_fkey" FOREIGN KEY ("rotationPatternId") REFERENCES "public"."shift_rotation_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_rotation_steps" ADD CONSTRAINT "shift_rotation_steps_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "public"."schedule_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "public"."schedule_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_rotationPatternId_fkey" FOREIGN KEY ("rotationPatternId") REFERENCES "public"."shift_rotation_patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exception_day_overrides" ADD CONSTRAINT "exception_day_overrides_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exception_day_overrides" ADD CONSTRAINT "exception_day_overrides_scheduleTemplateId_fkey" FOREIGN KEY ("scheduleTemplateId") REFERENCES "public"."schedule_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exception_day_overrides" ADD CONSTRAINT "exception_day_overrides_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exception_day_overrides" ADD CONSTRAINT "exception_day_overrides_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exception_day_overrides" ADD CONSTRAINT "exception_day_overrides_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exception_day_overrides" ADD CONSTRAINT "exception_day_overrides_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exception_day_overrides" ADD CONSTRAINT "exception_day_overrides_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exception_time_slots" ADD CONSTRAINT "exception_time_slots_exceptionDayId_fkey" FOREIGN KEY ("exceptionDayId") REFERENCES "public"."exception_day_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_assignments" ADD CONSTRAINT "project_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_assignments" ADD CONSTRAINT "project_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."area_responsibles" ADD CONSTRAINT "area_responsibles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."area_responsibles" ADD CONSTRAINT "area_responsibles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."area_responsibles" ADD CONSTRAINT "area_responsibles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."area_responsibles" ADD CONSTRAINT "area_responsibles_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."area_responsibles" ADD CONSTRAINT "area_responsibles_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "public"."time_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_workdaySummaryId_fkey" FOREIGN KEY ("workdaySummaryId") REFERENCES "public"."workday_summaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_originalCostCenterId_fkey" FOREIGN KEY ("originalCostCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_assignments" ADD CONSTRAINT "alert_assignments_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "public"."alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_assignments" ADD CONSTRAINT "alert_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_assignments" ADD CONSTRAINT "alert_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_notes" ADD CONSTRAINT "alert_notes_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "public"."alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alert_notes" ADD CONSTRAINT "alert_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_active_contexts" ADD CONSTRAINT "user_active_contexts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_active_contexts" ADD CONSTRAINT "user_active_contexts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_active_contexts" ADD CONSTRAINT "user_active_contexts_activeDepartmentId_fkey" FOREIGN KEY ("activeDepartmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_active_contexts" ADD CONSTRAINT "user_active_contexts_activeCostCenterId_fkey" FOREIGN KEY ("activeCostCenterId") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_active_contexts" ADD CONSTRAINT "user_active_contexts_activeTeamId_fkey" FOREIGN KEY ("activeTeamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_import_jobs" ADD CONSTRAINT "employee_import_jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_import_jobs" ADD CONSTRAINT "employee_import_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_import_rows" ADD CONSTRAINT "employee_import_rows_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."employee_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_setup_jobs" ADD CONSTRAINT "organization_setup_jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_setup_jobs" ADD CONSTRAINT "organization_setup_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_categories" ADD CONSTRAINT "whistleblowing_categories_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_reports" ADD CONSTRAINT "whistleblowing_reports_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_reports" ADD CONSTRAINT "whistleblowing_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_reports" ADD CONSTRAINT "whistleblowing_reports_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_reports" ADD CONSTRAINT "whistleblowing_reports_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."whistleblowing_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_reports" ADD CONSTRAINT "whistleblowing_reports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_reports" ADD CONSTRAINT "whistleblowing_reports_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_documents" ADD CONSTRAINT "whistleblowing_documents_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."whistleblowing_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_documents" ADD CONSTRAINT "whistleblowing_documents_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "public"."stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_documents" ADD CONSTRAINT "whistleblowing_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_activities" ADD CONSTRAINT "whistleblowing_activities_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."whistleblowing_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whistleblowing_activities" ADD CONSTRAINT "whistleblowing_activities_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

