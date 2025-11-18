--
-- PostgreSQL database dump
--

-- Dumped from database version 15.14
-- Dumped by pg_dump version 16.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: erp_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO erp_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: erp_user
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ApprovalDecision; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."ApprovalDecision" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ApprovalDecision" OWNER TO erp_user;

--
-- Name: CalendarEventType; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."CalendarEventType" AS ENUM (
    'HOLIDAY',
    'CLOSURE',
    'EVENT',
    'MEETING',
    'DEADLINE',
    'OTHER'
);


ALTER TYPE public."CalendarEventType" OWNER TO erp_user;

--
-- Name: CalendarType; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."CalendarType" AS ENUM (
    'NATIONAL_HOLIDAY',
    'LOCAL_HOLIDAY',
    'CORPORATE_EVENT',
    'CUSTOM'
);


ALTER TYPE public."CalendarType" OWNER TO erp_user;

--
-- Name: CancellationReason; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."CancellationReason" AS ENUM (
    'EXCESSIVE_DURATION',
    'USER_ERROR',
    'SYSTEM_ERROR',
    'ADMIN_CORRECTION',
    'REPLACED_BY_MANUAL_REQUEST'
);


ALTER TYPE public."CancellationReason" OWNER TO erp_user;

--
-- Name: DocumentKind; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."DocumentKind" AS ENUM (
    'CONTRACT',
    'PAYSLIP',
    'ID_DOCUMENT',
    'SS_DOCUMENT',
    'CERTIFICATE',
    'MEDICAL',
    'OTHER'
);


ALTER TYPE public."DocumentKind" OWNER TO erp_user;

--
-- Name: EmploymentStatus; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."EmploymentStatus" AS ENUM (
    'PENDING_CONTRACT',
    'ACTIVE',
    'ON_LEAVE',
    'VACATION',
    'SUSPENDED',
    'TERMINATED',
    'RETIRED'
);


ALTER TYPE public."EmploymentStatus" OWNER TO erp_user;

--
-- Name: ExpenseCategory; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."ExpenseCategory" AS ENUM (
    'FUEL',
    'MILEAGE',
    'MEAL',
    'TOLL',
    'PARKING',
    'LODGING',
    'OTHER'
);


ALTER TYPE public."ExpenseCategory" OWNER TO erp_user;

--
-- Name: ExpenseStatus; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."ExpenseStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'REIMBURSED'
);


ALTER TYPE public."ExpenseStatus" OWNER TO erp_user;

--
-- Name: HierarchyType; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."HierarchyType" AS ENUM (
    'FLAT',
    'DEPARTMENTAL',
    'HIERARCHICAL'
);


ALTER TYPE public."HierarchyType" OWNER TO erp_user;

--
-- Name: ManualTimeEntryStatus; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."ManualTimeEntryStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ManualTimeEntryStatus" OWNER TO erp_user;

--
-- Name: MessageStatus; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."MessageStatus" AS ENUM (
    'SENT',
    'READ'
);


ALTER TYPE public."MessageStatus" OWNER TO erp_user;

--
-- Name: PtoAdjustmentType; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."PtoAdjustmentType" AS ENUM (
    'MANUAL_ADD',
    'MANUAL_SUBTRACT',
    'SENIORITY_BONUS',
    'COLLECTIVE_AGREEMENT',
    'COMPENSATION',
    'CORRECTION',
    'MATERNITY_LEAVE',
    'PATERNITY_LEAVE',
    'SICK_LEAVE',
    'OTHER'
);


ALTER TYPE public."PtoAdjustmentType" OWNER TO erp_user;

--
-- Name: PtoNotificationType; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."PtoNotificationType" AS ENUM (
    'PTO_SUBMITTED',
    'PTO_APPROVED',
    'PTO_REJECTED',
    'PTO_CANCELLED',
    'PTO_REMINDER',
    'DOCUMENT_UPLOADED',
    'SYSTEM_ANNOUNCEMENT',
    'SIGNATURE_PENDING',
    'SIGNATURE_COMPLETED',
    'SIGNATURE_REJECTED',
    'SIGNATURE_EXPIRED',
    'MANUAL_TIME_ENTRY_SUBMITTED',
    'MANUAL_TIME_ENTRY_APPROVED',
    'MANUAL_TIME_ENTRY_REJECTED',
    'EXPENSE_SUBMITTED',
    'EXPENSE_APPROVED',
    'EXPENSE_REJECTED',
    'EXPENSE_REIMBURSED',
    'TIME_ENTRY_EXCESSIVE'
);


ALTER TYPE public."PtoNotificationType" OWNER TO erp_user;

--
-- Name: PtoRequestStatus; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."PtoRequestStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE public."PtoRequestStatus" OWNER TO erp_user;

--
-- Name: ReimbursementMethod; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."ReimbursementMethod" AS ENUM (
    'TRANSFER',
    'PAYROLL',
    'CASH',
    'OTHER'
);


ALTER TYPE public."ReimbursementMethod" OWNER TO erp_user;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."Role" AS ENUM (
    'SUPER_ADMIN',
    'ORG_ADMIN',
    'HR_ADMIN',
    'MANAGER',
    'EMPLOYEE'
);


ALTER TYPE public."Role" OWNER TO erp_user;

--
-- Name: ScheduleType; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."ScheduleType" AS ENUM (
    'FLEXIBLE',
    'FIXED',
    'SHIFTS'
);


ALTER TYPE public."ScheduleType" OWNER TO erp_user;

--
-- Name: SensitiveDataType; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."SensitiveDataType" AS ENUM (
    'IBAN',
    'SALARY',
    'SSN',
    'MEDICAL_DATA',
    'OTHER'
);


ALTER TYPE public."SensitiveDataType" OWNER TO erp_user;

--
-- Name: SignatureRequestStatus; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."SignatureRequestStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED',
    'EXPIRED'
);


ALTER TYPE public."SignatureRequestStatus" OWNER TO erp_user;

--
-- Name: SignatureResult; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."SignatureResult" AS ENUM (
    'SUCCESS',
    'REJECTED',
    'EXPIRED',
    'ERROR'
);


ALTER TYPE public."SignatureResult" OWNER TO erp_user;

--
-- Name: SignerStatus; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."SignerStatus" AS ENUM (
    'PENDING',
    'SIGNED',
    'REJECTED'
);


ALTER TYPE public."SignerStatus" OWNER TO erp_user;

--
-- Name: TimeEntryType; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."TimeEntryType" AS ENUM (
    'CLOCK_IN',
    'CLOCK_OUT',
    'BREAK_START',
    'BREAK_END'
);


ALTER TYPE public."TimeEntryType" OWNER TO erp_user;

--
-- Name: WorkdayStatus; Type: TYPE; Schema: public; Owner: erp_user
--

CREATE TYPE public."WorkdayStatus" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'INCOMPLETE',
    'ABSENT'
);


ALTER TYPE public."WorkdayStatus" OWNER TO erp_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO erp_user;

--
-- Name: absence_types; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.absence_types (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    color text DEFAULT '#3b82f6'::text NOT NULL,
    "isPaid" boolean DEFAULT true NOT NULL,
    "requiresApproval" boolean DEFAULT true NOT NULL,
    "minDaysAdvance" integer DEFAULT 0 NOT NULL,
    "affectsBalance" boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL
);


ALTER TABLE public.absence_types OWNER TO erp_user;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.calendar_events (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    date timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "eventType" public."CalendarEventType" DEFAULT 'HOLIDAY'::public."CalendarEventType" NOT NULL,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "calendarId" text NOT NULL
);


ALTER TABLE public.calendar_events OWNER TO erp_user;

--
-- Name: calendars; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.calendars (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    year integer NOT NULL,
    "calendarType" public."CalendarType" DEFAULT 'NATIONAL_HOLIDAY'::public."CalendarType" NOT NULL,
    color text DEFAULT '#3b82f6'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "costCenterId" text
);


ALTER TABLE public.calendars OWNER TO erp_user;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.conversations (
    id text NOT NULL,
    "userAId" text NOT NULL,
    "userBId" text NOT NULL,
    "lastMessageAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isBlocked" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "unreadCountUserA" integer DEFAULT 0 NOT NULL,
    "unreadCountUserB" integer DEFAULT 0 NOT NULL,
    "hiddenByUserA" boolean DEFAULT false NOT NULL,
    "hiddenByUserB" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.conversations OWNER TO erp_user;

--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.cost_centers (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    address text,
    timezone text DEFAULT 'Europe/Madrid'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "allowedRadiusMeters" integer DEFAULT 100,
    latitude numeric(10,8),
    longitude numeric(11,8)
);


ALTER TABLE public.cost_centers OWNER TO erp_user;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.departments (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "costCenterId" text,
    "managerId" text
);


ALTER TABLE public.departments OWNER TO erp_user;

--
-- Name: dismissed_notifications; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.dismissed_notifications (
    id text NOT NULL,
    type text NOT NULL,
    "referenceId" text NOT NULL,
    "dismissedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "orgId" text NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public.dismissed_notifications OWNER TO erp_user;

--
-- Name: employee_documents; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.employee_documents (
    id text NOT NULL,
    kind public."DocumentKind" NOT NULL,
    "fileName" text NOT NULL,
    "storageUrl" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL,
    "uploadedById" text NOT NULL
);


ALTER TABLE public.employee_documents OWNER TO erp_user;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.employees (
    id text NOT NULL,
    "employeeNumber" text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "secondLastName" text,
    "nifNie" text NOT NULL,
    email text,
    phone text,
    "mobilePhone" text,
    address text,
    city text,
    "postalCode" text,
    province text,
    country text DEFAULT 'ES'::text NOT NULL,
    "birthDate" timestamp(3) without time zone,
    nationality text,
    iban text,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "emergencyRelationship" text,
    "photoUrl" text,
    notes text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "userId" text,
    "employmentStatus" public."EmploymentStatus" DEFAULT 'PENDING_CONTRACT'::public."EmploymentStatus" NOT NULL,
    "expenseApproverId" text,
    "preferredReimbursementMethod" public."ReimbursementMethod",
    "requiresEmployeeNumberReview" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.employees OWNER TO erp_user;

--
-- Name: employment_contracts; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.employment_contracts (
    id text NOT NULL,
    "contractType" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "weeklyHours" numeric(5,2) NOT NULL,
    "grossSalary" numeric(10,2),
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL,
    "positionId" text,
    "departmentId" text,
    "costCenterId" text,
    "managerId" text,
    "workingDaysPerWeek" numeric(3,1) DEFAULT 5,
    "hasIntensiveSchedule" boolean DEFAULT false,
    "intensiveEndDate" text,
    "intensiveStartDate" text,
    "intensiveWeeklyHours" numeric(5,2),
    "fridayHours" numeric(4,2),
    "hasCustomWeeklyPattern" boolean DEFAULT false,
    "mondayHours" numeric(4,2),
    "saturdayHours" numeric(4,2),
    "sundayHours" numeric(4,2),
    "thursdayHours" numeric(4,2),
    "tuesdayHours" numeric(4,2),
    "wednesdayHours" numeric(4,2),
    "intensiveFridayHours" numeric(4,2),
    "intensiveMondayHours" numeric(4,2),
    "intensiveSaturdayHours" numeric(4,2),
    "intensiveSundayHours" numeric(4,2),
    "intensiveThursdayHours" numeric(4,2),
    "intensiveTuesdayHours" numeric(4,2),
    "intensiveWednesdayHours" numeric(4,2),
    "fridayEndTime" text,
    "fridayStartTime" text,
    "hasFixedTimeSlots" boolean DEFAULT false,
    "mondayEndTime" text,
    "mondayStartTime" text,
    "saturdayEndTime" text,
    "saturdayStartTime" text,
    "scheduleType" public."ScheduleType" DEFAULT 'FLEXIBLE'::public."ScheduleType" NOT NULL,
    "sundayEndTime" text,
    "sundayStartTime" text,
    "thursdayEndTime" text,
    "thursdayStartTime" text,
    "tuesdayEndTime" text,
    "tuesdayStartTime" text,
    "wednesdayEndTime" text,
    "wednesdayStartTime" text,
    "workFriday" boolean DEFAULT false,
    "workMonday" boolean DEFAULT false,
    "workSaturday" boolean DEFAULT false,
    "workSunday" boolean DEFAULT false,
    "workThursday" boolean DEFAULT false,
    "workTuesday" boolean DEFAULT false,
    "workWednesday" boolean DEFAULT false,
    "fridayBreakEndTime" text,
    "fridayBreakStartTime" text,
    "intensiveFridayBreakEndTime" text,
    "intensiveFridayBreakStartTime" text,
    "intensiveFridayEndTime" text,
    "intensiveFridayStartTime" text,
    "intensiveMondayBreakEndTime" text,
    "intensiveMondayBreakStartTime" text,
    "intensiveMondayEndTime" text,
    "intensiveMondayStartTime" text,
    "intensiveSaturdayBreakEndTime" text,
    "intensiveSaturdayBreakStartTime" text,
    "intensiveSaturdayEndTime" text,
    "intensiveSaturdayStartTime" text,
    "intensiveSundayBreakEndTime" text,
    "intensiveSundayBreakStartTime" text,
    "intensiveSundayEndTime" text,
    "intensiveSundayStartTime" text,
    "intensiveThursdayBreakEndTime" text,
    "intensiveThursdayBreakStartTime" text,
    "intensiveThursdayEndTime" text,
    "intensiveThursdayStartTime" text,
    "intensiveTuesdayBreakEndTime" text,
    "intensiveTuesdayBreakStartTime" text,
    "intensiveTuesdayEndTime" text,
    "intensiveTuesdayStartTime" text,
    "intensiveWednesdayBreakEndTime" text,
    "intensiveWednesdayBreakStartTime" text,
    "intensiveWednesdayEndTime" text,
    "intensiveWednesdayStartTime" text,
    "mondayBreakEndTime" text,
    "mondayBreakStartTime" text,
    "saturdayBreakEndTime" text,
    "saturdayBreakStartTime" text,
    "sundayBreakEndTime" text,
    "sundayBreakStartTime" text,
    "thursdayBreakEndTime" text,
    "thursdayBreakStartTime" text,
    "tuesdayBreakEndTime" text,
    "tuesdayBreakStartTime" text,
    "wednesdayBreakEndTime" text,
    "wednesdayBreakStartTime" text
);


ALTER TABLE public.employment_contracts OWNER TO erp_user;

--
-- Name: expense_approvals; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.expense_approvals (
    id text NOT NULL,
    decision public."ApprovalDecision" DEFAULT 'PENDING'::public."ApprovalDecision" NOT NULL,
    comment text,
    "decidedAt" timestamp(3) without time zone,
    level integer DEFAULT 1 NOT NULL,
    "approverId" text NOT NULL,
    "expenseId" text NOT NULL
);


ALTER TABLE public.expense_approvals OWNER TO erp_user;

--
-- Name: expense_approvers; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.expense_approvers (
    id text NOT NULL,
    "userId" text NOT NULL,
    "orgId" text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.expense_approvers OWNER TO erp_user;

--
-- Name: expense_attachments; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.expense_attachments (
    id text NOT NULL,
    url text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text,
    "fileSize" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expenseId" text NOT NULL
);


ALTER TABLE public.expense_attachments OWNER TO erp_user;

--
-- Name: expense_policies; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.expense_policies (
    id text NOT NULL,
    "mileageRateEurPerKm" numeric(5,3) DEFAULT 0.26 NOT NULL,
    "mealDailyLimit" numeric(10,2),
    "lodgingDailyLimit" numeric(10,2),
    "categoryRequirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "attachmentRequired" boolean DEFAULT true NOT NULL,
    "costCenterRequired" boolean DEFAULT false NOT NULL,
    "vatAllowed" boolean DEFAULT true NOT NULL,
    "approvalLevels" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL
);


ALTER TABLE public.expense_policies OWNER TO erp_user;

--
-- Name: expense_reports; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.expense_reports (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "periodFrom" timestamp(3) without time zone NOT NULL,
    "periodTo" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "ownerId" text NOT NULL
);


ALTER TABLE public.expense_reports OWNER TO erp_user;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.expenses (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "vatPercent" numeric(5,2),
    "totalAmount" numeric(10,2) NOT NULL,
    category public."ExpenseCategory" NOT NULL,
    "mileageKm" numeric(10,2),
    "mileageRate" numeric(5,3),
    "costCenterId" text,
    notes text,
    "merchantName" text,
    "merchantVat" text,
    "ocrRawData" jsonb,
    status public."ExpenseStatus" DEFAULT 'DRAFT'::public."ExpenseStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL,
    "reportId" text,
    "reimbursedAt" timestamp(3) without time zone,
    "reimbursedBy" text,
    "reimbursementMethod" public."ReimbursementMethod",
    "reimbursementReference" text
);


ALTER TABLE public.expenses OWNER TO erp_user;

--
-- Name: geolocation_consents; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.geolocation_consents (
    id text NOT NULL,
    "consentGivenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "consentVersion" text DEFAULT '1.0'::text NOT NULL,
    "ipAddress" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public.geolocation_consents OWNER TO erp_user;

--
-- Name: manual_time_entry_requests; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.manual_time_entry_requests (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "clockInTime" timestamp(3) without time zone NOT NULL,
    "clockOutTime" timestamp(3) without time zone NOT NULL,
    reason text NOT NULL,
    status public."ManualTimeEntryStatus" DEFAULT 'PENDING'::public."ManualTimeEntryStatus" NOT NULL,
    "approverId" text,
    "approvedAt" timestamp(3) without time zone,
    "approverComments" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdClockInId" text,
    "createdClockOutId" text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL,
    "replacedEntryIds" text[] DEFAULT ARRAY[]::text[],
    "replacesIncompleteEntry" boolean DEFAULT false NOT NULL,
    "warningMessage" text
);


ALTER TABLE public.manual_time_entry_requests OWNER TO erp_user;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.messages (
    id text NOT NULL,
    body text NOT NULL,
    status public."MessageStatus" DEFAULT 'SENT'::public."MessageStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "editedAt" timestamp(3) without time zone,
    "deletedAt" timestamp(3) without time zone,
    "orgId" text NOT NULL,
    "conversationId" text NOT NULL,
    "senderId" text NOT NULL
);


ALTER TABLE public.messages OWNER TO erp_user;

--
-- Name: organization_pto_config; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.organization_pto_config (
    id text NOT NULL,
    "orgId" text NOT NULL,
    "maternityLeaveWeeks" integer DEFAULT 17 NOT NULL,
    "paternityLeaveWeeks" integer DEFAULT 17 NOT NULL,
    "seniorityRules" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "allowNegativeBalance" boolean DEFAULT false NOT NULL,
    "maxAdvanceRequestMonths" integer DEFAULT 12 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.organization_pto_config OWNER TO erp_user;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.organizations (
    id text NOT NULL,
    name text NOT NULL,
    vat text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "annualPtoDays" integer DEFAULT 23 NOT NULL,
    "ptoAccrualStartDate" text DEFAULT 'CONTRACT_START'::text NOT NULL,
    "ptoCalculationMethod" text DEFAULT 'PROPORTIONAL'::text NOT NULL,
    "hierarchyType" public."HierarchyType" DEFAULT 'DEPARTMENTAL'::public."HierarchyType" NOT NULL,
    "allowedEmailDomains" text[] DEFAULT ARRAY[]::text[],
    "employeeNumberCounter" integer DEFAULT 0 NOT NULL,
    "employeeNumberPrefix" text,
    "geolocationEnabled" boolean DEFAULT false NOT NULL,
    "geolocationMaxRadius" integer DEFAULT 200 NOT NULL,
    "geolocationMinAccuracy" integer DEFAULT 100 NOT NULL,
    "geolocationRequired" boolean DEFAULT false NOT NULL,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    "chatEnabled" boolean DEFAULT false NOT NULL,
    "shiftsEnabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.organizations OWNER TO erp_user;

--
-- Name: policy_snapshots; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.policy_snapshots (
    id text NOT NULL,
    "mileageRateEurPerKm" numeric(5,3),
    "mealDailyLimit" numeric(10,2),
    "fuelRequiresReceipt" boolean DEFAULT true NOT NULL,
    "vatAllowed" boolean DEFAULT true NOT NULL,
    "costCenterRequired" boolean DEFAULT false NOT NULL,
    "expenseId" text NOT NULL
);


ALTER TABLE public.policy_snapshots OWNER TO erp_user;

--
-- Name: position_levels; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.position_levels (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    "order" integer DEFAULT 0 NOT NULL,
    description text,
    "minSalary" numeric(10,2),
    "maxSalary" numeric(10,2),
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL
);


ALTER TABLE public.position_levels OWNER TO erp_user;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.positions (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "levelId" text
);


ALTER TABLE public.positions OWNER TO erp_user;

--
-- Name: pto_balance_adjustments; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.pto_balance_adjustments (
    id text NOT NULL,
    "adjustmentType" public."PtoAdjustmentType" NOT NULL,
    "daysAdjusted" numeric(5,2) NOT NULL,
    reason text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text NOT NULL,
    "orgId" text NOT NULL,
    "ptoBalanceId" text NOT NULL
);


ALTER TABLE public.pto_balance_adjustments OWNER TO erp_user;

--
-- Name: pto_balances; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.pto_balances (
    id text NOT NULL,
    year integer NOT NULL,
    "annualAllowance" numeric(5,2) NOT NULL,
    "daysUsed" numeric(5,2) DEFAULT 0 NOT NULL,
    "daysPending" numeric(5,2) DEFAULT 0 NOT NULL,
    "daysAvailable" numeric(5,2) NOT NULL,
    "calculationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "contractStartDate" timestamp(3) without time zone NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL
);


ALTER TABLE public.pto_balances OWNER TO erp_user;

--
-- Name: pto_notifications; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.pto_notifications (
    id text NOT NULL,
    type public."PtoNotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "ptoRequestId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "orgId" text NOT NULL,
    "userId" text NOT NULL,
    "manualTimeEntryRequestId" text,
    "expenseId" text
);


ALTER TABLE public.pto_notifications OWNER TO erp_user;

--
-- Name: pto_requests; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.pto_requests (
    id text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "workingDays" numeric(5,2) NOT NULL,
    status public."PtoRequestStatus" DEFAULT 'PENDING'::public."PtoRequestStatus" NOT NULL,
    reason text,
    "attachmentUrl" text,
    "approverId" text,
    "approvedAt" timestamp(3) without time zone,
    "approverComments" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL,
    "absenceTypeId" text NOT NULL
);


ALTER TABLE public.pto_requests OWNER TO erp_user;

--
-- Name: recurring_pto_adjustments; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.recurring_pto_adjustments (
    id text NOT NULL,
    "extraDays" numeric(5,2) NOT NULL,
    "adjustmentType" public."PtoAdjustmentType" NOT NULL,
    reason text NOT NULL,
    notes text,
    active boolean DEFAULT true NOT NULL,
    "startYear" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" text NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL
);


ALTER TABLE public.recurring_pto_adjustments OWNER TO erp_user;

--
-- Name: sensitive_data_access; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.sensitive_data_access (
    id text NOT NULL,
    "dataType" public."SensitiveDataType" NOT NULL,
    "resourceId" text NOT NULL,
    "resourceType" text NOT NULL,
    "userId" text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "accessedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "orgId" text NOT NULL
);


ALTER TABLE public.sensitive_data_access OWNER TO erp_user;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO erp_user;

--
-- Name: signable_documents; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.signable_documents (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    "originalFileUrl" text NOT NULL,
    "originalHash" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text DEFAULT 'application/pdf'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "createdById" text NOT NULL
);


ALTER TABLE public.signable_documents OWNER TO erp_user;

--
-- Name: signature_evidences; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.signature_evidences (
    id text NOT NULL,
    timeline jsonb NOT NULL,
    "preSignHash" text NOT NULL,
    "postSignHash" text,
    "signerMetadata" jsonb NOT NULL,
    policy text NOT NULL,
    result public."SignatureResult" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requestId" text NOT NULL,
    "signerId" text NOT NULL
);


ALTER TABLE public.signature_evidences OWNER TO erp_user;

--
-- Name: signature_requests; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.signature_requests (
    id text NOT NULL,
    status public."SignatureRequestStatus" DEFAULT 'PENDING'::public."SignatureRequestStatus" NOT NULL,
    policy text DEFAULT 'SES'::text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "orgId" text NOT NULL,
    "documentId" text NOT NULL
);


ALTER TABLE public.signature_requests OWNER TO erp_user;

--
-- Name: signers; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.signers (
    id text NOT NULL,
    "order" integer DEFAULT 1 NOT NULL,
    status public."SignerStatus" DEFAULT 'PENDING'::public."SignerStatus" NOT NULL,
    "signToken" text NOT NULL,
    "employeeId" text NOT NULL,
    "signedAt" timestamp(3) without time zone,
    "signedFileUrl" text,
    "signedHash" text,
    "consentGivenAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "requestId" text NOT NULL
);


ALTER TABLE public.signers OWNER TO erp_user;

--
-- Name: temporary_passwords; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.temporary_passwords (
    id text NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    reason text,
    notes text,
    "orgId" text NOT NULL,
    "userId" text NOT NULL,
    "createdById" text NOT NULL
);


ALTER TABLE public.temporary_passwords OWNER TO erp_user;

--
-- Name: time_clock_terminals; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.time_clock_terminals (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    location text,
    "ipAddress" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "costCenterId" text
);


ALTER TABLE public.time_clock_terminals OWNER TO erp_user;

--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.time_entries (
    id text NOT NULL,
    "entryType" public."TimeEntryType" NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    location text,
    notes text,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL,
    "terminalId" text,
    "workdayId" text,
    "isManual" boolean DEFAULT false NOT NULL,
    "manualRequestId" text,
    accuracy numeric(10,2),
    "distanceFromCenter" numeric(10,2),
    "isWithinAllowedArea" boolean,
    latitude numeric(10,8),
    longitude numeric(11,8),
    "nearestCostCenterId" text,
    "requiresReview" boolean DEFAULT false NOT NULL,
    "cancellationNotes" text,
    "cancellationReason" public."CancellationReason",
    "cancelledAt" timestamp(3) without time zone,
    "isCancelled" boolean DEFAULT false NOT NULL,
    "originalDurationHours" numeric(6,2)
);


ALTER TABLE public.time_entries OWNER TO erp_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."Role" DEFAULT 'EMPLOYEE'::public."Role" NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    image text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "mustChangePassword" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO erp_user;

--
-- Name: workday_summaries; Type: TABLE; Schema: public; Owner: erp_user
--

CREATE TABLE public.workday_summaries (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "clockIn" timestamp(3) without time zone,
    "clockOut" timestamp(3) without time zone,
    "totalWorkedMinutes" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalBreakMinutes" numeric(10,2) DEFAULT 0 NOT NULL,
    status public."WorkdayStatus" DEFAULT 'IN_PROGRESS'::public."WorkdayStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "orgId" text NOT NULL,
    "employeeId" text NOT NULL,
    "excessiveTimeNotified" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.workday_summaries OWNER TO erp_user;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3d5a2fcc-6feb-48b7-a954-ec88ce7f9734	a0da06d745c2b3898aa2f23232c1d2f81db88c565c0a6c3fd368069782e51267	2025-10-11 14:31:15.372361+00	20250917104450_init	\N	\N	2025-10-11 14:31:15.345706+00	1
b98abb32-1990-4dbf-b7af-4112af4344a0	0ea412572f04f3617cf49942582993789d89930991f409119cd6800c602eec55	2025-10-11 14:31:15.373829+00	20250918091912_add_must_change_password_to_user	\N	\N	2025-10-11 14:31:15.372727+00	1
43a04612-aa2f-4bb2-95b8-f901f8967081	cb0535d86b0ad9c690e03b36483b553a6ba5ec4caef11327ded31dffe546e738	2025-10-11 14:31:15.375456+00	20250918104055_add_employment_status_to_employee	\N	\N	2025-10-11 14:31:15.374135+00	1
313bf0a9-078d-498e-b772-8b41b686a5bf	3c2985d4f107695d83f02a33bda111ca10981b46adf1b3478b44d62f0da42752	2025-10-11 14:31:15.380528+00	20250918140523_add_temporary_passwords	\N	\N	2025-10-11 14:31:15.375803+00	1
5aeb91bb-b68c-45cf-a71d-a7d1c3ac63fd	5a21d56c5b30ced061a473eb90ed35412e0c5703831c37c593c36dacab15efa0	2025-10-11 14:31:15.383185+00	20250919110151_add_department_manager	\N	\N	2025-10-11 14:31:15.380843+00	1
930120e6-4a71-41a6-b4be-52613078d2b1	84b3a9d6790576b02d785556a8757518	2025-10-14 15:25:44.295102+00	20251014172522_add_variable_schedules	\N	\N	2025-10-14 15:25:44.295102+00	1
48b124c0-a800-425f-af8b-8144f84098a8	8e9a007e97cf2ca3f67406d8c0f416332acc061ca027763efe7657ac58d2b855	2025-10-30 15:33:38.568281+00	20251030163300_add_hierarchy_manual_time_signatures		\N	2025-10-30 15:33:38.568281+00	0
dfca0cdc-46da-49cf-94ef-1be5555e3e0d	migration-checksum	2025-10-30 17:20:44.793337+00	20251030180000_add_organization_identity_fields	\N	\N	2025-10-30 17:20:44.793337+00	1
b99651d6-bc53-4cb9-91c0-e5673f71771d	5010caabfafc89efb5e12edd0b7d96a8a673a05ae63d0a3324ced6035276ad09	2025-11-04 21:13:39.26265+00	20251104221226_add_expense_management_and_related_systems		\N	2025-11-04 21:13:39.26265+00	0
8dae6ee2-2f00-4b44-95f6-2f7857a4274b	75d963aee714ada98847df9a955bd8d9258d869bfa548a5534fe3c602363b1bd	2025-11-04 21:15:07.425395+00	20251104221440_add_geolocation_system		\N	2025-11-04 21:15:07.425395+00	0
\.


--
-- Data for Name: absence_types; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.absence_types (id, name, code, description, color, "isPaid", "requiresApproval", "minDaysAdvance", "affectsBalance", active, "createdAt", "updatedAt", "orgId") FROM stdin;
cmhktubdt0001sfrfjcy7h5lr	Vacaciones	VACATION	Días de vacaciones anuales retribuidas	#3b82f6	t	t	0	t	t	2025-11-04 17:12:36.618	2025-11-04 17:12:36.618	cmhkdipy5000isfdxch3dbn7p
cmhktubfr0003sfrf5mmqw2fg	Asuntos personales	PERSONAL	Días por asuntos personales	#8b5cf6	t	t	0	f	t	2025-11-04 17:12:36.709	2025-11-04 17:12:36.709	cmhkdipy5000isfdxch3dbn7p
cmhktubgn0005sfrf13t6hy8p	Baja médica	SICK_LEAVE	Ausencia por enfermedad o incapacidad temporal	#ef4444	t	f	0	f	t	2025-11-04 17:12:36.744	2025-11-04 17:12:36.744	cmhkdipy5000isfdxch3dbn7p
cmhktubhl0007sfrfau2k0w7w	Maternidad/Paternidad	MATERNITY_PATERNITY	Permiso por nacimiento o adopción	#f59e0b	t	t	0	f	t	2025-11-04 17:12:36.777	2025-11-04 17:12:36.777	cmhkdipy5000isfdxch3dbn7p
cmhktubi60009sfrfy7fdeeqj	Permiso no retribuido	UNPAID_LEAVE	Ausencia sin sueldo	#6b7280	f	t	0	f	t	2025-11-04 17:12:36.798	2025-11-04 17:12:36.798	cmhkdipy5000isfdxch3dbn7p
cmhktubik000bsfrftzt1up8o	Formación	TRAINING	Ausencia por formación o cursos	#10b981	t	t	0	f	t	2025-11-04 17:12:36.812	2025-11-04 17:12:36.812	cmhkdipy5000isfdxch3dbn7p
cmhktubix000dsfrfszd32qdm	Vacaciones	VACATION	Días de vacaciones anuales retribuidas	#3b82f6	t	t	0	t	t	2025-11-04 17:12:36.825	2025-11-04 17:12:36.825	cmhi8mawd0000sf8xishgn0j2
cmhktubjh000fsfrfp6l5d1hv	Asuntos personales	PERSONAL	Días por asuntos personales	#8b5cf6	t	t	0	f	t	2025-11-04 17:12:36.845	2025-11-04 17:12:36.845	cmhi8mawd0000sf8xishgn0j2
cmhktubkg000hsfrfii43p5sl	Baja médica	SICK_LEAVE	Ausencia por enfermedad o incapacidad temporal	#ef4444	t	f	0	f	t	2025-11-04 17:12:36.88	2025-11-04 17:12:36.88	cmhi8mawd0000sf8xishgn0j2
cmhktubl8000jsfrfm5ihyjob	Maternidad/Paternidad	MATERNITY_PATERNITY	Permiso por nacimiento o adopción	#f59e0b	t	t	0	f	t	2025-11-04 17:12:36.909	2025-11-04 17:12:36.909	cmhi8mawd0000sf8xishgn0j2
cmhktublp000lsfrfwi5czdv6	Permiso no retribuido	UNPAID_LEAVE	Ausencia sin sueldo	#6b7280	f	t	0	f	t	2025-11-04 17:12:36.926	2025-11-04 17:12:36.926	cmhi8mawd0000sf8xishgn0j2
cmhktubm7000nsfrfhp0oo2nb	Formación	TRAINING	Ausencia por formación o cursos	#10b981	t	t	0	f	t	2025-11-04 17:12:36.944	2025-11-04 17:12:36.944	cmhi8mawd0000sf8xishgn0j2
cmhxad0030001sfxt2dta040g	Vacaciones	VAC	Vacaciones anuales retribuidas	#10b981	t	t	15	t	t	2025-11-13 10:28:16.322	2025-11-13 10:28:16.322	cmhxacerz0014sfcr0oks8l2b
cmhxad00d0003sfxtgj8w9md4	Baja por Enfermedad	SICK	Baja médica por enfermedad común	#ef4444	t	f	0	f	t	2025-11-13 10:28:16.333	2025-11-13 10:28:16.333	cmhxacerz0014sfcr0oks8l2b
cmhxad00g0005sfxth5w9t8ap	Permiso Personal	PERS	Permiso por asuntos personales	#f59e0b	t	t	3	t	t	2025-11-13 10:28:16.336	2025-11-13 10:28:16.336	cmhxacerz0014sfcr0oks8l2b
cmhxad00j0007sfxtsqnwlsjv	Permiso No Retribuido	UNPAID	Permiso sin sueldo	#6b7280	f	t	7	f	t	2025-11-13 10:28:16.339	2025-11-13 10:28:16.339	cmhxacerz0014sfcr0oks8l2b
cmhxad00l0009sfxt8r5smzid	Teletrabajo	REMOTE	Trabajo desde casa	#3b82f6	t	t	1	f	t	2025-11-13 10:28:16.342	2025-11-13 10:28:16.342	cmhxacerz0014sfcr0oks8l2b
cmhxad00n000bsfxtesmxgaqp	Formación	TRAIN	Asistencia a formación o eventos	#8b5cf6	t	t	7	f	t	2025-11-13 10:28:16.344	2025-11-13 10:28:16.344	cmhxacerz0014sfcr0oks8l2b
cmhxad00p000dsfxtgt1uji8r	Maternidad/Paternidad	MAT	Baja por maternidad o paternidad	#ec4899	t	f	0	f	t	2025-11-13 10:28:16.346	2025-11-13 10:28:16.346	cmhxacerz0014sfcr0oks8l2b
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.calendar_events (id, name, description, date, "endDate", "eventType", "isRecurring", "createdAt", "updatedAt", "calendarId") FROM stdin;
cmhkq480g002msfrk7yu406an	Año Nuevo	New Year's Day (Nacional)	2025-01-01 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002nsfrkzsd03zpc	Día de Reyes / Epifanía del Señor	Epiphany (Nacional)	2025-01-06 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002osfrk576suf7j	Día de Andalucía	Day of Andalucía (Regional)	2025-02-28 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002psfrkibdbmxyd	Dia de les Illes Balears	Day of the Balearic Islands (Regional)	2025-03-01 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002qsfrk5zw9q02n	Jueves Santo	Maundy Thursday (Regional)	2025-04-17 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002rsfrkodpaf6sj	Viernes Santo	Good Friday (Nacional)	2025-04-18 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002ssfrkqmlsenve	Lunes de Pascua	Easter Monday (Regional)	2025-04-21 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002tsfrke8nytv86	Día de Castilla y León	Castile and León Day (Regional)	2025-04-23 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002usfrkuisfrpi6	San Jorge (Día de Aragón)	Day of Aragón (Regional)	2025-04-23 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002vsfrkwa9xyi0n	Fiesta del trabajo	Labour Day (Nacional)	2025-05-01 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002wsfrkhln0bfcs	Fiesta de la Comunidad de Madrid	Day of Madrid (Regional)	2025-05-02 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002xsfrkj3m6j1k5	Día das Letras Galegas	Galician Literature Day (Regional)	2025-05-17 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002ysfrkcgn9b96y	Día de Canarias	Day of the Canary Islands (Regional)	2025-05-30 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g002zsfrkbbt6rwgu	Día de la Región Castilla-La Mancha	Day of Castilla-La Mancha (Regional)	2025-05-31 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0030sfrk21chxy5r	Día de La Rioja	Day of La Rioja (Regional)	2025-06-09 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0031sfrk0i33djwz	Día de la Región de Murcia	Day of Murcia (Regional)	2025-06-09 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0032sfrkywhrwygm	Corpus Christi	Corpus Christi (Regional)	2025-06-19 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0033sfrk84zojqcr	Sant Joan	St. John's Day (Regional)	2025-06-24 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0034sfrkj80laiky	Santiago Apóstol	Santiago Apóstol (Regional)	2025-07-25 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0035sfrkoftw5f1y	Día de las Instituciones de Cantabria	Day of the Cantabrian Institutions (Regional)	2025-07-28 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0036sfrk79bqzma7	Asunción	Assumption (Nacional)	2025-08-15 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0037sfrk4cbe6x4w	Día de Asturias	Day of Asturias (Regional)	2025-09-08 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0038sfrkfg7pifa3	Día de Extremadura	Day of Extremadura (Regional)	2025-09-08 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g0039sfrklzrjm4qr	Diada Nacional de Catalunya	National Day of Catalonia (Regional)	2025-09-11 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g003asfrkmi6zo4v3	Festividad de la Bien Aparecida	Feast of Our Lady of Bien Aparecida (Regional)	2025-09-15 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g003bsfrkxg2rjvsi	Dia de la Comunitat Valenciana	Day of the Valencian Community (Regional)	2025-10-09 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g003csfrk6lezrgqy	Fiesta Nacional de España	National Day of Spain (Nacional)	2025-10-12 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g003dsfrk956qj6dw	Día de todos los Santos	All Saints Day (Nacional)	2025-11-01 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g003esfrk8vochakj	Día de la Constitución	Constitution Day (Nacional)	2025-12-06 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g003fsfrkxy2ikg88	Inmaculada Concepción	Immaculate Conception (Nacional)	2025-12-08 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g003gsfrk4rgqxjj5	Navidad	Christmas Day (Nacional)	2025-12-25 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
cmhkq480g003hsfrks00lsaks	Feast of Saint Stephen	St. Stephen's Day (Regional)	2025-12-26 00:00:00	\N	HOLIDAY	f	2025-11-04 15:28:20.368	2025-11-04 15:28:20.368	cmhkq3w2s002lsfrkzmqmfqq9
\.


--
-- Data for Name: calendars; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.calendars (id, name, description, year, "calendarType", color, active, "createdAt", "updatedAt", "orgId", "costCenterId") FROM stdin;
cmhkq3w2s002lsfrkzmqmfqq9	Festivos nacionales.	Festivos.	2025	NATIONAL_HOLIDAY	#ef4444	t	2025-11-04 15:28:04.9	2025-11-04 15:28:04.9	cmhi8mawd0000sf8xishgn0j2	\N
cmi0vix5z0031sfjw7a01m1zy	Festivos Madrid	Calendario de Madrid	2025	LOCAL_HOLIDAY	#22c55e	t	2025-11-15 22:44:03.046	2025-11-15 22:44:03.046	cmhi8mawd0000sf8xishgn0j2	cmhi8mayg000isf8x65z5brpv
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.conversations (id, "userAId", "userBId", "lastMessageAt", "isBlocked", "createdAt", "updatedAt", "orgId", "unreadCountUserA", "unreadCountUserB", "hiddenByUserA", "hiddenByUserB") FROM stdin;
cmhna602q000tsflzc2b75gpw	cmhi8mayb0005sf8xq50h79x6	cmhkdlfqz000msfdx04z2mfi7	2025-11-06 23:03:19.353	f	2025-11-06 10:25:08.067	2025-11-11 13:49:56.392	cmhi8mawd0000sf8xishgn0j2	0	0	f	t
cmhooi04z000bsfl9c14lj5um	cmhi8mayb0005sf8xq50h79x6	cmhi8mayd000asf8x6u7v665y	2025-11-07 09:54:08.819	f	2025-11-07 09:54:08.819	2025-11-11 22:14:41.594	cmhi8mawd0000sf8xishgn0j2	0	0	f	t
cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y	cmhkdlfqz000msfdx04z2mfi7	2025-11-16 22:26:05.527	f	2025-11-06 08:27:51.236	2025-11-16 22:26:05.534	cmhi8mawd0000sf8xishgn0j2	0	1	f	f
\.


--
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.cost_centers (id, name, code, address, timezone, active, "createdAt", "updatedAt", "orgId", "allowedRadiusMeters", latitude, longitude) FROM stdin;
cmhi8mayg000isf8x65z5brpv	Oficina Central Madrid	MAD001	Calle Gran Vía 123, Madrid	Europe/Madrid	t	2025-11-02 21:42:58.553	2025-11-02 21:42:58.553	cmhi8mawd0000sf8xishgn0j2	100	\N	\N
cmhxaeh5q003lsfqk4ydqnmbu	Oficina Principal	MAIN	Dirección pendiente de configurar	Europe/Madrid	t	2025-11-13 10:29:25.215	2025-11-13 10:29:25.215	cmhxacerz0014sfcr0oks8l2b	100	\N	\N
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.departments (id, name, description, active, "createdAt", "updatedAt", "orgId", "costCenterId", "managerId") FROM stdin;
cmhxaeh2i000hsfqke27q99le	Dirección General	Dirección y gestión estratégica de la empresa	t	2025-11-13 10:29:25.098	2025-11-13 10:29:25.098	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh2y000psfqktv47k8u8	Recursos Humanos	Gestión de personas y talento	t	2025-11-13 10:29:25.114	2025-11-13 10:29:25.114	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh36000zsfqks93q03j5	Administración y Finanzas	Gestión económica y financiera	t	2025-11-13 10:29:25.123	2025-11-13 10:29:25.123	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh3g001bsfqkhc06p6cv	Comercial y Ventas	Desarrollo de negocio y ventas	t	2025-11-13 10:29:25.132	2025-11-13 10:29:25.132	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh3r001nsfqkusm0h0de	Marketing y Comunicación	Estrategia de marketing y comunicación	t	2025-11-13 10:29:25.144	2025-11-13 10:29:25.144	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh41001zsfqkpsyzedep	Tecnología (IT)	Sistemas de información y tecnología	t	2025-11-13 10:29:25.153	2025-11-13 10:29:25.153	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh4l002hsfqkgs38rw6h	Producción	Operaciones y producción	t	2025-11-13 10:29:25.173	2025-11-13 10:29:25.173	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh4x002tsfqk6qy28rgf	Calidad	Control de calidad y procesos	t	2025-11-13 10:29:25.185	2025-11-13 10:29:25.185	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh550031sfqkkm7yv9xp	Logística y Almacén	Gestión de logística y almacenamiento	t	2025-11-13 10:29:25.193	2025-11-13 10:29:25.193	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhxaeh5d003bsfqkk1du7rew	Atención al Cliente	Servicio y atención al cliente	t	2025-11-13 10:29:25.201	2025-11-13 10:29:25.201	cmhxacerz0014sfcr0oks8l2b	\N	\N
cmhi8mayh000nsf8xst88lhcb	Recursos Humanos	Gestión del talento humano	t	2025-11-02 21:42:58.554	2025-11-02 21:42:58.554	cmhi8mawd0000sf8xishgn0j2	cmhi8mayg000isf8x65z5brpv	\N
cmhi8mayh000osf8xmto5wxe6	Finanzas	Administración financiera	t	2025-11-02 21:42:58.554	2025-11-02 21:42:58.554	cmhi8mawd0000sf8xishgn0j2	cmhi8mayg000isf8x65z5brpv	\N
cmhi8mayh000psf8xt6aoa74t	Operaciones	Operaciones diarias	t	2025-11-02 21:42:58.554	2025-11-02 21:42:58.554	cmhi8mawd0000sf8xishgn0j2	cmhi8mayg000isf8x65z5brpv	\N
cmhi8mayh000qsf8xhks4gspg	Tecnología	Desarrollo y sistemas	t	2025-11-02 21:42:58.554	2025-11-02 21:42:58.554	cmhi8mawd0000sf8xishgn0j2	cmhi8mayg000isf8x65z5brpv	\N
\.


--
-- Data for Name: dismissed_notifications; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.dismissed_notifications (id, type, "referenceId", "dismissedAt", "orgId", "userId") FROM stdin;
cmhv2jlxm0087sfapj6t8dmu5	INCOMPLETE_ENTRY	cmhv2jhqa0003sfi670fcg60y	2025-11-11 21:13:55.403	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
cmhv61m1e00crsfapumy2mluu	INCOMPLETE_ENTRY	cmhv5vdx700cfsfapl5i2owsp	2025-11-11 22:51:54.194	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7
cmhv65e1a00d1sfap8to7nmgb	INCOMPLETE_ENTRY	cmhv64fil0001sfgbnfot87b4	2025-11-11 22:54:50.447	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
cmhv69hck00d9sfapwjolht3w	INCOMPLETE_ENTRY	cmhv6924e0001sfzxttw9pamw	2025-11-11 22:58:01.364	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
cmhymylwy001vsfpqcgcu74n2	INCOMPLETE_ENTRY	cmhxyroep000vsfhvisy63rdj	2025-11-14 09:08:46.066	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
\.


--
-- Data for Name: employee_documents; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.employee_documents (id, kind, "fileName", "storageUrl", "fileSize", "mimeType", version, description, "createdAt", "updatedAt", "orgId", "employeeId", "uploadedById") FROM stdin;
cmhkpvbs2001xsfrk2vsqk672	OTHER	logoLookah.png	org-cmhi8mawd0000sf8xishgn0j2/employees/cmhkdlfp3000ksfdxxb3wbfwi/OTHER/1762269684991-logolookah.png	63385	image/png	1	Logo lookah	2025-11-04 15:21:25.346	2025-11-04 15:21:25.346	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	cmhkdlfqz000msfdx04z2mfi7
cmhkpw6l7001zsfrk0t3hkjhz	CERTIFICATE	ticket.jpg	org-cmhi8mawd0000sf8xishgn0j2/employees/cmhkdlfp3000ksfdxxb3wbfwi/CERTIFICATE/1762269724995-ticket.jpg	75172	image/jpeg	1	Certificado	2025-11-04 15:22:05.275	2025-11-04 15:22:05.275	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	cmhkdlfqz000msfdx04z2mfi7
cmi294gqf000xsf84c00f8p1b	OTHER	Azul.png	org-cmhi8mawd0000sf8xishgn0j2/employees/cmhi8mayl0014sf8xdt2xyr0t/OTHER/1763329949036-azul.png	110427	image/png	1	timenow\r\n	2025-11-16 21:52:29.367	2025-11-16 21:52:29.367	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	cmhi8mayd000asf8x6u7v665y
cmi30kd6m000bsfea6ka024bk	PAYSLIP	262628.jpg	org-cmhi8mawd0000sf8xishgn0j2/employees/cmhkdlfp3000ksfdxxb3wbfwi/PAYSLIP/1763376040592-262628.jpg	33070	image/jpeg	1	Nomina enero	2025-11-17 10:40:40.893	2025-11-17 10:40:40.893	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	cmhi8mayd000asf8x6u7v665y
cmi321ddu000fsfeatdpg5415	PAYSLIP	Nómina enero.pdf	org-cmhi8mawd0000sf8xishgn0j2/employees/cmhkdlfp3000ksfdxxb3wbfwi/PAYSLIP/1763378513517-no_mina_enero.pdf	395102	application/pdf	1	Nomina enero	2025-11-17 11:21:53.922	2025-11-17 11:21:53.922	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	cmhi8mayd000asf8x6u7v665y
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.employees (id, "employeeNumber", "firstName", "lastName", "secondLastName", "nifNie", email, phone, "mobilePhone", address, city, "postalCode", province, country, "birthDate", nationality, iban, "emergencyContactName", "emergencyContactPhone", "emergencyRelationship", "photoUrl", notes, active, "createdAt", "updatedAt", "orgId", "userId", "employmentStatus", "expenseApproverId", "preferredReimbursementMethod", "requiresEmployeeNumberReview") FROM stdin;
cmhzgxnp80003sfcnm8wz8080	EMP00010	Jose Francisco	Parra Fernandez	Parra Fernandez	79936392F	deejaymacro5@hotmail.es	+34679332640						ES	\N		\N				\N		t	2025-11-14 23:07:50.204	2025-11-14 23:07:51.113	cmhi8mawd0000sf8xishgn0j2	cmhzgxnrx0005sfcnil5mtonv	ACTIVE	\N	\N	f
cmhzhile00001sfrkttdh0qmb	EMP646983172	Jose Francisco	Parra Fernandez	Parra Fernandez	77320317K	deejaymacro@hotmail.es	+34679332640						ES	\N						\N		f	2025-11-14 23:24:06.984	2025-11-14 23:29:19.267	cmhi8mawd0000sf8xishgn0j2	\N	ACTIVE	\N	\N	f
cmhzhozeo0009sfrkcue6ozir	EMP00012	Jose F	Parra Fernandez	Parra Fernandez	69683385D	mdmcamachog3@gmail.com	+34652956500						ES	\N						\N		t	2025-11-14 23:29:05.088	2025-11-14 23:29:05.088	cmhi8mawd0000sf8xishgn0j2	\N	ACTIVE	\N	\N	f
cmhxndzh1003wsfcrvdgbwrtv	EMP00002	Antonio	Garcia	Lopez	03986759P	antonio@timenow.com	+34679332640	+34679332640					ES	1990-12-18 00:00:00		\N				\N		t	2025-11-13 16:32:57.302	2025-11-13 16:34:40.027	cmhi8mawd0000sf8xishgn0j2	cmhxndzjk003ysfcrn1ksk1wd	ACTIVE	\N	\N	f
cmi05gcxb000zsfrkcxd0viut	EMP00013	Fernando	Rosas	Perez	99053382H	fernando.rosas@timenow.cloud	666666666						ES	\N						\N		t	2025-11-15 10:34:13.488	2025-11-15 10:34:13.488	cmhi8mawd0000sf8xishgn0j2	\N	ACTIVE	\N	\N	f
cmhxnx5ch004asfcry43wl5zu	EMP00003	Manuel	Parra	Lopez	09186853D	manuel.parra@timenow.cloud							ES	\N		\N				\N		t	2025-11-13 16:47:51.377	2025-11-13 16:47:51.763	cmhi8mawd0000sf8xishgn0j2	cmhxnx5f0004csfcrv1evswk3	ACTIVE	\N	\N	f
cmhxqgmsm004ssfcrokcsngai	EMP00004	Juan Jesus	Cardo		36703355R	juanjesus.cardo@timenow.com							ES	\N		\N				\N		t	2025-11-13 17:58:59.686	2025-11-13 17:59:00.1	cmhi8mawd0000sf8xishgn0j2	cmhxqgmv5004usfcrlwtn0956	ACTIVE	\N	\N	f
cmhxqs3d80052sfcrv5rw1l4a	EMP00005	Juan Antonio	Gonzalez		60374477Y	jantoniogonzalez@timenow.com							ES	\N		\N				\N		t	2025-11-13 18:07:54.38	2025-11-13 18:07:54.819	cmhi8mawd0000sf8xishgn0j2	cmhxqs3fv0054sfcrmd0245ok	ACTIVE	\N	\N	f
cmhxquib2005csfcredflisba	EMP00006	Jesus	Cardona		75657458Q	jesus.cardona@timenow.com							ES	\N		\N				\N		t	2025-11-13 18:09:47.055	2025-11-13 18:09:47.429	cmhi8mawd0000sf8xishgn0j2	cmhxquicx005esfcrhg8cm7rw	ACTIVE	\N	\N	f
cmhxr1ux1005msfcrfqmubngt	EMP00007	Antonia	Camacho		11848854J	antonia.camacho@timenow.com							ES	\N		\N				\N		t	2025-11-13 18:15:29.989	2025-11-13 18:15:30.402	cmhi8mawd0000sf8xishgn0j2	cmhxr1uzu005osfcrzibyr163	ACTIVE	\N	\N	f
cmi06qk1h0001sfc31etupt5v	EMP00019	Jose Francisco	Parra Fernandez	Parra Fernandez	66454976H	deejaymacro77@hotmail.es	+34679332640						ES	\N						\N		t	2025-11-15 11:10:08.885	2025-11-16 23:45:52.639	cmhi8mawd0000sf8xishgn0j2	\N	ACTIVE	\N	\N	f
cmhxr2pf6005wsfcr84f6jfza	EMP00008	Jesus	Carmona		07357591Y	jesus.carmona@timenow.com							ES	\N		\N				\N		t	2025-11-13 18:16:09.522	2025-11-13 18:16:09.926	cmhi8mawd0000sf8xishgn0j2	cmhxr2phs005ysfcr82xhmslr	ACTIVE	\N	\N	f
cmhxr5fde0068sfcr50x0vt3x	EMP00009	asdasd	asdasdsa	asdasda	44399936T	deejaymacro2@hotmail.es	+34679332640						ES	\N		\N				\N		t	2025-11-13 18:18:16.466	2025-11-13 18:18:16.872	cmhi8mawd0000sf8xishgn0j2	cmhxr5ffn006asfcrex55lpw3	ACTIVE	\N	\N	f
cmi07b9cg0007sfn047tthicr	EMP00020	Jose Francisco	Parra Fernandez	Parra Fernandez	52833308P	deejaymacro10@hotmail.es	+34679332640						ES	\N						\N		t	2025-11-15 11:26:14.8	2025-11-16 23:45:52.647	cmhi8mawd0000sf8xishgn0j2	cmi07b9c50003sfn0k2yufwmo	ACTIVE	\N	\N	f
cmi0f3yke001xsfn02e2xbe6n	EMP00021	Sabado	Garcia	Garcia	33752709W	sabado.garcia@timenow.cloud	+34652956500	+34652956500					ES	\N						\N		t	2025-11-15 15:04:31.167	2025-11-16 23:45:52.65	cmhi8mawd0000sf8xishgn0j2	cmi0f3yk1001tsfn0fov3jeso	ACTIVE	\N	\N	f
cmi0fzulb002dsfn0oab7rbaf	EMP00022	Jose Francisco	Parra Fernandez	Parra Fernandez	50492457M	deejaymacro232@hotmail.es	+34679332640						ES	\N						\N		t	2025-11-15 15:29:19.007	2025-11-16 23:45:52.652	cmhi8mawd0000sf8xishgn0j2	cmi0fzukv0029sfn0f9n1i7bu	ACTIVE	\N	\N	f
cmi0hu61m000hsfjw7hucjsyj	EMP00023	Jose Francisco	Parra Fernandez	Parra Fernandez	55271414E	deejaymacro999@hotmail.es	+34679332640						ES	\N						\N		t	2025-11-15 16:20:53.147	2025-11-16 23:45:52.654	cmhi8mawd0000sf8xishgn0j2	cmi0hu61a000dsfjwqnm6qfd1	ACTIVE	\N	\N	f
cmhi8mayl0014sf8xdt2xyr0t	EMP00014	Ana	García	Rodríguez	12345678A	hr@demo.com	+34 912 345 678	+34 699 123 456	Calle Alcalá 45, 3º B	Madrid	28014	Madrid	ES	1985-03-15 00:00:00	Española	\N				https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/avatars/cmhi8mayd000asf8x6u7v665y.webp		t	2025-11-02 21:42:58.557	2025-11-15 10:15:30.659	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	PENDING_CONTRACT	\N	\N	f
cmhi8mayl001asf8x28g1zvor	EMP00015	Carlos	López	Martín	87654321B	carlos.lopez@demo.com	+34 913 456 789	+34 688 234 567	Avenida de América 123, 2º A	Madrid	28028	Madrid	ES	1982-06-20 00:00:00	Española	\N				\N		t	2025-11-02 21:42:58.557	2025-11-15 10:15:47.817	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd0008sf8xhdlgqj53	PENDING_CONTRACT	\N	\N	f
cmhi8mayl0017sf8xx41lu3cl	EMP00016	María	Pérez	González	11223344C	maria.perez@demo.com	+34 914 567 890	+34 677 345 678	Calle Serrano 87, 1º C	Madrid	28006	Madrid	ES	1990-11-10 00:00:00	Española	\N				\N		t	2025-11-02 21:42:58.557	2025-11-15 10:16:10.351	cmhi8mawd0000sf8xishgn0j2	cmhi8maye000gsf8xinbq6lnt	PENDING_CONTRACT	\N	\N	f
cmhi8mayl0018sf8xq74gttm2	EMP00017	Juan	Empleados	Sánchez	55667788D	manager@demo.com	+34 915 678 901	+34 666 456 789	Plaza Mayor 12, 4º D	Madrid	28012	Madrid	ES	1980-07-25 00:00:00	Española	\N				\N		t	2025-11-02 21:42:58.557	2025-11-15 10:21:08.653	cmhi8mawd0000sf8xishgn0j2	cmhi8mayb0005sf8xq50h79x6	PENDING_CONTRACT	\N	\N	f
cmi0v47nc002psfjw3t3ki8tu	EMP00024	Jose Francisco	Parra Fernandez	Parra Fernandez	21711102E	deejaymacro32323@hotmail.es	+34679332640						ES	\N						\N		t	2025-11-15 22:32:36.793	2025-11-16 23:45:52.656	cmhi8mawd0000sf8xishgn0j2	cmi0v47n3002lsfjw3oztz6a8	ACTIVE	\N	\N	f
cmi0v639f002tsfjwaptpwuom	EMP00025	Jose Francisco	Parra	Fernandez	22690918S	deejaymacroqw3e2@hotmail.es	+34679332640	\N	\N	\N	\N	\N	ES	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-11-15 22:34:04.419	2025-11-16 23:45:52.658	cmhi8mawd0000sf8xishgn0j2	cmi0v639h002vsfjwow9tjmrg	PENDING_CONTRACT	\N	\N	f
cmhi8mayl0019sf8x2p7pm6ew	EMP00018	Lucía	Fernández	Ruiz	99887766E	lucia.fernandez@demo.com	+34 916 789 012	+34 655 567 890	Calle Fuencarral 234, 5º A	Madrid	28004	Madrid	ES	1992-02-14 00:00:00	Española	\N				\N		t	2025-11-02 21:42:58.557	2025-11-15 10:17:15.055	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000dsf8xojrmtsbz	PENDING_CONTRACT	\N	\N	f
cmi2c3xtr0005sfeaxpqagy4a	EMP00026	Jose F	Parra Fernandez	Parra Fernandez	45180040J	mdmcamachog2323@gmail.com	+34652956500						ES	\N						\N		t	2025-11-16 23:16:03.712	2025-11-16 23:45:52.659	cmhi8mawd0000sf8xishgn0j2	cmi2c3xta0001sfeaqufj1fga	ACTIVE	\N	\N	f
cmhkdlfp3000ksfdxxb3wbfwi	EMP00001	Jose Francisco	Parra	Fernandez	45811993H	deejaymacro@hotmail.es	+34679332640	+34679332640	Calle Islas Cies Nº 2	Coria del rio	41100	SEVILLA	ES	1990-02-18 00:00:00	Española	a51cc2f33a91443b75aeb98c4a0e7be1:7692d11164658eeb5f96f776f4f07c8ac991d918fe94c766bf6bc6e1baaa160a	Camacho Granell	652956500	SPOUSE	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/avatars/cmhkdlfqz000msfdx04z2mfi7.webp		t	2025-11-04 09:37:48.471	2025-11-10 16:33:00.199	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	ACTIVE	\N	\N	f
\.


--
-- Data for Name: employment_contracts; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.employment_contracts (id, "contractType", "startDate", "endDate", "weeklyHours", "grossSalary", active, "createdAt", "updatedAt", "orgId", "employeeId", "positionId", "departmentId", "costCenterId", "managerId", "workingDaysPerWeek", "hasIntensiveSchedule", "intensiveEndDate", "intensiveStartDate", "intensiveWeeklyHours", "fridayHours", "hasCustomWeeklyPattern", "mondayHours", "saturdayHours", "sundayHours", "thursdayHours", "tuesdayHours", "wednesdayHours", "intensiveFridayHours", "intensiveMondayHours", "intensiveSaturdayHours", "intensiveSundayHours", "intensiveThursdayHours", "intensiveTuesdayHours", "intensiveWednesdayHours", "fridayEndTime", "fridayStartTime", "hasFixedTimeSlots", "mondayEndTime", "mondayStartTime", "saturdayEndTime", "saturdayStartTime", "scheduleType", "sundayEndTime", "sundayStartTime", "thursdayEndTime", "thursdayStartTime", "tuesdayEndTime", "tuesdayStartTime", "wednesdayEndTime", "wednesdayStartTime", "workFriday", "workMonday", "workSaturday", "workSunday", "workThursday", "workTuesday", "workWednesday", "fridayBreakEndTime", "fridayBreakStartTime", "intensiveFridayBreakEndTime", "intensiveFridayBreakStartTime", "intensiveFridayEndTime", "intensiveFridayStartTime", "intensiveMondayBreakEndTime", "intensiveMondayBreakStartTime", "intensiveMondayEndTime", "intensiveMondayStartTime", "intensiveSaturdayBreakEndTime", "intensiveSaturdayBreakStartTime", "intensiveSaturdayEndTime", "intensiveSaturdayStartTime", "intensiveSundayBreakEndTime", "intensiveSundayBreakStartTime", "intensiveSundayEndTime", "intensiveSundayStartTime", "intensiveThursdayBreakEndTime", "intensiveThursdayBreakStartTime", "intensiveThursdayEndTime", "intensiveThursdayStartTime", "intensiveTuesdayBreakEndTime", "intensiveTuesdayBreakStartTime", "intensiveTuesdayEndTime", "intensiveTuesdayStartTime", "intensiveWednesdayBreakEndTime", "intensiveWednesdayBreakStartTime", "intensiveWednesdayEndTime", "intensiveWednesdayStartTime", "mondayBreakEndTime", "mondayBreakStartTime", "saturdayBreakEndTime", "saturdayBreakStartTime", "sundayBreakEndTime", "sundayBreakStartTime", "thursdayBreakEndTime", "thursdayBreakStartTime", "tuesdayBreakEndTime", "tuesdayBreakStartTime", "wednesdayBreakEndTime", "wednesdayBreakStartTime") FROM stdin;
cmhi8mayn001fsf8xcizan5yn	INDEFINIDO	2023-01-10 00:00:00	\N	37.50	45000.00	t	2025-11-02 21:42:58.559	2025-11-13 11:57:23.946	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	cmhi8mayi000usf8xttge9o6i	cmhi8mayh000nsf8xst88lhcb	cmhi8mayg000isf8x65z5brpv	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhi8mayn001gsf8xl6cx8sg9	INDEFINIDO	2022-06-01 00:00:00	\N	37.50	50000.00	t	2025-11-02 21:42:58.559	2025-11-13 11:57:23.946	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl001asf8x28g1zvor	cmhi8mayi000wsf8x97nozurx	cmhi8mayh000osf8xmto5wxe6	cmhi8mayg000isf8x65z5brpv	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhi8mayn001isf8xiuh7rnu4	INDEFINIDO	2021-09-01 00:00:00	\N	37.50	55000.00	t	2025-11-02 21:42:58.559	2025-11-13 11:57:23.946	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0018sf8xq74gttm2	cmhi8mayi000vsf8x3juudrlv	cmhi8mayh000psf8xt6aoa74t	cmhi8mayg000isf8x65z5brpv	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxng6qa0044sfcrsrgjq4yj	INDEFINIDO	2025-11-13 00:00:00	\N	40.00	\N	t	2025-11-13 16:34:40.019	2025-11-13 16:34:40.019	cmhi8mawd0000sf8xishgn0j2	cmhxndzh1003wsfcrvdgbwrtv	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxndzk00042sfcrj83hs16q	TEMPORAL	2025-11-13 16:32:57.408	\N	0.00	\N	f	2025-11-13 16:32:57.408	2025-11-13 16:34:40.024	cmhi8mawd0000sf8xishgn0j2	cmhxndzh1003wsfcrvdgbwrtv	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhzgxoe7000bsfcn0llb3kmt	INDEFINIDO	2025-11-14 00:00:00	\N	40.00	\N	t	2025-11-14 23:07:51.103	2025-11-14 23:07:51.103	cmhi8mawd0000sf8xishgn0j2	cmhzgxnp80003sfcnm8wz8080	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxnx5n0004isfcrle11z1c7	INDEFINIDO	2025-11-13 00:00:00	\N	40.00	\N	t	2025-11-13 16:47:51.757	2025-11-13 16:47:51.757	cmhi8mawd0000sf8xishgn0j2	cmhxnx5ch004asfcry43wl5zu	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxnx5fb004gsfcr926c87io	TEMPORAL	2025-11-13 16:47:51.479	\N	0.00	\N	f	2025-11-13 16:47:51.48	2025-11-13 16:47:51.761	cmhi8mawd0000sf8xishgn0j2	cmhxnx5ch004asfcry43wl5zu	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhzgxns80009sfcnqk6zlthw	TEMPORAL	2025-11-14 23:07:50.311	\N	0.00	\N	f	2025-11-14 23:07:50.312	2025-11-14 23:07:51.11	cmhi8mawd0000sf8xishgn0j2	cmhzgxnp80003sfcnm8wz8080	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhzhozev000bsfrk5xi2e2cu	INDEFINIDO	2025-11-14 00:00:00	\N	40.00	\N	t	2025-11-14 23:29:05.095	2025-11-14 23:29:05.095	cmhi8mawd0000sf8xishgn0j2	cmhzhozeo0009sfrkcue6ozir	\N	\N	\N	\N	5.0	t	09-01	07-01	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	17:00	09:00	t	17:00	09:00	\N	\N	FIXED	\N	\N	17:00	09:00	17:00	09:00	17:00	09:00	t	t	f	f	t	t	t	15:00	14:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	\N	\N	\N	\N	\N	\N	\N	\N	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	15:00	14:00	\N	\N	\N	\N	15:00	14:00	15:00	14:00	15:00	14:00
cmhzhile40003sfrk0bvx01cs	INDEFINIDO	2025-11-14 00:00:00	2025-11-14 23:29:19.269	40.00	\N	f	2025-11-14 23:24:06.988	2025-11-14 23:29:19.269	cmhi8mawd0000sf8xishgn0j2	cmhzhile00001sfrkttdh0qmb	\N	\N	\N	\N	5.0	t	09-01	07-01	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	17:00	09:00	t	17:00	09:00	\N	\N	FIXED	\N	\N	17:00	09:00	17:00	09:00	17:00	09:00	t	t	f	f	t	t	t	15:00	14:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	\N	\N	\N	\N	\N	\N	\N	\N	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	15:00	14:00	\N	\N	\N	\N	15:00	14:00	15:00	14:00	15:00	14:00
cmhkdlfr6000qsfdxwnxczddb	TEMPORAL	2025-11-04 00:00:00	\N	37.50	36200.00	t	2025-11-04 09:37:48.547	2025-11-13 11:57:23.946	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	cmhi8mayi000ysf8xoaor4rrp	cmhi8mayh000qsf8xhks4gspg	cmhi8mayg000isf8x65z5brpv	cmhi8mayl0014sf8xdt2xyr0t	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhi8mayn001hsf8xmp9n60ny	TEMPORAL	2024-03-15 00:00:00	2025-03-14 00:00:00	37.50	38000.00	t	2025-11-02 21:42:58.559	2025-11-13 11:57:23.946	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0017sf8xx41lu3cl	cmhi8mayi000vsf8x3juudrlv	cmhi8mayh000psf8xt6aoa74t	cmhi8mayg000isf8x65z5brpv	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhi8mayn001ksf8x6mz2a3uj	INDEFINIDO	2023-08-01 00:00:00	\N	37.50	48000.00	t	2025-11-02 21:42:58.559	2025-11-13 11:57:23.946	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0019sf8x2p7pm6ew	cmhi8mayi000ysf8xoaor4rrp	cmhi8mayh000qsf8xhks4gspg	cmhi8mayg000isf8x65z5brpv	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxqgn3s0050sfcrzlkq0sm0	INDEFINIDO	2025-11-13 00:00:00	\N	40.00	\N	t	2025-11-13 17:59:00.089	2025-11-13 17:59:00.089	cmhi8mawd0000sf8xishgn0j2	cmhxqgmsm004ssfcrokcsngai	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxqgmve004ysfcrpk2k5v6j	TEMPORAL	2025-11-13 17:58:59.786	\N	0.00	\N	f	2025-11-13 17:58:59.787	2025-11-13 17:59:00.096	cmhi8mawd0000sf8xishgn0j2	cmhxqgmsm004ssfcrokcsngai	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxqs3os005asfcrw1sphmww	INDEFINIDO	2025-11-13 00:00:00	\N	40.00	\N	t	2025-11-13 18:07:54.796	2025-11-13 18:07:54.796	cmhi8mawd0000sf8xishgn0j2	cmhxqs3d80052sfcrv5rw1l4a	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxqs3g70058sfcrk93pxfa8	TEMPORAL	2025-11-13 18:07:54.486	\N	0.00	\N	f	2025-11-13 18:07:54.487	2025-11-13 18:07:54.802	cmhi8mawd0000sf8xishgn0j2	cmhxqs3d80052sfcrv5rw1l4a	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxquil7005ksfcr02o85kuq	INDEFINIDO	2025-11-13 00:00:00	\N	40.00	\N	t	2025-11-13 18:09:47.419	2025-11-13 18:09:47.419	cmhi8mawd0000sf8xishgn0j2	cmhxquib2005csfcredflisba	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxquid5005isfcr4zht4t4u	TEMPORAL	2025-11-13 18:09:47.129	\N	0.00	\N	f	2025-11-13 18:09:47.129	2025-11-13 18:09:47.425	cmhi8mawd0000sf8xishgn0j2	cmhxquib2005csfcredflisba	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxr1v83005usfcrrpszb7ln	INDEFINIDO	2025-11-13 00:00:00	\N	40.00	\N	t	2025-11-13 18:15:30.387	2025-11-13 18:15:30.387	cmhi8mawd0000sf8xishgn0j2	cmhxr1ux1005msfcrfqmubngt	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxr1v05005ssfcruzixtv0x	TEMPORAL	2025-11-13 18:15:30.101	\N	0.00	\N	f	2025-11-13 18:15:30.101	2025-11-13 18:15:30.398	cmhi8mawd0000sf8xishgn0j2	cmhxr1ux1005msfcrfqmubngt	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxr2pq40064sfcry1dpzj95	INDEFINIDO	2025-11-13 00:00:00	\N	40.00	\N	t	2025-11-13 18:16:09.917	2025-11-13 18:16:09.917	cmhi8mawd0000sf8xishgn0j2	cmhxr2pf6005wsfcr84f6jfza	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxr2pi20062sfcrlch7t7ry	TEMPORAL	2025-11-13 18:16:09.626	\N	0.00	\N	f	2025-11-13 18:16:09.626	2025-11-13 18:16:09.924	cmhi8mawd0000sf8xishgn0j2	cmhxr2pf6005wsfcr84f6jfza	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxr5fo7006gsfcr2fd3p1nm	INDEFINIDO	2025-11-13 00:00:00	\N	40.00	\N	t	2025-11-13 18:18:16.855	2025-11-13 18:18:16.855	cmhi8mawd0000sf8xishgn0j2	cmhxr5fde0068sfcr50x0vt3x	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmhxr5ffx006esfcrrlsflgfm	TEMPORAL	2025-11-13 18:18:16.556	\N	0.00	\N	f	2025-11-13 18:18:16.557	2025-11-13 18:18:16.868	cmhi8mawd0000sf8xishgn0j2	cmhxr5fde0068sfcr50x0vt3x	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmi05gcxj0011sfrkaslceu3n	INDEFINIDO	2025-11-15 00:00:00	\N	40.00	\N	t	2025-11-15 10:34:13.495	2025-11-15 10:34:13.495	cmhi8mawd0000sf8xishgn0j2	cmi05gcxb000zsfrkcxd0viut	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FIXED	\N	\N	\N	\N	\N	\N	\N	\N	t	t	f	f	t	t	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmi06qk1m0003sfc3dl02mo3y	INDEFINIDO	2025-11-15 00:00:00	\N	40.00	\N	t	2025-11-15 11:10:08.89	2025-11-15 11:10:08.89	cmhi8mawd0000sf8xishgn0j2	cmi06qk1h0001sfc31etupt5v	\N	\N	\N	\N	5.0	t	09-01	07-01	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	17:00	09:00	t	17:00	09:00	\N	\N	FIXED	\N	\N	17:00	09:00	17:00	09:00	17:00	09:00	t	t	f	f	t	t	t	15:00	14:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	\N	\N	\N	\N	\N	\N	\N	\N	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	15:00	14:00	\N	\N	\N	\N	15:00	14:00	15:00	14:00	15:00	14:00
cmi07b9ck0009sfn0rapozy8u	INDEFINIDO	2025-11-15 00:00:00	\N	40.00	\N	t	2025-11-15 11:26:14.804	2025-11-15 11:26:14.804	cmhi8mawd0000sf8xishgn0j2	cmi07b9cg0007sfn047tthicr	\N	\N	\N	\N	5.0	t	09-01	07-01	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	17:00	09:00	t	17:00	09:00	\N	\N	FIXED	\N	\N	17:00	09:00	17:00	09:00	17:00	09:00	t	t	f	f	t	t	t	15:00	14:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	\N	\N	\N	\N	\N	\N	\N	\N	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	15:00	14:00	\N	\N	\N	\N	15:00	14:00	15:00	14:00	15:00	14:00
cmi0fzule002fsfn0vd3zlsz4	INDEFINIDO	2025-11-15 00:00:00	\N	40.00	\N	t	2025-11-15 15:29:19.011	2025-11-15 15:29:19.011	cmhi8mawd0000sf8xishgn0j2	cmi0fzulb002dsfn0oab7rbaf	\N	\N	\N	\N	5.0	t	09-01	07-01	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	18:00	09:00	t	18:00	09:00	\N	\N	FIXED	\N	\N	18:00	09:00	18:00	09:00	18:00	09:00	t	t	f	f	t	t	t	15:00	14:00	\N	\N	15:00	08:00	\N	\N	15:00	08:00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	15:00	08:00	\N	\N	15:00	08:00	\N	\N	15:00	08:00	15:00	14:00	\N	\N	\N	\N	15:00	14:00	15:00	14:00	15:00	14:00
cmi0f3ykk001zsfn0zof85cbu	INDEFINIDO	2025-11-15 00:00:00	\N	40.00	\N	t	2025-11-15 15:04:31.172	2025-11-15 16:20:05.61	cmhi8mawd0000sf8xishgn0j2	cmi0f3yke001xsfn02e2xbe6n	\N	\N	\N	\N	4.0	t	09-01	06-01	26.00	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	17:00	09:00	t	17:00	09:00	19:00	09:00	FIXED	\N	\N	17:00	09:00	\N	\N	\N	\N	t	t	t	f	t	f	f	15:00	14:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	\N	\N	\N	\N	11:30	11:00	15:00	08:00	\N	\N	\N	\N	\N	\N	\N	\N	15:00	14:00	15:00	14:00	\N	\N	15:00	14:00	\N	\N	\N	\N
cmi0hu61q000jsfjwr4nmmfsm	INDEFINIDO	2025-11-15 00:00:00	\N	40.00	\N	t	2025-11-15 16:20:53.15	2025-11-15 16:20:53.15	cmhi8mawd0000sf8xishgn0j2	cmi0hu61m000hsfjw7hucjsyj	\N	\N	\N	\N	5.0	t	09-01	06-15	32.50	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	17:00	09:00	t	17:00	09:00	\N	\N	FIXED	\N	\N	17:00	09:00	17:00	09:00	17:00	09:00	t	t	f	f	t	t	t	15:00	14:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	\N	\N	\N	\N	\N	\N	\N	\N	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	11:30	11:00	15:00	08:00	15:00	14:00	\N	\N	\N	\N	15:00	14:00	15:00	14:00	15:00	14:00
cmi0v47ng002rsfjw0vqjueft	INDEFINIDO	2025-11-15 00:00:00	\N	40.00	\N	t	2025-11-15 22:32:36.796	2025-11-15 22:32:36.796	cmhi8mawd0000sf8xishgn0j2	cmi0v47nc002psfjw3t3ki8tu	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmi0v639p002zsfjwexmdep9n	TEMPORAL	2025-11-15 22:34:04.429	\N	0.00	\N	t	2025-11-15 22:34:04.43	2025-11-15 22:34:04.43	cmhi8mawd0000sf8xishgn0j2	cmi0v639f002tsfjwaptpwuom	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	FLEXIBLE	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
cmi2c3xtw0007sfead2d1vvi0	INDEFINIDO	2025-11-16 00:00:00	\N	40.00	\N	t	2025-11-16 23:16:03.716	2025-11-16 23:16:03.716	cmhi8mawd0000sf8xishgn0j2	cmi2c3xtr0005sfeaxpqagy4a	\N	\N	\N	\N	5.0	f	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	17:00	09:00	t	17:00	09:00	\N	\N	FIXED	\N	\N	17:00	09:00	17:00	09:00	17:00	09:00	t	t	f	f	t	t	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: expense_approvals; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.expense_approvals (id, decision, comment, "decidedAt", level, "approverId", "expenseId") FROM stdin;
cmhjaa64m000bsfilmo4adrod	REJECTED	NO!	2025-11-03 16:02:36.955	1	cmhi8mayd000asf8x6u7v665y	cmhja8c5u0001sfil9rijjv77
cmhjaaj65000lsfilzyexzawp	APPROVED	OK!	2025-11-03 16:04:37.142	1	cmhi8mayd000asf8x6u7v665y	cmhjaaiiv000fsfilsda29mjf
cmhjc1ym4000bsftbyzlmnr14	APPROVED	Aprobado!	2025-11-03 16:07:05.984	1	cmhi8mayd000asf8x6u7v665y	cmhjc1w790005sftbnxb0pn4o
cmhjjft2f000vsftbqkbd98hr	REJECTED	-no	2025-11-03 20:50:27.087	1	cmhi8mayd000asf8x6u7v665y	cmhjjfsbc000psftbq8oaxz1m
cmhjqiozn000dsfdxfrngnrev	APPROVED	\N	2025-11-03 22:52:06.022	1	cmhi8mayd000asf8x6u7v665y	cmhjqim3h0007sfdx2j83wzaf
cmhkdomwf0016sfdxmw314k5t	APPROVED	\N	2025-11-04 09:41:43.916	1	cmhi8mayd000asf8x6u7v665y	cmhkdom380010sfdxd5m8vpo3
cmhktm2po005dsfrkmk3xdl62	APPROVED	si	2025-11-04 17:07:08.471	1	cmhi8mayd000asf8x6u7v665y	cmhktly8q0057sfrk2tajlk03
cmhly1v1h004nsf71bseww6pj	APPROVED	yeee	2025-11-05 11:58:24.916	1	cmhi8mayd000asf8x6u7v665y	cmhly1sn3004hsf71skgqdusy
cmhv3s5cq009lsfap32c6pfyg	APPROVED	\N	2025-11-15 23:10:50.839	1	cmhi8mayd000asf8x6u7v665y	cmhv3s33g009fsfap29l36on9
cmi1xp1cj000vsfsunti2pn2n	APPROVED	\N	2025-11-16 16:32:45.142	1	cmhi8mayd000asf8x6u7v665y	cmi1xoznd000psfsu0dknaj1s
\.


--
-- Data for Name: expense_approvers; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.expense_approvers (id, "userId", "orgId", "isPrimary", "order", "createdAt") FROM stdin;
cmhjqgwkk0001sfdx6o0jhwuf	cmhi8mayd000asf8x6u7v665y	cmhi8mawd0000sf8xishgn0j2	t	0	2025-11-03 22:50:25.893
\.


--
-- Data for Name: expense_attachments; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.expense_attachments (id, url, "fileName", "mimeType", "fileSize", "createdAt", "expenseId") FROM stdin;
cmhj1esad0011sf67boa55ik7	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhj1eqq7000xsf67cain9lmn/attachments/1762168136191-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-03 11:08:56.629	cmhj1eqq7000xsf67cain9lmn
cmhj7ry6o000rsftce9pqk3yb	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhj7rvrc000nsftcu2u1u24w/attachments/1762178827404-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-03 14:07:08.497	cmhj7rvrc000nsftcu2u1u24w
cmhja1hq6000xsftcoplssr1d	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhja1h7k000tsftc5x1p9ans/attachments/1762182632593-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-03 15:10:32.958	cmhja1h7k000tsftc5x1p9ans
cmhja8dql0005sfil11ujcpeg	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhja8c5u0001sfil9rijjv77/attachments/1762182954086-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-03 15:15:54.382	cmhja8c5u0001sfil9rijjv77
cmhjaaixt000jsfile131mbrg	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhjaaiiv000fsfilsda29mjf/attachments/1762183054188-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-03 15:17:34.434	cmhjaaiiv000fsfilsda29mjf
cmhjc1xuo0009sftb69u2z3ae	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhjc1w790005sftbnxb0pn4o/attachments/1762186012739-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-03 16:06:53.089	cmhjc1w790005sftbnxb0pn4o
cmhjjfss7000tsftbtf6vj39w	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhjjfsbc000psftbq8oaxz1m/attachments/1762198416701-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-03 19:33:37.015	cmhjjfsbc000psftbq8oaxz1m
cmhjqioat000bsfdxre4nzx2u	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhjqim3h0007sfdx2j83wzaf/attachments/1762210307581-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-03 22:51:48.485	cmhjqim3h0007sfdx2j83wzaf
cmhkdomnq0014sfdx82ep2pu0	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhkdom380010sfdxd5m8vpo3/attachments/1762249217011-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-04 09:40:17.463	cmhkdom380010sfdxd5m8vpo3
cmhktm1b9005bsfrkwulokimm	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhktly8q0057sfrk2tajlk03/attachments/1762275970040-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-04 17:06:10.341	cmhktly8q0057sfrk2tajlk03
cmhly1u8q004lsf711lto3s3f	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhly1sn3004hsf71skgqdusy/attachments/1762343892029-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-05 11:58:12.314	cmhly1sn3004hsf71skgqdusy
cmhv3s4ny009jsfapynckayq6	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmhv3s33g009fsfap29l36on9/attachments/1762897711793-azul.png	Azul.png	image/png	110427	2025-11-11 21:48:32.542	cmhv3s33g009fsfap29l36on9
cmi1xp0ph000tsfsudo0xu2sy	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/expenses/cmi1xoznd000psfsu0dknaj1s/attachments/1763310752742-ticket.jpg	ticket.jpg	image/jpeg	75172	2025-11-16 16:32:32.98	cmi1xoznd000psfsu0dknaj1s
\.


--
-- Data for Name: expense_policies; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.expense_policies (id, "mileageRateEurPerKm", "mealDailyLimit", "lodgingDailyLimit", "categoryRequirements", "attachmentRequired", "costCenterRequired", "vatAllowed", "approvalLevels", "createdAt", "updatedAt", "orgId") FROM stdin;
cmhi8mayp001msf8xxxj3xen5	0.260	30.00	100.00	{"FUEL": {"vatAllowed": true, "description": "Combustible para vehículos de empresa o desplazamientos", "requiresReceipt": true}, "MEAL": {"vatAllowed": true, "description": "Comidas en desplazamientos o con clientes", "maxDailyAmount": 30, "requiresReceipt": true}, "TOLL": {"vatAllowed": true, "description": "Peajes de autopistas", "requiresReceipt": true}, "OTHER": {"vatAllowed": true, "description": "Otros gastos justificados", "requiresReceipt": true}, "LODGING": {"vatAllowed": true, "description": "Alojamiento en desplazamientos", "maxDailyAmount": 100, "requiresReceipt": true}, "MILEAGE": {"vatAllowed": false, "description": "Kilometraje con vehículo propio", "requiresReceipt": false}, "PARKING": {"vatAllowed": true, "description": "Parking en desplazamientos", "requiresReceipt": false}}	t	f	t	1	2025-11-02 21:42:58.562	2025-11-02 21:42:58.562	cmhi8mawd0000sf8xishgn0j2
cmhxaeh5m003jsfqk76uvzcxt	0.260	30.00	100.00	{"FUEL": {"vatAllowed": true, "description": "Combustible para vehículos de empresa o desplazamientos", "requiresReceipt": true}, "MEAL": {"vatAllowed": true, "description": "Comidas en desplazamientos o con clientes", "maxDailyAmount": 30, "requiresReceipt": true}, "TOLL": {"vatAllowed": true, "description": "Peajes de autopistas", "requiresReceipt": true}, "OTHER": {"vatAllowed": true, "description": "Otros gastos justificados", "requiresReceipt": true}, "LODGING": {"vatAllowed": true, "description": "Alojamiento en desplazamientos", "maxDailyAmount": 100, "requiresReceipt": true}, "MILEAGE": {"vatAllowed": false, "description": "Kilometraje con vehículo propio", "requiresReceipt": false}, "PARKING": {"vatAllowed": true, "description": "Parking en desplazamientos", "requiresReceipt": false}}	t	f	t	1	2025-11-13 10:29:25.211	2025-11-13 10:29:25.211	cmhxacerz0014sfcr0oks8l2b
\.


--
-- Data for Name: expense_reports; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.expense_reports (id, title, description, "periodFrom", "periodTo", status, total, "createdAt", "updatedAt", "orgId", "ownerId") FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.expenses (id, date, currency, amount, "vatPercent", "totalAmount", category, "mileageKm", "mileageRate", "costCenterId", notes, "merchantName", "merchantVat", "ocrRawData", status, "createdBy", "updatedBy", "createdAt", "updatedAt", "orgId", "employeeId", "reportId", "reimbursedAt", "reimbursedBy", "reimbursementMethod", "reimbursementReference") FROM stdin;
cmhj1deip000tsf67g4covdsk	2025-11-03 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		IN TACON MEBILLAS 7		\N	DRAFT	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 11:07:52.13	2025-11-03 11:07:52.13	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	\N	\N	\N
cmhj1eqq7000xsf67cain9lmn	2025-11-03 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		IN TACON MEBILLAS 7		\N	DRAFT	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 11:08:54.607	2025-11-03 11:08:54.607	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	\N	\N	\N
cmhj7rvrc000nsftcu2u1u24w	2025-11-03 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		IN TACON MEBILLAS 7		\N	DRAFT	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 14:07:05.353	2025-11-03 14:07:05.353	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	\N	\N	\N
cmhja1h7k000tsftc5x1p9ans	2025-11-03 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		ZARA		\N	DRAFT	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 15:10:32.287	2025-11-03 15:10:32.287	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	\N	\N	\N
cmhja8c5u0001sfil9rijjv77	2025-11-03 00:00:00	EUR	49.55	21.00	59.96	OTHER	\N	\N	\N		zara		\N	REJECTED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 15:15:52.337	2025-11-03 16:02:36.958	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	\N	\N	\N
cmhjjfsbc000psftbq8oaxz1m	2025-11-03 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		immm		\N	REJECTED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 19:33:36.407	2025-11-03 20:50:27.092	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	\N	\N	\N
cmhkdom380010sfdxd5m8vpo3	2025-11-04 00:00:00	EUR	10.40	\N	10.40	OTHER	\N	\N	\N		IN TACN MESAS 7		\N	REIMBURSED	cmhkdlfqz000msfdx04z2mfi7	\N	2025-11-04 09:40:16.725	2025-11-15 23:34:57.315	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	2025-11-15 23:34:57.313	cmhi8mayd000asf8x6u7v665y	PAYROLL	Nomina enero
cmhjaaiiv000fsfilsda29mjf	2025-11-03 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		test		\N	REIMBURSED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 15:17:33.895	2025-11-15 23:35:09.996	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	2025-11-15 23:35:09.994	cmhi8mayd000asf8x6u7v665y	TRANSFER	En nomina julio
cmhjc1w790005sftbnxb0pn4o	2025-11-03 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		IN TACON MEBILLAS 7		\N	REIMBURSED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 16:06:50.949	2025-11-15 23:35:09.996	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	2025-11-15 23:35:09.994	cmhi8mayd000asf8x6u7v665y	TRANSFER	En nomina julio
cmhjqim3h0007sfdx2j83wzaf	2025-11-03 00:00:00	EUR	49.50	21.00	59.90	OTHER	\N	\N	\N		IN		\N	REIMBURSED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-03 22:51:45.629	2025-11-15 23:35:09.996	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	2025-11-15 23:35:09.994	cmhi8mayd000asf8x6u7v665y	TRANSFER	En nomina julio
cmhktly8q0057sfrk2tajlk03	2025-11-04 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		IN TACON MEBILLAS 7		\N	REIMBURSED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-04 17:06:06.36	2025-11-15 23:35:09.996	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	2025-11-15 23:35:09.994	cmhi8mayd000asf8x6u7v665y	TRANSFER	En nomina julio
cmhly1sn3004hsf71skgqdusy	2025-11-05 00:00:00	EUR	10.40	\N	10.40	OTHER	\N	\N	\N		Zara		\N	REIMBURSED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-05 11:58:10.24	2025-11-15 23:35:09.996	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	2025-11-15 23:35:09.994	cmhi8mayd000asf8x6u7v665y	TRANSFER	En nomina julio
cmhv3s33g009fsfap29l36on9	2025-11-11 00:00:00	EUR	90.00	21.00	108.90	OTHER	\N	\N	\N		Es hora de		\N	REIMBURSED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-11 21:48:30.508	2025-11-15 23:35:09.996	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	2025-11-15 23:35:09.994	cmhi8mayd000asf8x6u7v665y	TRANSFER	En nomina julio
cmi1xoznd000psfsu0dknaj1s	2025-11-16 00:00:00	EUR	49.55	\N	49.55	OTHER	\N	\N	\N		IN TACON MEBILLAS 7		\N	APPROVED	cmhi8mayd000asf8x6u7v665y	\N	2025-11-16 16:32:31.61	2025-11-16 16:32:45.144	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	\N	\N	\N
\.


--
-- Data for Name: geolocation_consents; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.geolocation_consents (id, "consentGivenAt", "consentVersion", "ipAddress", active, "createdAt", "updatedAt", "orgId", "userId") FROM stdin;
cmhl09yz70015sfrssv00nleb	2025-11-04 20:12:44.756	1.0	::1	t	2025-11-04 20:12:44.756	2025-11-04 20:12:44.756	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7
cmhlxz19x0031sf71ky5weypp	2025-11-05 11:56:01.462	1.0	::1	t	2025-11-05 11:56:01.462	2025-11-05 11:56:01.462	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
cmi1xagny0033sf0dn9y0khj4	2025-11-16 16:21:13.822	1.0	::1	t	2025-11-16 16:21:13.822	2025-11-16 16:21:13.822	cmhi8mawd0000sf8xishgn0j2	cmi0f3yk1001tsfn0fov3jeso
\.


--
-- Data for Name: manual_time_entry_requests; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.manual_time_entry_requests (id, date, "clockInTime", "clockOutTime", reason, status, "approverId", "approvedAt", "approverComments", "rejectedAt", "rejectionReason", "createdClockInId", "createdClockOutId", "submittedAt", "createdAt", "updatedAt", "orgId", "employeeId", "replacedEntryIds", "replacesIncompleteEntry", "warningMessage") FROM stdin;
cmhv6a2tj00dbsfapx8ivftv1	2025-11-09 23:00:00	2025-11-10 08:00:00	2025-11-10 17:00:00	asdasdasdasd	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-11 22:58:39.589		\N	\N	cmhv6aau400dfsfap1vjfaebm	cmhv6aau700dhsfapyempqimf	2025-11-11 22:58:29.191	2025-11-11 22:58:29.191	2025-11-11 22:58:39.59	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{cmhv6924e0001sfzxttw9pamw}	t	Esta solicitud reemplazará un fichaje abierto desde 10/11/2025, 9:00:00
cmhv2nue0008dsfapyf7c1ein	2025-11-09 23:00:00	2025-11-10 08:00:00	2025-11-10 16:00:00	Se me olvidó, lo siento!	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-11 21:56:51.826		\N	\N	cmhynsjgo0001sf7cziv72dhm	cmhynsjh00003sf7c0tcxmj12	2025-11-11 21:17:12.984	2025-11-11 21:17:12.984	2025-11-14 09:32:02.583	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{cmhv2jhqa0003sfi670fcg60y}	t	Esta solicitud reemplazará un fichaje abierto desde 10/11/2025, 9:00:00
cmhly0281003nsf71c1wikq2n	2025-10-22 22:00:00	2025-10-23 07:00:00	2025-10-23 16:00:00	Se me olvido fichar.	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-05 11:57:05.61	VAle!	\N	\N	cmhynsjhs000vsf7cifqh02of	cmhynsjht000xsf7cnll0absx	2025-11-05 11:56:49.345	2025-11-05 11:56:49.345	2025-11-14 09:32:02.61	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{}	f	\N
cmhv2bxus006dsfaprlidd179	2025-11-09 23:00:00	2025-11-10 08:00:00	2025-11-10 16:00:00	Se me olvido fichar, gracias!	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-11 21:08:18.507	Aceptadas.	\N	\N	cmhynsjhc0007sf7ctid9utau	cmhynsjhf0009sf7cflpkaqb2	2025-11-11 21:07:57.604	2025-11-11 21:07:57.604	2025-11-14 09:32:02.596	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{cmhv2ayy30003sfl5mqo2kk2x}	t	Esta solicitud reemplazará un fichaje abierto desde 10/11/2025, 9:00:00
cmhuwrjky001zsfap1l5x59gg	2025-11-09 23:00:00	2025-11-10 07:00:00	2025-11-10 15:00:00	Hola!!! Se me olvido fichar!!	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-11 18:32:32.002	Aprobado, gracias!	\N	\N	cmhynsjhi000dsf7cizx9dukk	cmhynsjhj000fsf7c0q1bc1vw	2025-11-11 18:32:07.906	2025-11-11 18:32:07.906	2025-11-14 09:32:02.6	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{cmhuwk04q0001sfgrexaigcvm}	t	Esta solicitud reemplazará un fichaje abierto desde 10/11/2025, 9:00:16
cmhxyk60m000bsfhv3ugpepz6	2025-11-10 23:00:00	2025-11-11 08:00:00	2025-11-11 17:00:00	Lo siento mucho, se me olvidó	REJECTED	cmhi8mayd000asf8x6u7v665y	\N	\N	2025-11-16 16:31:25.525	No no nonono	\N	\N	2025-11-13 21:45:41.495	2025-11-13 21:45:41.495	2025-11-16 16:31:25.525	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{}	f	\N
cmhusv47g0007sfap3a0j0bvj	2025-11-09 23:00:00	2025-11-10 08:00:00	2025-11-10 16:00:00	asdadasdsadasda	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-11 16:43:10.205	sadadads	\N	\N	cmhynsjhl000jsf7ck63rjd58	cmhynsjhm000lsf7c2vupoep6	2025-11-11 16:42:56.141	2025-11-11 16:42:56.141	2025-11-14 09:32:02.603	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{cmhusr5s70001sfvrc5ziq0y9}	t	Esta solicitud reemplazará un fichaje abierto desde 10/11/2025, 9:00:51
cmi1xliu50007sfsu615r51c5	2025-11-11 23:00:00	2025-11-12 08:00:00	2025-11-12 17:00:00	hola hola hola	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-16 16:31:28.539		\N	\N	cmi1xnmz6000dsfsuferx2iya	cmi1xnmz8000fsfsurvoo6e7n	2025-11-16 16:29:49.854	2025-11-16 16:29:49.854	2025-11-16 16:31:28.539	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{cmhv6cg0300dzsfap8paem3yt,cmhv6cspq00ebsfap7hqex7yd}	t	Esta solicitud reemplazará un fichaje abierto desde 12/11/2025, 0:00:19
cmhurrv02000zsfz96d0htor4	2025-11-09 23:00:00	2025-11-10 08:00:00	2025-11-10 16:00:00	asdasdadasdad	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-11 16:12:39.58	asddsadadas	\N	\N	cmhynsjhp000psf7cmzg67hc0	cmhynsjhq000rsf7c5k3ni6tg	2025-11-11 16:12:24.627	2025-11-11 16:12:24.627	2025-11-14 09:32:02.607	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{cmhurpaez0001sfbri5zb7n48}	t	Esta solicitud reemplazará un fichaje abierto desde 10/11/2025, 9:00:00
cmi1xo0xw000lsfsuphshkzsm	2025-11-13 23:00:00	2025-11-14 08:00:00	2025-11-14 17:00:00	Testttttttt	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-16 16:45:22.664		\N	\N	cmi1y5il90015sfsuahtc4hcn	cmi1y5ile0017sfsulyxopd2e	2025-11-16 16:31:46.628	2025-11-16 16:31:46.628	2025-11-16 16:45:22.665	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{}	f	\N
cmi1y4vhl0011sfsufakzzi25	2025-11-10 23:00:00	2025-11-11 08:00:00	2025-11-11 17:00:00	asdadasdasdadasd	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-16 16:45:24.846		\N	\N	cmi1y5k9w001dsfsufzewif8q	cmi1y5ka0001fsfsuj8ws3pre	2025-11-16 16:44:52.714	2025-11-16 16:44:52.714	2025-11-16 16:45:24.847	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{}	f	\N
cmi1y6thh001psfsursiw9hny	2025-11-12 23:00:00	2025-11-13 08:00:00	2025-11-13 16:00:00	Hola lo siento mucho	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-16 16:46:33.785		\N	\N	cmi1y71gv001tsfsuq64m1ooo	cmi1y71gz001vsfsuh20i0z2m	2025-11-16 16:46:23.43	2025-11-16 16:46:23.43	2025-11-16 16:46:33.786	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{cmhxdec8u001ksfcry408i3sg,cmhxdedsp001osfcr4b2osoea,cmhxdk51c002csfcroipkvp62,cmhxdk69m002gsfcrfma5tuz7,cmhxn5048003ksfcrye3bdact,cmhxn51u6003osfcrid8gz1qt,cmhxyroep000vsfhvisy63rdj}	t	Esta solicitud reemplazará un fichaje abierto desde 13/11/2025, 12:53:17
cmi28hh6v0001sf84njic2er6	2025-11-04 23:00:00	2025-11-05 08:00:00	2025-11-05 16:00:00	Se me olvido fichar.	APPROVED	cmhi8mayd000asf8x6u7v665y	2025-11-16 21:34:52.606		\N	\N	cmi28htbo0005sf84zysc85pw	cmi28htbr0007sf84y8kln6yn	2025-11-16 21:34:36.872	2025-11-16 21:34:36.872	2025-11-16 21:34:52.607	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	{cmhlqfvx3000fsfgpjhdpy1la,cmhlqfx6a000jsfgp7ma9jfrv,cmhlqfyfl000nsfgpc917udkj,cmhlqfzg9000rsfgp46u77lca,cmhlqh00g000xsfgp41pxdjuz,cmhlqh1840011sfgppypnyfc0,cmhlqt5kp0017sfgpzv0rers2,cmhlqt6p9001bsfgpui02xn6t,cmhlqt7m1001fsfgpldbsiji9,cmhlqt8i9001jsfgp5emwx9yw,cmhlqtdsr001nsfgp77pr6dqp,cmhlqtgvc001rsfgpas27bdne,cmhlqtjdh001vsfgpmkfesnlv,cmhlqtkpr001zsfgpaax0phzi,cmhlqtn1t0023sfgp6t1qk9tl,cmhlqtqhl0027sfgpu1zu2x26,cmhlqygtc002bsfgpxkty16xl,cmhlqyj9d002fsfgpkqo0i1lu,cmhlqynl0002jsfgpjm2h5pfo,cmhlqyt9u002nsfgpope1atzd,cmhlr35fq002rsfgpjscidld7,cmhlr36hi002vsfgpyw8z3p2m,cmhlrz645002zsfgposhal57e,cmhlrz7ff0033sfgpf0v6cnrz,cmhlrz8zl0037sfgpm91v8ohu,cmhlrza36003bsfgp2lv35ncp,cmhlrzqan003fsfgpdii63yvj,cmhlrzrwu003jsfgpip3o0h8b,cmhls161z003nsfgprywyb2xx,cmhls17e7003rsfgpktassmpn,cmhls18e4003vsfgp1ar803qr,cmhls19mn003zsfgppdgodwbc,cmhls1aup0043sfgpb353shpv,cmhls1ct50047sfgp1lqcqhod,cmhls1ygj004bsfgppas0lbuj,cmhls20fz004fsfgpqfpiz39z,cmhls53sa004vsfgpwrw8ybjv,cmhls55se004zsfgp3kgiuak3,cmhls573o0053sfgpcy8s7n38,cmhls8hkd0057sfgpuhz29gyq,cmhls8jao005bsfgpq7lk8iig,cmhls8kpp005fsfgp51lgoz57,cmhlvxtob000lsf71multchmb,cmhlvxy6o000psf71gpgx02zt,cmhlvxz1u000tsf71f1jr5g7t,cmhlvxzy4000xsf71t5yij0dk,cmhlvy0xu0011sf7108cm0l1a}	t	Esta solicitud reemplazará un fichaje abierto desde 5/11/2025, 9:25:10
cmi28imjq000dsf842gjk38tk	2025-11-05 23:00:00	2025-11-06 08:00:00	2025-11-06 16:00:00	Se me olvido fichar.	PENDING	cmhi8mayd000asf8x6u7v665y	\N	\N	\N	\N	\N	\N	2025-11-16 21:35:30.471	2025-11-16 21:35:30.471	2025-11-16 21:35:30.471	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	{cmhnhy6gv001fsfp50zwhw73m,cmhnhy7te001jsfp5xijrr249,cmhnlxkhp001xsfoay8q1ijq9,cmhnlxlo30021sfoaddpkmg17,cmhnmmy58002lsfoamlz5j1v1,cmhnroaja003zsfoa5zni396g,cmhnrobmt0043sfoamcjfhkeg,cmhnrux9i004fsfoaf9ck443z,cmhnruyev004jsfoa25a1ymrx,cmhnxmq3h000tsfvjgtyauvdq}	t	Esta solicitud reemplazará un fichaje abierto desde 6/11/2025, 15:03:00
cmi28ivys000hsf8426f72z4x	2025-11-06 23:00:00	2025-11-07 08:00:00	2025-11-07 16:00:00	Se me olvido fichar.	PENDING	cmhi8mayd000asf8x6u7v665y	\N	\N	\N	\N	\N	\N	2025-11-16 21:35:42.677	2025-11-16 21:35:42.677	2025-11-16 21:35:42.677	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	{cmhorkp70001zsfl9dg8r6asw,cmhorljje002fsfl9zheksnji,cmhorlmys002jsfl9lkuhqesv,cmhorss6a002nsfl9us69csho}	t	Esta solicitud reemplazará un fichaje abierto desde 7/11/2025, 12:20:13
cmi28jea8000lsf84ue9p2f3n	2025-11-02 23:00:00	2025-11-03 08:00:00	2025-11-03 16:00:00	Se me olvido fichar.	PENDING	cmhi8mayd000asf8x6u7v665y	\N	\N	\N	\N	\N	\N	2025-11-16 21:36:06.416	2025-11-16 21:36:06.416	2025-11-16 21:36:06.416	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{}	f	\N
cmi28jl7k000psf84we187xp4	2025-11-03 23:00:00	2025-11-04 08:00:00	2025-11-04 16:00:00	Se me olvido fichar.	PENDING	cmhi8mayd000asf8x6u7v665y	\N	\N	\N	\N	\N	\N	2025-11-16 21:36:15.393	2025-11-16 21:36:15.393	2025-11-16 21:36:15.393	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{}	f	\N
cmi28jsxv000tsf843wgjvd0k	2025-11-04 23:00:00	2025-11-05 08:00:00	2025-11-05 17:00:00	Se me olvido fichar.	PENDING	cmhi8mayd000asf8x6u7v665y	\N	\N	\N	\N	\N	\N	2025-11-16 21:36:25.411	2025-11-16 21:36:25.411	2025-11-16 21:36:25.411	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	{}	f	\N
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.messages (id, body, status, "createdAt", "editedAt", "deletedAt", "orgId", "conversationId", "senderId") FROM stdin;
cmhums3nr0001sf50h4mebeol	asdadasdas	SENT	2025-11-11 13:52:37.767	\N	2025-11-11 13:52:43.283	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhums53m0003sf501si4gdmi	asdasdasd	SENT	2025-11-11 13:52:39.635	\N	2025-11-11 13:52:43.283	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmi25zpx2002jsfsu05p9ek7z	que tal	SENT	2025-11-16 20:24:49.143	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhna64pg000vsflzbcpo2x59	hola!	SENT	2025-11-06 10:25:14.069	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhna602q000tsflzc2b75gpw	cmhkdlfqz000msfdx04z2mfi7
cmi25zsqe002lsfsutcpmh6bm	hola	SENT	2025-11-16 20:24:52.791	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtpifoo003jsfd1knfo723q	eehh	READ	2025-11-10 22:21:19.465	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtpzavm004dsfd1hljbj8qw	holaaa	READ	2025-11-10 22:34:26.387	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtpzisu004jsfd1hxhtp6km	no	READ	2025-11-10 22:34:36.655	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtpzdmb004fsfd1he4wl8a1	no	READ	2025-11-10 22:34:29.94	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtpzgpy004hsfd155wjuh66	no	READ	2025-11-10 22:34:33.958	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtqyk4i0059sfd16snfb7s4	hola	READ	2025-11-10 23:01:51.331	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtqyqv9005bsfd18xp0fz52	que tal	READ	2025-11-10 23:02:00.07	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhumv0so0005sf50h4660qza	asdadasdasds	SENT	2025-11-11 13:54:54.024	\N	2025-11-11 13:55:00.395	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhumv3150007sf50prab466j	asdasda	SENT	2025-11-11 13:54:56.922	\N	2025-11-11 13:55:00.395	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhumx0zx0009sf50p3anpjk7	Hola!	SENT	2025-11-11 13:56:27.598	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhnb648t003jsflz8gt74euv	hey	SENT	2025-11-06 10:53:13.086	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhna602q000tsflzc2b75gpw	cmhkdlfqz000msfdx04z2mfi7
cmhnb6gir003lsflzw7cael4l	hi	SENT	2025-11-06 10:53:28.995	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhna602q000tsflzc2b75gpw	cmhkdlfqz000msfdx04z2mfi7
cmi26wewc002zsfsurqdkfqif	hola	SENT	2025-11-16 20:50:14.508	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnbl6ip003psflzi9p447uo	eee	SENT	2025-11-06 11:04:55.873	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhna602q000tsflzc2b75gpw	cmhkdlfqz000msfdx04z2mfi7
cmi26yfv3003hsfsunk833jv0	asdasd	SENT	2025-11-16 20:51:49.071	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtqyzvo005fsfd19bq76w5i	asdasda	READ	2025-11-10 23:02:11.748	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtqz0u4005hsfd1njdudn27	asasdsa	READ	2025-11-10 23:02:12.988	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtqyx58005dsfd16g3e77fr	jee	READ	2025-11-10 23:02:08.204	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhuewpgx000bsfbvnylzuove	jejejej	SENT	2025-11-11 10:12:15.729	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhuewyn2000dsfbv8iwj11lk	bueno cuentame que tal	SENT	2025-11-11 10:12:27.614	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhuex0sb000fsfbvj4wnd4cs	pues nada	SENT	2025-11-11 10:12:30.395	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhufz3fs0019sfbvch9nbpo1	hola	SENT	2025-11-11 10:42:06.76	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhufzf84001bsfbvye2jshph	sadsad	SENT	2025-11-11 10:42:22.037	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhug2jlp001lsfbvevyk6gui	holaa	SENT	2025-11-11 10:44:47.677	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhug2mi4001nsfbvx062djdf	asdasd	SENT	2025-11-11 10:44:51.436	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhumx8qm000bsf509jo2keyh	que tal	SENT	2025-11-11 13:56:37.63	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmi26wkvt0031sfsu0c4g2yk7	quetal	SENT	2025-11-16 20:50:22.266	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmi26wpg00033sfsucwenjqsh	quetal	SENT	2025-11-16 20:50:28.176	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmi26wt0v0035sfsu8im0iw0x	asdad	SENT	2025-11-16 20:50:32.816	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmi26wv100037sfsu4vq3nh6i	asdasd	SENT	2025-11-16 20:50:35.413	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmi26wwxo0039sfsuc07073vb	adads	SENT	2025-11-16 20:50:37.885	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmi26wyqe003bsfsuen9k3ny5	asdasd	SENT	2025-11-16 20:50:40.215	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhugclnb0003sfitk72zdfan	hi	SENT	2025-11-11 10:52:36.888	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhugcwkt000dsfitv6eoukzn	asdasda	SENT	2025-11-11 10:52:51.053	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhugvr190005sfk68ovik56u	hi	SENT	2025-11-11 11:07:30.333	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhugvxfa000bsfk6iebho3uh	hiasdasd	SENT	2025-11-11 11:07:38.614	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhuhj6yz0005sfio0qbz6gd3	asdasdas	SENT	2025-11-11 11:25:44.076	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhujchy00003sfshga5fu70e	hoalaa	SENT	2025-11-11 12:16:30.937	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhneel1t0015sfp55f8qom5z	hola	SENT	2025-11-06 12:23:46.962	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhna602q000tsflzc2b75gpw	cmhkdlfqz000msfdx04z2mfi7
cmhnex83j001bsfp53yt7daqm	esfd	SENT	2025-11-06 12:38:16.64	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhna602q000tsflzc2b75gpw	cmhkdlfqz000msfdx04z2mfi7
cmhujcp4i000dsfsht5t4q7tf	que pasaa	SENT	2025-11-11 12:16:40.243	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmho191dl001xsfs4l7elhgk3	hola	SENT	2025-11-06 23:03:19.353	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhna602q000tsflzc2b75gpw	cmhkdlfqz000msfdx04z2mfi7
cmhujctep000fsfshdco49nb0	jaja nadaaa	SENT	2025-11-11 12:16:45.793	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhujcyh6000hsfshz0qpdkhp	asdasd	SENT	2025-11-11 12:16:52.362	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtpro33003vsfd10z18465v	hola	READ	2025-11-10 22:28:30.256	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhumygri0001sfh5khgbx9oi	bien	SENT	2025-11-11 13:57:34.686	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhumyjis0003sfh5rkgrqehr	y tu ?	SENT	2025-11-11 13:57:38.261	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhumylw50005sfh5tlyxty69	bieennn	SENT	2025-11-11 13:57:41.333	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhun12ij0007sfh5cijbutva	vale	SENT	2025-11-11 13:59:36.187	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhun1t000009sfh5pi9izgsk	hola	SENT	2025-11-11 14:00:10.513	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhun1zqq000fsfh56tmk42q4	que tal	SENT	2025-11-11 14:00:19.25	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmi26yl8o003jsfsu6wrg0pub	hola	SENT	2025-11-16 20:51:56.04	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmi26yo7c003lsfsuoyxyjzza	quetal	SENT	2025-11-16 20:51:59.881	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmi26ys1g003nsfsubnoupd8s	bien?	SENT	2025-11-16 20:52:04.853	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhn5zfjj0003sfls86yo8q9p	hola!	READ	2025-11-06 08:28:03.055	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhn60evf0007sflsgiuwy8y6	hola!	READ	2025-11-06 08:28:48.843	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhn61rzo000fsflsayjwkx23	asdasdsad	READ	2025-11-06 08:29:52.501	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhn669bl000jsfls9refdoat	hola	READ	2025-11-06 08:33:21.585	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtpp7d8003psfd1uj9hh8xw	jo	READ	2025-11-10 22:26:35.277	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtps63y003xsfd13yefppj4	quet al	READ	2025-11-10 22:28:53.615	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtpsjxl003zsfd1k0h2wkyi	hola	READ	2025-11-10 22:29:11.529	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtpsrij0041sfd1qskfrtj8	hola	READ	2025-11-10 22:29:21.355	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtq5kq3004lsfd11ufz8nyz	hiii	READ	2025-11-10 22:39:19.083	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtq5vni004nsfd1nuumw58m	hiii	READ	2025-11-10 22:39:33.246	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtq6c86004rsfd1zw1u7jht	hiii	READ	2025-11-10 22:39:54.726	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtq674i004psfd12xkx68cx	hii	READ	2025-11-10 22:39:48.114	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtr8lnv005lsfd1k2sgxx12	no	READ	2025-11-10 23:09:39.883	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtr8srm005nsfd1zrnxgp9d	si?	SENT	2025-11-10 23:09:49.09	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtr8ij3005jsfd16i5njs3d	hii	READ	2025-11-10 23:09:35.824	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtr8uwt005psfd16ml51oic	si?	READ	2025-11-10 23:09:51.87	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhuev4ko0001sfbv97gyqbjo	hola	SENT	2025-11-11 10:11:01.992	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhuev85z0003sfbve3r7645p	jeje	SENT	2025-11-11 10:11:06.647	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhufveir000zsfbvx4p6tw21	kiya!!	SENT	2025-11-11 10:39:14.5	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhug1iup001dsfbvmqgumv7o	adssdsa	SENT	2025-11-11 10:44:00.049	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhug1km1001fsfbv6ojgvw4e	asdasd	SENT	2025-11-11 10:44:02.329	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhug1veu001hsfbv1ks0mz5l	hoolaaa	SENT	2025-11-11 10:44:16.327	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhug338x001psfbvqalqfve6	holaa	SENT	2025-11-11 10:45:13.137	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhug35es001rsfbvi0jaykdz	holaa	SENT	2025-11-11 10:45:15.94	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhugco8i0005sfits9pn8lvp	hiii	SENT	2025-11-11 10:52:40.243	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhugcs1p0007sfitef2ts4ax	que tal??	SENT	2025-11-11 10:52:45.182	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhugw563000hsfk61ydcy0j0	asdadasd	SENT	2025-11-11 11:07:48.651	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhugwdmm000jsfk62b8rxi9d	asadsdas	SENT	2025-11-11 11:07:59.614	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhn61ftg000dsfls1vrhx1fd	que tal?	READ	2025-11-06 08:29:36.724	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhn62f60000hsflsccuo1yzz	hola	READ	2025-11-06 08:30:22.537	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhna8vjz000xsflznfzm6e9p	hi	READ	2025-11-06 10:27:22.176	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb3idr000zsflzqk1smx67	hola	READ	2025-11-06 10:51:11.439	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb3qgp0011sflzjtib7mm2	asdasdasd	READ	2025-11-06 10:51:21.914	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb3sum0013sflz35ic3izg	asdasd	READ	2025-11-06 10:51:25.007	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb3u1e0015sflzfvhsipqi	asdasdsa	READ	2025-11-06 10:51:26.546	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb3vtr0017sflzip6ws2rm	asdasdasdasd	READ	2025-11-06 10:51:28.864	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb3xpd0019sflzvbdbl0y7	asdasdasd	READ	2025-11-06 10:51:31.297	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhuhjbo40007sfiof057187h	asdasdsa	SENT	2025-11-11 11:25:50.164	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhuk6kil001zsfshtq45pqbx	asdasd	SENT	2025-11-11 12:39:53.949	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtq9tke004tsfd1vu8l94ww	adasd	READ	2025-11-10 22:42:37.167	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhubnhuz005rsfd11n1epi99	hola	SENT	2025-11-11 08:41:07.115	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhubnlnt005tsfd1uov5nn1y	asda	SENT	2025-11-11 08:41:12.041	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhubnq8m005vsfd1fikld6py	ajsdads	SENT	2025-11-11 08:41:17.974	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhuewkfy0009sfbv78ffvmgr	valee	SENT	2025-11-11 10:12:09.214	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhufvrcp0015sfbvktfnhe2b	asad	SENT	2025-11-11 10:39:31.13	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhufvxob0017sfbvi439eo1h	jejej	SENT	2025-11-11 10:39:39.323	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhug20vp001jsfbvwqzwbfyi	asdasd	SENT	2025-11-11 10:44:23.413	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhug56250001sfitliudz0ac	asdasd	SENT	2025-11-11 10:46:50.094	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhugdcor000nsfit43b0wy1b	asdasdasd	SENT	2025-11-11 10:53:11.931	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhuh4pub000tsfk6mgrob1kc	zczds	SENT	2025-11-11 11:14:28.692	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhuhjihf000dsfiotcpcy3a3	ejejej	SENT	2025-11-11 11:25:58.995	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhuhju8g000fsfioe9a8x1pa	jejeje	SENT	2025-11-11 11:26:14.224	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhukgt820005sfb1i442gn4a	Hola	SENT	2025-11-11 12:47:51.795	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb49lz001bsflzfzsms1og	asdadas	READ	2025-11-06 10:51:46.727	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhncn4sj0007sfsdmq14qct5	hola	READ	2025-11-06 11:34:26.563	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhoocsml0007sfl9w1b7oj4o	hola	READ	2025-11-07 09:50:05.806	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhoodo8i0009sfl95p7qg0kf	holaaa	READ	2025-11-07 09:50:46.77	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhopew83000lsfl9fjn37n6x	hola1	READ	2025-11-07 10:19:43.395	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtd0pvh000dsfd1fvks3vfx	Hola Jose Francisco.	READ	2025-11-10 16:31:37.469	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtfengw000vsfd1a634sowd	Probando SSR!	READ	2025-11-10 17:38:26.768	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtoh8vf002xsfd1kt9vl25h	hola	READ	2025-11-10 21:52:24.364	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhnb4b0m001dsflznhtcivrz	2313	READ	2025-11-06 10:51:48.55	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4cma001fsflzqk13vxia	123123	READ	2025-11-06 10:51:50.627	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4e3v001hsflz5u34acq0	12321313	READ	2025-11-06 10:51:52.556	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4f5c001jsflz0bwup0q4	12312312	READ	2025-11-06 10:51:53.905	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4g8g001lsflznoct46ni	12312312	READ	2025-11-06 10:51:55.313	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4had001nsflzrmlbc0vc	123123123	READ	2025-11-06 10:51:56.678	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4idp001psflzkp55nu8k	1231231	READ	2025-11-06 10:51:58.093	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4jje001rsflzksalo6ud	213123123	READ	2025-11-06 10:51:59.595	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4kks001tsflzc6gcoh6x	123123123	READ	2025-11-06 10:52:00.94	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4llc001vsflzx90ntv22	123123123	READ	2025-11-06 10:52:02.257	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4mov001xsflz81q98v6n	213123123	READ	2025-11-06 10:52:03.68	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4nuv001zsflzf8jkas60	123123123	READ	2025-11-06 10:52:05.191	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4p0z0021sflz80bodmni	123123123	READ	2025-11-06 10:52:06.708	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4qio0023sflzb3pyg34u	123123123	READ	2025-11-06 10:52:08.64	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4u0k0025sflz5xpgkiq7	213123123123	READ	2025-11-06 10:52:13.172	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4v280027sflz46i22y15	123123213	READ	2025-11-06 10:52:14.528	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4w3i0029sflz0wbtrja9	123123123123	READ	2025-11-06 10:52:15.87	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4xpu002bsflz8osbbm2h	213123123123	READ	2025-11-06 10:52:17.971	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb4z81002dsflzthyeppts	213123123123	READ	2025-11-06 10:52:19.921	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb50j5002fsflzkmvbuvhc	13212312312312	READ	2025-11-06 10:52:21.617	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb521y002hsflz3wlhzf89	12313123123	READ	2025-11-06 10:52:23.59	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb544d002jsflz20h1w7sv	1231231231231	READ	2025-11-06 10:52:26.269	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb55cl002lsflzub7upr7y	123123123123	READ	2025-11-06 10:52:27.862	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5712002nsflzcj809gm9	1231231231231	READ	2025-11-06 10:52:30.038	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5pa7003dsflzs7uc2i1a	213131231	READ	2025-11-06 10:52:53.696	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb58kn002psflzytibjopg	213131231231	READ	2025-11-06 10:52:32.04	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb59yx002rsflzifemb4j5	123123123123	READ	2025-11-06 10:52:33.849	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5bb9002tsflzg3kqhd4x	21312312312	READ	2025-11-06 10:52:35.59	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5cla002vsflz9s0mm0t2	123123123123	READ	2025-11-06 10:52:37.247	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5dwp002xsflz58l6kjs4	123123123123	READ	2025-11-06 10:52:38.953	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5f5z002zsflzmnowu7kg	123123123	READ	2025-11-06 10:52:40.583	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5in90031sflzd7ejqw3w	123213123	READ	2025-11-06 10:52:45.094	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5jlr0033sflzjxyub3sq	12312312	READ	2025-11-06 10:52:46.335	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5kma0035sflz4w9v7a0a	123123123	READ	2025-11-06 10:52:47.651	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5lnr0037sflzwu5hhuht	213123123	READ	2025-11-06 10:52:49	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5mvl0039sflz9ea5ifnr	1231231231	READ	2025-11-06 10:52:50.577	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5o29003bsflzaxfm3dm1	123123123123	READ	2025-11-06 10:52:52.113	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5qhp003fsflzrqvpndf1	123123123	READ	2025-11-06 10:52:55.262	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnb5rq4003hsflzscqlvxva	213123123213	READ	2025-11-06 10:52:56.861	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnbl0dq003nsflzzr8qrvvm	hola	READ	2025-11-06 11:04:47.918	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnbq7ip003rsflzgquchdr4	jbj	READ	2025-11-06 11:08:50.45	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnbqcl9003tsflz1ov79tzg	holaaaa	READ	2025-11-06 11:08:57.021	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnc0nrg003vsflzrvjimw4t	Buenas tardes, necesitamos que vengas a la tienda, para probar unas cositas.	READ	2025-11-06 11:16:58.06	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhncmqh80003sfsdjq926zb4	hola	READ	2025-11-06 11:34:08.012	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhncn0t60005sfsd848lozfl	asdadasd	READ	2025-11-06 11:34:21.402	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhncrd9t0001sf5an5gsmk8t	hola	READ	2025-11-06 11:37:44.177	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhndg9q70005sflanrpx6cdz	hola!	READ	2025-11-06 11:57:05.984	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhnexa41001dsfp5ljfmaghu	sdfsdf	READ	2025-11-06 12:38:19.25	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtpfpvt003bsfd1mc7thlsf	hola	READ	2025-11-10 22:19:12.713	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtpi7sl003dsfd16bjjiwy1	hoa	READ	2025-11-10 22:21:09.238	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtpt41w0043sfd1rjsmp07r	hola	READ	2025-11-10 22:29:37.605	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtpt70n0045sfd18mo06r9j	asdasd	READ	2025-11-10 22:29:41.447	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtptgxj0049sfd1l6tb5wbe	jasajsajd	READ	2025-11-10 22:29:54.295	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhtptbx40047sfd1kbsreamb	jeje	READ	2025-11-10 22:29:47.801	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtptuvb004bsfd1g5n43zwi	HOLA	READ	2025-11-10 22:30:12.36	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtqa18r004xsfd1p46ppnvt	asdasd	READ	2025-11-10 22:42:47.115	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhtq9xso004vsfd11b928rno	jasdsad	READ	2025-11-10 22:42:42.648	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmhubpvff0001sf4mumv4vc05	asdasd	SENT	2025-11-11 08:42:58.011	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhubq2070003sf4m8kvsy0s1	asdadsa	SENT	2025-11-11 08:43:06.535	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmhubq33s0005sf4msnv6qw1q	asdasd	SENT	2025-11-11 08:43:07.961	\N	2025-11-11 13:50:00.817	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhkdlfqz000msfdx04z2mfi7
cmi25zj9t002hsfsuk7qx3nrf	hola!	SENT	2025-11-16 20:24:40.529	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
cmi2aboeu001hsf84lc9kyt3j	hola	SENT	2025-11-16 22:26:05.527	\N	\N	cmhi8mawd0000sf8xishgn0j2	cmhn5z6f80001sfls10sb0z24	cmhi8mayd000asf8x6u7v665y
\.


--
-- Data for Name: organization_pto_config; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.organization_pto_config (id, "orgId", "maternityLeaveWeeks", "paternityLeaveWeeks", "seniorityRules", "allowNegativeBalance", "maxAdvanceRequestMonths", "createdAt", "updatedAt") FROM stdin;
cmhxaeh1p0001sfqkk1o3ksky	cmhxacerz0014sfcr0oks8l2b	16	16	[{"yearsTo": 10, "extraDays": 2, "yearsFrom": 5}, {"yearsTo": null, "extraDays": 4, "yearsFrom": 10}]	f	12	2025-11-13 10:29:25.068	2025-11-13 10:29:25.068
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.organizations (id, name, vat, active, "createdAt", "updatedAt", "annualPtoDays", "ptoAccrualStartDate", "ptoCalculationMethod", "hierarchyType", "allowedEmailDomains", "employeeNumberCounter", "employeeNumberPrefix", "geolocationEnabled", "geolocationMaxRadius", "geolocationMinAccuracy", "geolocationRequired", features, "chatEnabled", "shiftsEnabled") FROM stdin;
cmhkdipy5000isfdxch3dbn7p	Timenow	B0203403	t	2025-11-04 09:35:41.79	2025-11-06 08:49:55.782	23	CONTRACT_START	PROPORTIONAL	HIERARCHICAL	{timenow.cloud}	0	TMNW	t	200	100	f	{"chat": true}	t	f
cmhi8mawd0000sf8xishgn0j2	Demo Company S.L.	B12345678	t	2025-11-02 21:42:58.478	2025-11-16 21:25:36.27	23	CONTRACT_START	PROPORTIONAL	DEPARTMENTAL	{}	13	\N	t	200	100	f	{"chat": true}	t	t
cmhxacerz0014sfcr0oks8l2b	TEST	B0000001	t	2025-11-13 10:27:48.815	2025-11-13 10:27:48.815	23	CONTRACT_START	PROPORTIONAL	DEPARTMENTAL	{test.com}	0	TST	f	200	100	f	{}	f	f
\.


--
-- Data for Name: policy_snapshots; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.policy_snapshots (id, "mileageRateEurPerKm", "mealDailyLimit", "fuelRequiresReceipt", "vatAllowed", "costCenterRequired", "expenseId") FROM stdin;
cmhj1eqqc000zsf67ck5pucpe	0.260	30.00	t	t	f	cmhj1eqq7000xsf67cain9lmn
cmhj7rvrp000psftcyp52ewhy	0.260	30.00	t	t	f	cmhj7rvrc000nsftcu2u1u24w
cmhja1h7u000vsftc7ur0vee1	0.260	30.00	t	t	f	cmhja1h7k000tsftc5x1p9ans
cmhja8c620003sfilxcmp602n	0.260	30.00	t	t	f	cmhja8c5u0001sfil9rijjv77
cmhjaaij1000hsfilcyycw7ds	0.260	30.00	t	t	f	cmhjaaiiv000fsfilsda29mjf
cmhjc1w7h0007sftbwa9imasc	0.260	30.00	t	t	f	cmhjc1w790005sftbnxb0pn4o
cmhjjfsbm000rsftbjs74hocj	0.260	30.00	t	t	f	cmhjjfsbc000psftbq8oaxz1m
cmhjqim3o0009sfdxay29llpb	0.260	30.00	t	t	f	cmhjqim3h0007sfdx2j83wzaf
cmhkdom3i0012sfdx6x889eo3	0.260	30.00	t	t	f	cmhkdom380010sfdxd5m8vpo3
cmhktlyb60059sfrkcndug7hx	0.260	30.00	t	t	f	cmhktly8q0057sfrk2tajlk03
cmhly1sne004jsf710ggpwqjz	0.260	30.00	t	t	f	cmhly1sn3004hsf71skgqdusy
cmhv3s33v009hsfap4knpdi8x	0.260	30.00	t	t	f	cmhv3s33g009fsfap29l36on9
cmi1xoznp000rsfsukdufyhjm	0.260	30.00	t	t	f	cmi1xoznd000psfsu0dknaj1s
\.


--
-- Data for Name: position_levels; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.position_levels (id, name, code, "order", description, "minSalary", "maxSalary", active, "createdAt", "updatedAt", "orgId") FROM stdin;
cmhv5f5k000c5sfap0b4muz1g	Junior	JR	1	Junior	20000.00	30000.00	t	2025-11-11 22:34:26.4	2025-11-11 22:34:26.4	cmhi8mawd0000sf8xishgn0j2
cmhv5emye00c3sfapksmk7gbm	Trainee	TRI	4	Trainee	10000.00	10000.00	t	2025-11-11 22:34:02.293	2025-11-16 10:44:38.726	cmhi8mawd0000sf8xishgn0j2
cmhxaeh1x0003sfqkhg6lqvwu	Trainee	\N	1	En formación / prácticas	\N	\N	t	2025-11-13 10:29:25.077	2025-11-13 10:29:25.077	cmhxacerz0014sfcr0oks8l2b
cmhxaeh220005sfqkumd91k33	Junior	\N	2	Nivel inicial / 0-2 años experiencia	\N	\N	t	2025-11-13 10:29:25.082	2025-11-13 10:29:25.082	cmhxacerz0014sfcr0oks8l2b
cmhxaeh240007sfqk36wm6xjf	Mid	\N	3	Nivel intermedio / 2-4 años experiencia	\N	\N	t	2025-11-13 10:29:25.085	2025-11-13 10:29:25.085	cmhxacerz0014sfcr0oks8l2b
cmhxaeh270009sfqkjztz044b	Senior	\N	4	Nivel avanzado / 4+ años experiencia	\N	\N	t	2025-11-13 10:29:25.087	2025-11-13 10:29:25.087	cmhxacerz0014sfcr0oks8l2b
cmhxaeh29000bsfqkeyywhjxf	Lead	\N	5	Líder técnico / referente del equipo	\N	\N	t	2025-11-13 10:29:25.09	2025-11-13 10:29:25.09	cmhxacerz0014sfcr0oks8l2b
cmhxaeh2c000dsfqk6w559208	Principal	\N	6	Arquitecto / experto del dominio	\N	\N	t	2025-11-13 10:29:25.093	2025-11-13 10:29:25.093	cmhxacerz0014sfcr0oks8l2b
cmhxaeh2f000fsfqkmvbgfful	Director	\N	7	Director / responsable de área	\N	\N	t	2025-11-13 10:29:25.095	2025-11-13 10:29:25.095	cmhxacerz0014sfcr0oks8l2b
cmi1l8ko40007sf3l1ag3bzen	Junior 2	JR2	2	Junior 2	10000.00	120000.00	t	2025-11-16 10:43:50.309	2025-11-16 10:43:50.309	cmhi8mawd0000sf8xishgn0j2
cmi1l9m180009sf3l01uuwntx	Junior 3	JR3	3	Test	10000.00	100000.00	t	2025-11-16 10:44:38.732	2025-11-16 10:44:38.732	cmhi8mawd0000sf8xishgn0j2
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.positions (id, title, description, active, "createdAt", "updatedAt", "orgId", "levelId") FROM stdin;
cmhxaeh5g003fsfqkg32590tp	Agente de Atención al Cliente	Soporte y atención	t	2025-11-13 10:29:25.204	2025-11-13 10:29:25.204	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh2o000jsfqk8y7bt0jk	Director/a General	Dirección ejecutiva de la compañía	t	2025-11-13 10:29:25.104	2025-11-13 10:29:25.104	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh2s000lsfqkxuhbocx7	Director/a de Operaciones	Gestión de operaciones y procesos	t	2025-11-13 10:29:25.109	2025-11-13 10:29:25.109	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh2v000nsfqkjd83ybcw	Asistente de Dirección	Soporte administrativo a dirección	t	2025-11-13 10:29:25.112	2025-11-13 10:29:25.112	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh30000rsfqkhp8appav	Director/a de RRHH	Dirección del departamento de personas	t	2025-11-13 10:29:25.116	2025-11-13 10:29:25.116	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh32000tsfqk0l4f1pft	Responsable de Selección	Reclutamiento y selección de personal	t	2025-11-13 10:29:25.118	2025-11-13 10:29:25.118	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh34000vsfqkere0eba7	Técnico/a de RRHH	Gestión administrativa de personal	t	2025-11-13 10:29:25.12	2025-11-13 10:29:25.12	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh35000xsfqklpatzsde	Técnico/a de Formación	Desarrollo y formación de empleados	t	2025-11-13 10:29:25.121	2025-11-13 10:29:25.121	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh380011sfqkqc8s06dy	Director/a Financiero/a (CFO)	Dirección financiera de la empresa	t	2025-11-13 10:29:25.124	2025-11-13 10:29:25.124	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh390013sfqkio06ytzw	Controller Financiero/a	Control de gestión y reporting	t	2025-11-13 10:29:25.126	2025-11-13 10:29:25.126	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3b0015sfqk4nn4emj0	Responsable de Contabilidad	Gestión contable y fiscal	t	2025-11-13 10:29:25.127	2025-11-13 10:29:25.127	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3c0017sfqkqgc19424	Administrativo/a Contable	Tareas administrativas y contables	t	2025-11-13 10:29:25.129	2025-11-13 10:29:25.129	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3e0019sfqkzm51jon9	Tesorero/a	Gestión de tesorería y pagos	t	2025-11-13 10:29:25.131	2025-11-13 10:29:25.131	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3h001dsfqk9em0q6zz	Director/a Comercial	Dirección del área comercial	t	2025-11-13 10:29:25.134	2025-11-13 10:29:25.134	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3j001fsfqk0ruiauqa	Responsable de Ventas	Gestión del equipo de ventas	t	2025-11-13 10:29:25.135	2025-11-13 10:29:25.135	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3k001hsfqk81c4w39a	Key Account Manager	Gestión de cuentas clave	t	2025-11-13 10:29:25.137	2025-11-13 10:29:25.137	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3m001jsfqkrfcymv66	Comercial	Venta y captación de clientes	t	2025-11-13 10:29:25.139	2025-11-13 10:29:25.139	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3p001lsfqktgfaajpt	Inside Sales	Ventas internas y seguimiento	t	2025-11-13 10:29:25.141	2025-11-13 10:29:25.141	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3t001psfqkk2rdrunq	Director/a de Marketing	Dirección de estrategia de marketing	t	2025-11-13 10:29:25.146	2025-11-13 10:29:25.146	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3v001rsfqk0w8ohf24	Responsable de Marketing Digital	Gestión de canales digitales	t	2025-11-13 10:29:25.147	2025-11-13 10:29:25.147	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3w001tsfqk3faqeci8	Community Manager	Gestión de redes sociales	t	2025-11-13 10:29:25.149	2025-11-13 10:29:25.149	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3y001vsfqktyo6wmj3	Diseñador/a Gráfico/a	Diseño y creatividad	t	2025-11-13 10:29:25.15	2025-11-13 10:29:25.15	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh3z001xsfqkrpdch6t2	Responsable de Comunicación	Comunicación interna y externa	t	2025-11-13 10:29:25.152	2025-11-13 10:29:25.152	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh430021sfqk7p5gd87e	CTO / Director/a de Tecnología	Dirección tecnológica	t	2025-11-13 10:29:25.155	2025-11-13 10:29:25.155	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh460023sfqkk8gh3roo	Responsable de Sistemas	Gestión de infraestructura IT	t	2025-11-13 10:29:25.159	2025-11-13 10:29:25.159	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh490025sfqk2wuzzjti	Desarrollador/a Senior	Desarrollo de software senior	t	2025-11-13 10:29:25.161	2025-11-13 10:29:25.161	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4c0027sfqk5hyt3xab	Desarrollador/a	Desarrollo de software	t	2025-11-13 10:29:25.164	2025-11-13 10:29:25.164	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4e0029sfqkue59txld	Desarrollador/a Junior	Desarrollo de software junior	t	2025-11-13 10:29:25.166	2025-11-13 10:29:25.166	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4g002bsfqks36shr6g	DevOps Engineer	Operaciones y despliegue	t	2025-11-13 10:29:25.168	2025-11-13 10:29:25.168	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4i002dsfqkkx3r0i9v	Analista de Datos	Análisis y Business Intelligence	t	2025-11-13 10:29:25.17	2025-11-13 10:29:25.17	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4j002fsfqko8jr2g6n	Soporte Técnico	Soporte a usuarios	t	2025-11-13 10:29:25.172	2025-11-13 10:29:25.172	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4n002jsfqkfsyk22xy	Director/a de Producción	Dirección de operaciones productivas	t	2025-11-13 10:29:25.175	2025-11-13 10:29:25.175	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4p002lsfqkn09cwf5d	Responsable de Planta	Gestión de planta de producción	t	2025-11-13 10:29:25.177	2025-11-13 10:29:25.177	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4r002nsfqkkwurzbyl	Jefe/a de Turno	Coordinación de turno de producción	t	2025-11-13 10:29:25.179	2025-11-13 10:29:25.179	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4t002psfqkl45kioy7	Operario/a de Producción	Operaciones en planta	t	2025-11-13 10:29:25.181	2025-11-13 10:29:25.181	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4v002rsfqk7d2kmw35	Técnico/a de Mantenimiento	Mantenimiento de equipos	t	2025-11-13 10:29:25.183	2025-11-13 10:29:25.183	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh4z002vsfqk1e4kz742	Responsable de Calidad	Gestión del sistema de calidad	t	2025-11-13 10:29:25.187	2025-11-13 10:29:25.187	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh51002xsfqkuczwz7rd	Técnico/a de Calidad	Control y auditoría de calidad	t	2025-11-13 10:29:25.189	2025-11-13 10:29:25.189	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh53002zsfqk1r3j1vcn	Inspector/a de Calidad	Inspección de productos	t	2025-11-13 10:29:25.191	2025-11-13 10:29:25.191	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh570033sfqk9rrbmh45	Responsable de Logística	Gestión de cadena de suministro	t	2025-11-13 10:29:25.195	2025-11-13 10:29:25.195	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh580035sfqkcn4pinnn	Jefe/a de Almacén	Gestión de almacén	t	2025-11-13 10:29:25.197	2025-11-13 10:29:25.197	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh5a0037sfqkcm3lvmj5	Mozo/a de Almacén	Operaciones de almacén	t	2025-11-13 10:29:25.198	2025-11-13 10:29:25.198	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh5b0039sfqk425proe2	Responsable de Compras	Gestión de compras y proveedores	t	2025-11-13 10:29:25.2	2025-11-13 10:29:25.2	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh5e003dsfqku7qgrrgp	Responsable de Atención al Cliente	Gestión del servicio al cliente	t	2025-11-13 10:29:25.203	2025-11-13 10:29:25.203	cmhxacerz0014sfcr0oks8l2b	\N
cmhxaeh5i003hsfqk3jkhzgw1	Técnico/a de Soporte	Soporte técnico a clientes	t	2025-11-13 10:29:25.206	2025-11-13 10:29:25.206	cmhxacerz0014sfcr0oks8l2b	\N
cmhi8mayi000usf8xttge9o6i	Generalista RRHH	Gestión integral de recursos humanos	t	2025-11-02 21:42:58.555	2025-11-02 21:42:58.555	cmhi8mawd0000sf8xishgn0j2	\N
cmhi8mayi000ysf8xoaor4rrp	Desarrollador Full Stack	Desarrollo web y aplicaciones	t	2025-11-02 21:42:58.555	2025-11-02 21:42:58.555	cmhi8mawd0000sf8xishgn0j2	\N
cmhi8mayi000vsf8x3juudrlv	Coordinador de Operaciones	Coordinación de procesos operativos	t	2025-11-02 21:42:58.555	2025-11-02 21:42:58.555	cmhi8mawd0000sf8xishgn0j2	\N
cmhi8mayj0010sf8xlp0im9xc	Analista Junior	Análisis de datos y reportes	t	2025-11-02 21:42:58.555	2025-11-02 21:42:58.555	cmhi8mawd0000sf8xishgn0j2	\N
cmhi8mayi000wsf8x97nozurx	Contable Senior	Contabilidad y finanzas corporativas	t	2025-11-02 21:42:58.555	2025-11-02 21:42:58.555	cmhi8mawd0000sf8xishgn0j2	\N
\.


--
-- Data for Name: pto_balance_adjustments; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.pto_balance_adjustments (id, "adjustmentType", "daysAdjusted", reason, notes, "createdAt", "createdById", "orgId", "ptoBalanceId") FROM stdin;
cmi2a2tlk001bsf84tjbbooqr	COLLECTIVE_AGREEMENT	5.00	Días por matrimonio	Matrimonio	2025-11-16 22:19:12.344	cmhi8mayd000asf8x6u7v665y	cmhi8mawd0000sf8xishgn0j2	cmi0f7rlv0021sfn0k4y76ezc
\.


--
-- Data for Name: pto_balances; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.pto_balances (id, year, "annualAllowance", "daysUsed", "daysPending", "daysAvailable", "calculationDate", "contractStartDate", notes, "createdAt", "updatedAt", "orgId", "employeeId") FROM stdin;
cmhkdo613000wsfdxircrfxb1	2025	3.50	1.00	0.00	2.50	2025-11-16 20:51:45.92	2025-11-04 00:00:00	\N	2025-11-04 09:39:55.911	2025-11-16 20:51:45.921	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi
cmi0f7rlv0021sfn0k4y76ezc	2025	8.00	0.00	0.00	8.00	2025-11-16 22:19:12.362	2025-11-15 00:00:00	\N	2025-11-15 15:07:28.771	2025-11-16 22:19:12.363	cmhi8mawd0000sf8xishgn0j2	cmi0f3yke001xsfn02e2xbe6n
cmhiaroyz005fsfh4zhs6ce6e	2025	23.00	1.00	0.00	22.00	2025-11-17 09:21:08.589	2023-01-10 00:00:00	\N	2025-11-02 22:43:09.226	2025-11-17 09:21:08.59	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t
cmi07c8n6000bsfn0lpbuhdbm	2025	3.00	0.00	0.00	3.00	2025-11-15 13:13:01.71	2025-11-15 00:00:00	\N	2025-11-15 11:27:00.546	2025-11-15 13:13:01.71	cmhi8mawd0000sf8xishgn0j2	cmi07b9cg0007sfn047tthicr
\.


--
-- Data for Name: pto_notifications; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.pto_notifications (id, type, title, message, "isRead", "ptoRequestId", "createdAt", "orgId", "userId", "manualTimeEntryRequestId", "expenseId") FROM stdin;
cmi2a2tm4001fsf84q6gh596e	SYSTEM_ANNOUNCEMENT	Ajuste en tu balance de vacaciones	Se ha añadido 5 día(s) a tu balance. Motivo: Días por matrimonio	f	\N	2025-11-16 22:19:12.364	cmhi8mawd0000sf8xishgn0j2	cmi0f3yk1001tsfn0fov3jeso	\N	\N
cmhkpwxoq0027sfrkqnr2v8qo	SIGNATURE_PENDING	Nuevo documento para firmar	Tienes un nuevo documento para firmar: "Contrato 2026". Vence en 7 días.	t	\N	2025-11-04 15:22:40.395	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	\N	\N
cmhjaa64p000dsfilj7rnre45	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 59.96€ para aprobación	t	\N	2025-11-03 15:17:17.833	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhkpxgdl002bsfrkw4siiqzy	SIGNATURE_COMPLETED	Documento completamente firmado	El documento "Contrato 2026" ha sido firmado por todos los firmantes.	f	\N	2025-11-04 15:23:04.617	cmhi8mawd0000sf8xishgn0j2	cmhi8may30002sf8x7xpdi79e	\N	\N
cmhkpxgdl002dsfrkgpvjxx68	SIGNATURE_COMPLETED	Documento completamente firmado	El documento "Contrato 2026" ha sido firmado por todos los firmantes.	f	\N	2025-11-04 15:23:04.617	cmhi8mawd0000sf8xishgn0j2	cmhi8mayb0006sf8xx13jtzu4	\N	\N
cmhkpxgdm002fsfrkai9kcbai	SIGNATURE_COMPLETED	Documento completamente firmado	El documento "Contrato 2026" ha sido firmado por todos los firmantes.	t	\N	2025-11-04 15:23:04.617	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhjaaj67000nsfilxmzg6zk6	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 49.55€ para aprobación	t	\N	2025-11-03 15:17:34.735	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhnufxkw000dsfvjxy9fz912	PTO_SUBMITTED	Nueva solicitud de vacaciones	Jose Francisco Parra ha solicitado 1 días de Vacaciones	t	cmhnufxkd0009sfvjq880j9um	2025-11-06 19:52:43.713	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhjc27sz000fsftb4faxv5c2	EXPENSE_APPROVED	Gasto aprobado	Tu gasto de 49.55€ ha sido aprobado	t	\N	2025-11-03 16:07:05.987	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhjc1w790005sftbnxb0pn4o
cmhjbwg830001sftbrtp7o0gw	EXPENSE_REJECTED	Gasto rechazado	Tu gasto de 59.96€ ha sido rechazado: NO!	t	\N	2025-11-03 16:02:36.96	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhja8c5u0001sfil9rijjv77
cmhjbz0yh0003sftbgl79r94z	EXPENSE_APPROVED	Gasto aprobado	Tu gasto de 49.55€ ha sido aprobado	t	\N	2025-11-03 16:04:37.146	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhjaaiiv000fsfilsda29mjf
cmhjc1ym6000dsftb3kf4wml7	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 49.55€ para aprobación	t	\N	2025-11-03 16:06:54.078	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhly3jzu0057sf71c8ce0bwm	SIGNATURE_COMPLETED	Documento completamente firmado	El documento "Contrato" ha sido firmado por todos los firmantes.	t	\N	2025-11-05 11:59:32.346	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhjm6ly0000zsftb02irlscr	EXPENSE_REJECTED	Gasto rechazado	Tu gasto de 49.55€ ha sido rechazado: -no	t	\N	2025-11-03 20:50:27.095	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhjjfsbc000psftbq8oaxz1m
cmhjjft2n000xsftbmov2ue0n	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 49.55€ para aprobación	t	\N	2025-11-03 19:33:37.387	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhjqiozq000fsfdxx0sffkv3	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 59.9€ para aprobación	t	\N	2025-11-03 22:51:49.381	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhkdomwj0018sfdxzz51xfgr	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Jose Francisco Parra ha enviado un gasto de 10.4€ para aprobación	t	\N	2025-11-04 09:40:17.779	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhjqj1u5000hsfdxlwyqxh52	EXPENSE_APPROVED	Gasto aprobado	Tu gasto de 59.9€ ha sido aprobado	t	\N	2025-11-03 22:52:06.029	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhjqim3h0007sfdx2j83wzaf
cmhkdqhdd001esfdxgwjbnh9e	EXPENSE_APPROVED	Gasto aprobado	Tu gasto de 10.4€ ha sido aprobado	t	\N	2025-11-04 09:41:43.921	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	\N	cmhkdom380010sfdxd5m8vpo3
cmhkt9ij9004tsfrkxik986rd	SIGNATURE_COMPLETED	Documento completamente firmado	El documento "Contrato 2026" ha sido firmado por todos los firmantes.	f	\N	2025-11-04 16:56:26.133	cmhi8mawd0000sf8xishgn0j2	cmhi8may30002sf8x7xpdi79e	\N	\N
cmhkt9ijc004vsfrkp4bhpnai	SIGNATURE_COMPLETED	Documento completamente firmado	El documento "Contrato 2026" ha sido firmado por todos los firmantes.	f	\N	2025-11-04 16:56:26.133	cmhi8mawd0000sf8xishgn0j2	cmhi8mayb0006sf8xx13jtzu4	\N	\N
cmhkt841e004psfrkyjo3lxo8	SIGNATURE_PENDING	Nuevo documento para firmar	Tienes un nuevo documento para firmar: "Contrato 2026". Vence en 7 días.	t	\N	2025-11-04 16:55:20.689	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	\N	\N
cmhkt9ijg004xsfrkm62mn5uz	SIGNATURE_COMPLETED	Documento completamente firmado	El documento "Contrato 2026" ha sido firmado por todos los firmantes.	t	\N	2025-11-04 16:56:26.133	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhktm2pv005fsfrkntx2x7bw	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 49.55€ para aprobación	t	\N	2025-11-04 17:06:12.161	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhktna6x005hsfrkdqhy6krm	EXPENSE_APPROVED	Gasto aprobado	Tu gasto de 49.55€ ha sido aprobado	t	\N	2025-11-04 17:07:08.501	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhktly8q0057sfrk2tajlk03
cmhly028d003psf71hvyjkpd5	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 23/10/2025	t	\N	2025-11-05 11:56:49.357	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhly0281003nsf71c1wikq2n	\N
cmhly0qup0049sf718zuixxcl	PTO_SUBMITTED	Nueva solicitud de vacaciones	Ana García ha solicitado 1 días de Vacaciones	t	cmhly0qu50045sf718a7xwl1i	2025-11-05 11:57:21.266	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhly0ery003xsf71bd2nae0o	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 23/10/2025 ha sido aprobada	t	\N	2025-11-05 11:57:05.614	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhly0281003nsf71c1wikq2n	\N
cmhly3jzu0056sf71183rc8qv	SIGNATURE_COMPLETED	Documento completamente firmado	El documento "Contrato" ha sido firmado por todos los firmantes.	f	\N	2025-11-05 11:59:32.346	cmhi8mawd0000sf8xishgn0j2	cmhi8may30002sf8x7xpdi79e	\N	\N
cmhly12fx004fsf71v9w7it00	PTO_APPROVED	Solicitud aprobada	Tu solicitud de Vacaciones ha sido aprobada	t	cmhly0qu50045sf718a7xwl1i	2025-11-05 11:57:36.286	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhly2zh40051sf71hzb67qxe	SIGNATURE_PENDING	Nuevo documento para firmar	Tienes un nuevo documento para firmar: "Contrato". Vence en 7 días.	t	\N	2025-11-05 11:59:05.752	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhly1v1l004psf71q48aeupr	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 10.4€ para aprobación	t	\N	2025-11-05 11:58:13.353	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhly23yy004rsf71n0nhcsfd	EXPENSE_APPROVED	Gasto aprobado	Tu gasto de 10.4€ ha sido aprobado	t	\N	2025-11-05 11:58:24.922	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhly1sn3004hsf71skgqdusy
cmhp01ci00041sfl90wep1jcg	PTO_APPROVED	Solicitud aprobada	Tu solicitud de Vacaciones ha sido aprobada	t	cmhnufxkd0009sfvjq880j9um	2025-11-07 15:17:07.081	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	\N	\N
cmhurrv090011sfz9vfmqrykl	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 10/11/2025	t	\N	2025-11-11 16:12:24.633	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhurrv02000zsfz96d0htor4	\N
cmhurs6jj0019sfz9xc4wn4pk	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 10/11/2025 ha sido aprobada	t	\N	2025-11-11 16:12:39.583	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhurrv02000zsfz96d0htor4	\N
cmi30kd73000dsfea5t3j9e2s	DOCUMENT_UPLOADED	Nuevo documento: Nómina	Ana García Rodríguez ha subido un documento de tipo Nómina a tu perfil.	t	\N	2025-11-17 10:40:40.912	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	\N	\N
cmhusv47m0009sfapypqr49kz	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 10/11/2025	t	\N	2025-11-11 16:42:56.146	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhusv47g0007sfap3a0j0bvj	\N
cmhusvf28000lsfapdmsvkwrm	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 10/11/2025 ha sido aprobada	t	\N	2025-11-11 16:43:10.208	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhusv47g0007sfap3a0j0bvj	\N
cmhuwrjl50021sfapo9moilmt	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 10/11/2025	t	\N	2025-11-11 18:32:07.914	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhuwrjky001zsfap1l5x59gg	\N
cmhuws26c002dsfaph61rntbk	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 10/11/2025 ha sido aprobada	t	\N	2025-11-11 18:32:32.005	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhuwrjky001zsfap1l5x59gg	\N
cmhv2bxuz006fsfapxh9xs4jp	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 10/11/2025	t	\N	2025-11-11 21:07:57.611	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhv2bxus006dsfaprlidd179	\N
cmhv2cdzh006nsfaprc5venxk	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 10/11/2025 ha sido aprobada	t	\N	2025-11-11 21:08:18.509	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhv2bxus006dsfaprlidd179	\N
cmhv2nue8008fsfapaoi5j0f2	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 10/11/2025	t	\N	2025-11-11 21:17:12.993	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhv2nue0008dsfapyf7c1ein	\N
cmhv3s5cu009nsfap91haxwsg	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 108.9€ para aprobación	t	\N	2025-11-11 21:48:33.437	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmhv6a2tt00ddsfapfduxwtiu	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 10/11/2025	t	\N	2025-11-11 22:58:29.201	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhv6a2tj00dbsfapx8ivftv1	\N
cmhv42tx1009vsfapp8m40q0t	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 10/11/2025 ha sido aprobada	t	\N	2025-11-11 21:56:51.829	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhv2nue0008dsfapyf7c1ein	\N
cmhv6aauf00dlsfapqk2aywdy	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 10/11/2025 ha sido aprobada	t	\N	2025-11-11 22:58:39.591	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhv6a2tj00dbsfapx8ivftv1	\N
cmhxyk60v000dsfhvk2q4t4f0	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 11/11/2025	t	\N	2025-11-13 21:45:41.504	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhxyk60m000bsfhv3ugpepz6	\N
cmi0xcnn10005sf3l4w0qnfey	EXPENSE_REIMBURSED	Gastos reembolsados	Se han reembolsado 6 gastos por un total de 327.85€ vía transferencia	t	\N	2025-11-15 23:35:09.998	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhjaaiiv000fsfilsda29mjf
cmi0whdr50039sfjwnf4wozao	EXPENSE_APPROVED	Gasto aprobado	Tu gasto de 108.9€ ha sido aprobado	t	\N	2025-11-15 23:10:50.848	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmhv3s33g009fsfap29l36on9
cmi1xo0y3000nsfsumcw9swt0	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 14/11/2025	t	\N	2025-11-16 16:31:46.636	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi1xo0xw000lsfsuphshkzsm	\N
cmi1xp1cn000xsfsuqlu80auv	EXPENSE_SUBMITTED	Nuevo gasto para aprobar	Ana García ha enviado un gasto de 49.55€ para aprobación	t	\N	2025-11-16 16:32:33.814	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	\N
cmi1y4vhu0013sfsuweujfda1	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 11/11/2025	t	\N	2025-11-16 16:44:52.722	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi1y4vhl0011sfsufakzzi25	\N
cmi1xliuh0009sfsuvzxav8bk	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 12/11/2025	t	\N	2025-11-16 16:29:49.865	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi1xliu50007sfsu615r51c5	\N
cmi1xnknu000bsfsuzqhuwvlf	MANUAL_TIME_ENTRY_REJECTED	Fichaje manual rechazado	Tu solicitud de fichaje manual para el 11/11/2025 ha sido rechazada. Motivo: No no nonono	t	\N	2025-11-16 16:31:25.53	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmhxyk60m000bsfhv3ugpepz6	\N
cmi1xnmzh000jsfsu8zte1dtu	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 12/11/2025 ha sido aprobada	t	\N	2025-11-16 16:31:28.541	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi1xliu50007sfsu615r51c5	\N
cmi1xpa3e000zsfsuutmlttnd	EXPENSE_APPROVED	Gasto aprobado	Tu gasto de 49.55€ ha sido aprobado	t	\N	2025-11-16 16:32:45.146	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	\N	cmi1xoznd000psfsu0dknaj1s
cmi1y5iln001bsfsuc1hjvt3i	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 14/11/2025 ha sido aprobada	t	\N	2025-11-16 16:45:22.667	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi1xo0xw000lsfsuphshkzsm	\N
cmi1y5ka9001jsfsuvrjakq2h	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 11/11/2025 ha sido aprobada	t	\N	2025-11-16 16:45:24.849	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi1y4vhl0011sfsufakzzi25	\N
cmi1y6thq001rsfsukaiy8g9p	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 13/11/2025	t	\N	2025-11-16 16:46:23.438	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi1y6thh001psfsursiw9hny	\N
cmi1y71h7001zsfsuugb4o1gj	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 13/11/2025 ha sido aprobada	t	\N	2025-11-16 16:46:33.788	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi1y6thh001psfsursiw9hny	\N
cmi28hh740003sf844fey4pxm	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Jose Francisco Parra ha solicitado un fichaje manual para el 5/11/2025	t	\N	2025-11-16 21:34:36.88	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi28hh6v0001sf84njic2er6	\N
cmi0xcdut0003sf3l9xujehg5	EXPENSE_REIMBURSED	Gastos reembolsados	Se han reembolsado 1 gasto por un total de 10.40€ vía nómina	t	\N	2025-11-15 23:34:57.317	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	\N	cmhkdom380010sfdxd5m8vpo3
cmi28htc0000bsf84f5j3p4dn	MANUAL_TIME_ENTRY_APPROVED	Fichaje manual aprobado	Tu solicitud de fichaje manual para el 5/11/2025 ha sido aprobada	t	\N	2025-11-16 21:34:52.609	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	cmi28hh6v0001sf84njic2er6	\N
cmi321de5000hsfea0padm9dw	DOCUMENT_UPLOADED	Nuevo documento: Nómina	Ana García Rodríguez ha subido un documento de tipo Nómina a tu perfil.	f	\N	2025-11-17 11:21:53.933	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	\N	\N
cmi28imjw000fsf84pm0flcrl	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Jose Francisco Parra ha solicitado un fichaje manual para el 6/11/2025	t	\N	2025-11-16 21:35:30.476	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi28imjq000dsf842gjk38tk	\N
cmi28ivyx000jsf8478zm5eab	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Jose Francisco Parra ha solicitado un fichaje manual para el 7/11/2025	t	\N	2025-11-16 21:35:42.681	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi28ivys000hsf8426f72z4x	\N
cmi28jeae000nsf84an87ub68	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 3/11/2025	t	\N	2025-11-16 21:36:06.422	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi28jea8000lsf84ue9p2f3n	\N
cmi28jl7p000rsf84vd2r5jef	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 4/11/2025	t	\N	2025-11-16 21:36:15.398	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi28jl7k000psf84we187xp4	\N
cmi28jsxy000vsf84546o4goj	MANUAL_TIME_ENTRY_SUBMITTED	Nueva solicitud de fichaje manual	Ana García ha solicitado un fichaje manual para el 5/11/2025	t	\N	2025-11-16 21:36:25.415	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y	cmi28jsxv000tsf843wgjvd0k	\N
\.


--
-- Data for Name: pto_requests; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.pto_requests (id, "startDate", "endDate", "workingDays", status, reason, "attachmentUrl", "approverId", "approvedAt", "approverComments", "rejectedAt", "rejectionReason", "cancelledAt", "cancellationReason", "submittedAt", "createdAt", "updatedAt", "orgId", "employeeId", "absenceTypeId") FROM stdin;
cmhly0qu50045sf718a7xwl1i	2025-12-03 23:00:00	2025-12-03 23:00:00	1.00	APPROVED	Vacas!	\N	cmhi8mayd000asf8x6u7v665y	2025-11-05 11:57:36.269	yeee	\N	\N	\N	\N	2025-11-05 11:57:21.246	2025-11-05 11:57:21.246	2025-11-05 11:57:36.269	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	cmhktubix000dsfrfszd32qdm
cmhnufxkd0009sfvjq880j9um	2025-11-13 23:00:00	2025-11-13 23:00:00	1.00	APPROVED	hi!	\N	cmhi8mayd000asf8x6u7v665y	2025-11-07 15:17:07.058	\N	\N	\N	\N	\N	2025-11-06 19:52:43.694	2025-11-06 19:52:43.694	2025-11-07 15:17:07.059	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	cmhktubix000dsfrfszd32qdm
\.


--
-- Data for Name: recurring_pto_adjustments; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.recurring_pto_adjustments (id, "extraDays", "adjustmentType", reason, notes, active, "startYear", "createdAt", "createdById", "orgId", "employeeId") FROM stdin;
\.


--
-- Data for Name: sensitive_data_access; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.sensitive_data_access (id, "dataType", "resourceId", "resourceType", "userId", "ipAddress", "userAgent", "accessedAt", "orgId") FROM stdin;
cmhmgx1wr0001sfcp9ej20c0x	IBAN	cmhkdlfp3000ksfdxxb3wbfwi	EMPLOYEE	cmhi8mayb0006sf8xx13jtzu4	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36	2025-11-05 20:46:21.676	cmhi8mawd0000sf8xishgn0j2
cmhmgx3wc0003sfcp3bkzma7x	IBAN	cmhkdlfp3000ksfdxxb3wbfwi	EMPLOYEE	cmhi8mayb0006sf8xx13jtzu4	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36	2025-11-05 20:46:24.252	cmhi8mawd0000sf8xishgn0j2
cmhmhfxwy0005sfcpun3h1qgt	IBAN	cmhkdlfp3000ksfdxxb3wbfwi	EMPLOYEE	cmhi8mayb0006sf8xx13jtzu4	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36	2025-11-05 21:01:02.963	cmhi8mawd0000sf8xishgn0j2
cmhmhfyvn0007sfcpimjuv5yh	IBAN	cmhkdlfp3000ksfdxxb3wbfwi	EMPLOYEE	cmhi8mayb0006sf8xx13jtzu4	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36	2025-11-05 21:01:04.212	cmhi8mawd0000sf8xishgn0j2
cmhmhg3em0009sfcpxdctzio5	IBAN	cmhkdlfp3000ksfdxxb3wbfwi	EMPLOYEE	cmhi8mayb0006sf8xx13jtzu4	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36	2025-11-05 21:01:10.079	cmhi8mawd0000sf8xishgn0j2
cmhmhggzs000bsfcpiuzb3eux	IBAN	cmhkdlfp3000ksfdxxb3wbfwi	EMPLOYEE	cmhi8mayb0006sf8xx13jtzu4	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36	2025-11-05 21:01:27.689	cmhi8mawd0000sf8xishgn0j2
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.sessions (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: signable_documents; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.signable_documents (id, title, description, category, "originalFileUrl", "originalHash", "fileSize", "mimeType", version, "expiresAt", "createdAt", "updatedAt", "orgId", "createdById") FROM stdin;
cmhklyaqa0001sfrk6nshu5mf	Contrato tecnologia	Prueba	ACUERDO	org-cmhi8mawd0000sf8xishgn0j2/signatures/documents/dcda68d1-0646-4afe-9b06-9528107955ee/original/correosimpresoadmision.pdf	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	91645	application/pdf	1	\N	2025-11-04 13:31:45.491	2025-11-04 13:31:45.491	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
cmhkpwxgu0021sfrk59k55ioi	Contrato 2026	Aumenta tu sueldo.	ACUERDO	org-cmhi8mawd0000sf8xishgn0j2/signatures/documents/77a17039-09d3-4d3d-b765-5a0cf11ed1e0/original/correosimpresoadmision.pdf	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	91645	application/pdf	1	\N	2025-11-04 15:22:40.111	2025-11-04 15:22:40.111	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
cmhkt83r7004jsfrktzwh2sfi	Contrato 2026	Contrato	ACUERDO	org-cmhi8mawd0000sf8xishgn0j2/signatures/documents/489bf67c-d808-4d38-acc0-0ea3c4d90746/original/correosimpresoadmision.pdf	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	91645	application/pdf	1	\N	2025-11-04 16:55:20.322	2025-11-04 16:55:20.322	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
cmhly2z44004vsf71ygcdhmyg	Contrato	Contrato	OTRO	org-cmhi8mawd0000sf8xishgn0j2/signatures/documents/fdf8f468-65f3-47b4-8d1b-2323c7ad3ef8/original/constancia_institucional_-_colegio_internacional_europa.pdf	17549350ef9136809075aa4c98faf0d2ff1339c7c29f80383eb4a9302fca1df7	178600	application/pdf	1	\N	2025-11-05 11:59:05.284	2025-11-05 11:59:05.284	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
cmi2bg8bd001jsf849c3xjjy5	Acuerdo de todo el mundo	Acuerdo	ACUERDO	org-cmhi8mawd0000sf8xishgn0j2/signatures/documents/54499869-819b-4e59-9597-ea95309b2a99/original/timenow_questionnaire_email.pdf	98efb3ab983d788ed62af677d1e49ffa59aebf3c066d273080bc7976de331851	4353	application/pdf	1	\N	2025-11-16 22:57:37.561	2025-11-16 22:57:37.561	cmhi8mawd0000sf8xishgn0j2	cmhi8mayd000asf8x6u7v665y
\.


--
-- Data for Name: signature_evidences; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.signature_evidences (id, timeline, "preSignHash", "postSignHash", "signerMetadata", policy, result, "createdAt", "requestId", "signerId") FROM stdin;
cmhkpxgd90029sfrkf5tgc6p8	[{"actor": "HR", "event": "SIGNATURE_REQUEST_CREATED", "details": {"signers": ["Jose Francisco Parra"], "signersCount": 1, "documentTitle": "Contrato 2026"}, "timestamp": "2025-11-04T15:23:04.374Z"}, {"actor": "Jose Francisco Parra", "event": "CONSENT_GIVEN", "timestamp": "2025-11-04T15:23:04.374Z"}, {"actor": "Jose Francisco Parra", "event": "DOCUMENT_SIGNED", "details": {"action": "Documento firmado exitosamente", "documentHash": "21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912"}, "timestamp": "2025-11-04T15:23:04.374Z"}]	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	{"ip": null, "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15", "consentTimestamp": "2025-11-04T15:22:59.133Z", "signatureTimestamp": "2025-11-04T15:23:04.374Z"}	SES	SUCCESS	2025-11-04 15:23:04.606	cmhkpwxoe0023sfrkfz7a8zl2	cmhkpwxoe0025sfrksf9lsjql
cmhkt9ii8004rsfrkfwgi02kr	[{"actor": "HR", "event": "SIGNATURE_REQUEST_CREATED", "details": {"signers": ["Jose Francisco Parra"], "signersCount": 1, "documentTitle": "Contrato 2026"}, "timestamp": "2025-11-04T16:56:25.855Z"}, {"actor": "Jose Francisco Parra", "event": "CONSENT_GIVEN", "timestamp": "2025-11-04T16:56:25.855Z"}, {"actor": "Jose Francisco Parra", "event": "DOCUMENT_SIGNED", "details": {"action": "Documento firmado exitosamente", "documentHash": "21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912"}, "timestamp": "2025-11-04T16:56:25.855Z"}]	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	{"ip": null, "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15", "consentTimestamp": "2025-11-04T16:56:19.985Z", "signatureTimestamp": "2025-11-04T16:56:25.855Z"}	SES	SUCCESS	2025-11-04 16:56:26.096	cmhkt840v004lsfrkln1xhlec	cmhkt840v004nsfrkz2l8mub9
cmhly3jzj0053sf71qlhwa5b2	[{"actor": "HR", "event": "SIGNATURE_REQUEST_CREATED", "details": {"signers": ["Ana García"], "signersCount": 1, "documentTitle": "Contrato"}, "timestamp": "2025-11-05T11:59:32.133Z"}, {"actor": "Ana García", "event": "CONSENT_GIVEN", "timestamp": "2025-11-05T11:59:32.133Z"}, {"actor": "Ana García", "event": "DOCUMENT_SIGNED", "details": {"action": "Documento firmado exitosamente", "documentHash": "17549350ef9136809075aa4c98faf0d2ff1339c7c29f80383eb4a9302fca1df7"}, "timestamp": "2025-11-05T11:59:32.133Z"}]	17549350ef9136809075aa4c98faf0d2ff1339c7c29f80383eb4a9302fca1df7	17549350ef9136809075aa4c98faf0d2ff1339c7c29f80383eb4a9302fca1df7	{"ip": null, "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15", "consentTimestamp": "2025-11-05T11:59:26.167Z", "signatureTimestamp": "2025-11-05T11:59:32.133Z"}	SES	SUCCESS	2025-11-05 11:59:32.336	cmhly2zgn004xsf71me0ribig	cmhly2zgo004zsf71ss767dac
\.


--
-- Data for Name: signature_requests; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.signature_requests (id, status, policy, "expiresAt", "createdAt", "completedAt", "orgId", "documentId") FROM stdin;
cmhkpwxoe0023sfrkfz7a8zl2	COMPLETED	SES	2025-11-11 15:22:18.265	2025-11-04 15:22:40.382	2025-11-04 15:23:04.601	cmhi8mawd0000sf8xishgn0j2	cmhkpwxgu0021sfrk59k55ioi
cmhkt840v004lsfrkln1xhlec	COMPLETED	SES	2025-11-11 16:54:37.199	2025-11-04 16:55:20.671	2025-11-04 16:56:26.086	cmhi8mawd0000sf8xishgn0j2	cmhkt83r7004jsfrktzwh2sfi
cmhly2zgn004xsf71me0ribig	COMPLETED	SES	2025-11-12 11:58:44.218	2025-11-05 11:59:05.736	2025-11-05 11:59:32.331	cmhi8mawd0000sf8xishgn0j2	cmhly2z44004vsf71ygcdhmyg
\.


--
-- Data for Name: signers; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.signers (id, "order", status, "signToken", "employeeId", "signedAt", "signedFileUrl", "signedHash", "consentGivenAt", "ipAddress", "userAgent", "rejectedAt", "rejectionReason", "createdAt", "updatedAt", "requestId") FROM stdin;
cmhkpwxoe0025sfrksf9lsjql	1	SIGNED	3b0af281257d46b28f54d7e1940e1f1021a25e3eca50521cdabd367229104da8	cmhkdlfp3000ksfdxxb3wbfwi	2025-11-04 15:23:04.601	org-cmhi8mawd0000sf8xishgn0j2/signatures/documents/cmhkpwxgu0021sfrk59k55ioi/signed/1762269784135-cmhkpwxoe0025sfrksf9lsjql-contrato_2026.pdf	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	2025-11-04 15:22:59.133	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15	\N	\N	2025-11-04 15:22:40.382	2025-11-04 15:23:04.602	cmhkpwxoe0023sfrkfz7a8zl2
cmhkt840v004nsfrkz2l8mub9	1	SIGNED	b3105dc6d33bceb62aa6c9ee95bab127ee673189f1e7d51c833c1cdf51a66dcf	cmhkdlfp3000ksfdxxb3wbfwi	2025-11-04 16:56:26.086	org-cmhi8mawd0000sf8xishgn0j2/signatures/documents/cmhkt83r7004jsfrktzwh2sfi/signed/1762275385612-cmhkt840v004nsfrkz2l8mub9-contrato_2026.pdf	21fe67d9918c18a57215df770af3318f41ea6ad3705b2f2840f0f94b0273d912	2025-11-04 16:56:19.985	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15	\N	\N	2025-11-04 16:55:20.671	2025-11-04 16:56:26.088	cmhkt840v004lsfrkln1xhlec
cmhly2zgo004zsf71ss767dac	1	SIGNED	79e9c8b64482ecce9cb177264e255fa66558d3b8378b4a81dde9afe8ab6ea2a5	cmhi8mayl0014sf8xdt2xyr0t	2025-11-05 11:59:32.331	org-cmhi8mawd0000sf8xishgn0j2/signatures/documents/cmhly2z44004vsf71ygcdhmyg/signed/1762343971847-cmhly2zgo004zsf71ss767dac-contrato.pdf	17549350ef9136809075aa4c98faf0d2ff1339c7c29f80383eb4a9302fca1df7	2025-11-05 11:59:26.167	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15	\N	\N	2025-11-05 11:59:05.736	2025-11-05 11:59:32.332	cmhly2zgn004xsf71me0ribig
\.


--
-- Data for Name: temporary_passwords; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.temporary_passwords (id, password, "createdAt", "usedAt", "expiresAt", active, reason, notes, "orgId", "userId", "createdById") FROM stdin;
cmhkdlfr1000osfdxzzia6u6r	#ZkMRuGvYTd8	2025-11-04 09:37:48.542	\N	2025-11-11 09:37:48.541	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Jose Francisco Parra	cmhi8mawd0000sf8xishgn0j2	cmhkdlfqz000msfdx04z2mfi7	cmhi8mayb0006sf8xx13jtzu4
cmhxndzjr0040sfcr7mqqxs3n	4&uMdIjzGr2L	2025-11-13 16:32:57.399	\N	2025-11-20 16:32:57.398	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Antonio Garcia	cmhi8mawd0000sf8xishgn0j2	cmhxndzjk003ysfcrn1ksk1wd	cmhi8mayd000asf8x6u7v665y
cmhxnx5f3004esfcrucgf1vmt	5lNA4Svp*WEZ	2025-11-13 16:47:51.471	\N	2025-11-20 16:47:51.471	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Manuel Parra	cmhi8mawd0000sf8xishgn0j2	cmhxnx5f0004csfcrv1evswk3	cmhi8mayd000asf8x6u7v665y
cmhxqgmv9004wsfcrhm389r2d	51BSsg$78ilF	2025-11-13 17:58:59.781	\N	2025-11-20 17:58:59.78	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Juan Jesus Cardo	cmhi8mawd0000sf8xishgn0j2	cmhxqgmv5004usfcrlwtn0956	cmhi8mayd000asf8x6u7v665y
cmhxqs3g00056sfcri09d2gq6	@7lx^WgGc3G8	2025-11-13 18:07:54.481	\N	2025-11-20 18:07:54.48	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Juan Antonio Gonzalez	cmhi8mawd0000sf8xishgn0j2	cmhxqs3fv0054sfcrmd0245ok	cmhi8mayd000asf8x6u7v665y
cmhxquid1005gsfcrhasd2uhp	pX2zyWW7&0AA	2025-11-13 18:09:47.125	\N	2025-11-20 18:09:47.124	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Jesus Cardona	cmhi8mawd0000sf8xishgn0j2	cmhxquicx005esfcrhg8cm7rw	cmhi8mayd000asf8x6u7v665y
cmhxr1uzy005qsfcro7yugxnb	vPb6&EjT6zIb	2025-11-13 18:15:30.095	\N	2025-11-20 18:15:30.094	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Antonia Camacho	cmhi8mawd0000sf8xishgn0j2	cmhxr1uzu005osfcrzibyr163	cmhi8mayd000asf8x6u7v665y
cmhxr2phx0060sfcrp1eptcce	67r^UPh7aO7x	2025-11-13 18:16:09.621	\N	2025-11-20 18:16:09.62	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Jesus Carmona	cmhi8mawd0000sf8xishgn0j2	cmhxr2phs005ysfcr82xhmslr	cmhi8mayd000asf8x6u7v665y
cmhxr5ffr006csfcrd3hei3hf	xBY*6jb&iZsu	2025-11-13 18:18:16.551	\N	2025-11-20 18:18:16.55	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: asdasd asdasdsa	cmhi8mawd0000sf8xishgn0j2	cmhxr5ffn006asfcrex55lpw3	cmhi8mayd000asf8x6u7v665y
cmhzgxns20007sfcnmyz79fmj	%8ZcU$lhQO0d	2025-11-14 23:07:50.306	\N	2025-11-21 23:07:50.305	t	Nuevo empleado	Contraseña generada automáticamente para nuevo empleado: Jose Francisco Parra Fernandez	cmhi8mawd0000sf8xishgn0j2	cmhzgxnrx0005sfcnil5mtonv	cmhi8mayd000asf8x6u7v665y
cmi07b9c80005sfn0fxc2ooh1	l@6r1iSRYn&X	2025-11-15 11:26:14.793	\N	2025-11-22 11:26:14.792	t	Nuevo empleado creado	\N	cmhi8mawd0000sf8xishgn0j2	cmi07b9c50003sfn0k2yufwmo	cmhi8mayd000asf8x6u7v665y
cmi0f3yk8001vsfn0q73hv3y8	%yKoX4CcX@1n	2025-11-15 15:04:31.16	\N	2025-11-22 15:04:31.159	t	Nuevo empleado creado	\N	cmhi8mawd0000sf8xishgn0j2	cmi0f3yk1001tsfn0fov3jeso	cmhi8mayd000asf8x6u7v665y
cmi0fzul0002bsfn073kggo7m	Wcy0fcU%2#ft	2025-11-15 15:29:18.996	\N	2025-11-22 15:29:18.995	t	Nuevo empleado creado	\N	cmhi8mawd0000sf8xishgn0j2	cmi0fzukv0029sfn0f9n1i7bu	cmhi8mayd000asf8x6u7v665y
cmi0hu61g000fsfjw9oq6gim9	NHmNUFm%a0^n	2025-11-15 16:20:53.14	\N	2025-11-22 16:20:53.139	t	Nuevo empleado creado	\N	cmhi8mawd0000sf8xishgn0j2	cmi0hu61a000dsfjwqnm6qfd1	cmhi8mayd000asf8x6u7v665y
cmi0v47n7002nsfjwvpnpygew	*HrZazxyJ*X2	2025-11-15 22:32:36.788	\N	2025-11-22 22:32:36.785	t	Nuevo empleado creado	\N	cmhi8mawd0000sf8xishgn0j2	cmi0v47n3002lsfjw3oztz6a8	cmhi8mayd000asf8x6u7v665y
cmi0v639k002xsfjwy98f2jtb	vQzQ2sY#62K3	2025-11-15 22:34:04.424	\N	2025-11-22 22:34:04.424	t	Usuario administrativo con empleado creado	Usuario HR_ADMIN con perfil de empleado creado por Ana García Rodríguez	cmhi8mawd0000sf8xishgn0j2	cmi0v639h002vsfjwow9tjmrg	cmhi8mayd000asf8x6u7v665y
cmi2c3xtg0003sfea45ecvndv	d&RTms0xMQUl	2025-11-16 23:16:03.7	\N	2025-11-23 23:16:03.699	t	Nuevo empleado creado	\N	cmhi8mawd0000sf8xishgn0j2	cmi2c3xta0001sfeaqufj1fga	cmhi8mayd000asf8x6u7v665y
\.


--
-- Data for Name: time_clock_terminals; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.time_clock_terminals (id, name, code, location, "ipAddress", active, "createdAt", "updatedAt", "orgId", "costCenterId") FROM stdin;
\.


--
-- Data for Name: time_entries; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.time_entries (id, "entryType", "timestamp", location, notes, "ipAddress", "createdAt", "updatedAt", "orgId", "employeeId", "terminalId", "workdayId", "isManual", "manualRequestId", accuracy, "distanceFromCenter", "isWithinAllowedArea", latitude, longitude, "nearestCostCenterId", "requiresReview", "cancellationNotes", "cancellationReason", "cancelledAt", "isCancelled", "originalDurationHours") FROM stdin;
cmhkdo1eb000ssfdxmrr97atv	CLOCK_IN	2025-11-04 09:39:49.906	\N	\N	\N	2025-11-04 09:39:49.907	2025-11-04 09:39:49.907	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjgo0001sf7cziv72dhm	CLOCK_IN	2025-11-10 08:00:00	\N	Fichaje manual aprobado. Motivo: Se me olvidó, lo siento!	\N	2025-11-14 09:32:02.568	2025-11-14 09:32:02.568	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhv2nue0008dsfapyf7c1ein	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhkpqdz8001psfrkop6o21ub	BREAK_START	2025-11-04 15:17:34.915	\N	\N	\N	2025-11-04 15:17:34.916	2025-11-04 15:17:34.916	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhkpqfib001tsfrkp0cgpuqp	BREAK_END	2025-11-04 15:17:36.899	\N	\N	\N	2025-11-04 15:17:36.9	2025-11-04 15:17:36.9	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjh00003sf7c0tcxmj12	CLOCK_OUT	2025-11-10 16:00:00	\N	Fichaje manual aprobado. Motivo: Se me olvidó, lo siento!	\N	2025-11-14 09:32:02.58	2025-11-14 09:32:02.58	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhv2nue0008dsfapyf7c1ein	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjhc0007sf7ctid9utau	CLOCK_IN	2025-11-10 08:00:00	\N	Fichaje manual aprobado. Motivo: Se me olvido fichar, gracias!	\N	2025-11-14 09:32:02.593	2025-11-14 09:32:02.593	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhv2bxus006dsfaprlidd179	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhkuf50w0065sfrkigvvrife	CLOCK_OUT	2025-11-04 17:28:48.146	\N	\N	\N	2025-11-04 17:28:48.175	2025-11-04 17:28:48.175	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjhf0009sf7cflpkaqb2	CLOCK_OUT	2025-11-10 16:00:00	\N	Fichaje manual aprobado. Motivo: Se me olvido fichar, gracias!	\N	2025-11-14 09:32:02.595	2025-11-14 09:32:02.595	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhv2bxus006dsfaprlidd179	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjhi000dsf7cizx9dukk	CLOCK_IN	2025-11-10 07:00:00	\N	Fichaje manual aprobado. Motivo: Hola!!! Se me olvido fichar!!	\N	2025-11-14 09:32:02.598	2025-11-14 09:32:02.598	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhuwrjky001zsfap1l5x59gg	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjhj000fsf7c0q1bc1vw	CLOCK_OUT	2025-11-10 15:00:00	\N	Fichaje manual aprobado. Motivo: Hola!!! Se me olvido fichar!!	\N	2025-11-14 09:32:02.599	2025-11-14 09:32:02.599	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhuwrjky001zsfap1l5x59gg	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhkyext80001sfrs98q3e9ep	CLOCK_IN	2025-11-04 19:20:37.291	\N	\N	\N	2025-11-04 19:20:37.292	2025-11-04 19:20:37.292	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhkyf0re0005sfrscphlv2yx	CLOCK_OUT	2025-11-04 19:20:41.114	\N	\N	\N	2025-11-04 19:20:41.115	2025-11-04 19:20:41.115	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhkykf9n0009sfrs2wrckrc1	CLOCK_IN	2025-11-04 19:24:53.194	\N	\N	\N	2025-11-04 19:24:53.195	2025-11-04 19:24:53.195	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhkykgp0000dsfrst0abogfl	CLOCK_OUT	2025-11-04 19:24:55.044	\N	\N	\N	2025-11-04 19:24:55.045	2025-11-04 19:24:55.045	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhl03xzu000lsfrsbcepo5ez	CLOCK_IN	2025-11-04 20:08:03.545	\N	\N	\N	2025-11-04 20:08:03.546	2025-11-04 20:08:03.546	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhl0438r000psfrsd7anrzg7	CLOCK_OUT	2025-11-04 20:08:10.347	\N	\N	\N	2025-11-04 20:08:10.348	2025-11-04 20:08:10.348	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhl06ozr000tsfrsqq0e33ty	CLOCK_IN	2025-11-04 20:10:11.847	\N	\N	\N	2025-11-04 20:10:11.848	2025-11-04 20:10:11.848	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhl06uok000xsfrsvlrxv2zd	CLOCK_OUT	2025-11-04 20:10:19.22	\N	\N	\N	2025-11-04 20:10:19.22	2025-11-04 20:10:19.22	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhl0a1np0017sfrs54zvh2bw	CLOCK_IN	2025-11-04 20:12:48.228	\N	\N	\N	2025-11-04 20:12:48.229	2025-11-04 20:12:48.229	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhl0a5kp001bsfrszoqnn1vg	CLOCK_OUT	2025-11-04 20:12:53.304	\N	\N	\N	2025-11-04 20:12:53.305	2025-11-04 20:12:53.305	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27704042	-6.06179342	\N	f	\N	\N	\N	f	\N
cmhl0ehu0001rsfrs7jwxcod9	CLOCK_IN	2025-11-04 20:16:15.816	\N	\N	\N	2025-11-04 20:16:15.817	2025-11-04 20:16:15.817	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27707459	-6.06179372	\N	f	\N	\N	\N	f	\N
cmhl0ek0d001vsfrscpwlou81	CLOCK_OUT	2025-11-04 20:16:18.637	\N	\N	\N	2025-11-04 20:16:18.637	2025-11-04 20:16:18.637	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27714856	-6.06175286	\N	f	\N	\N	\N	f	\N
cmhl11icq0021sfrsfqsjmwat	CLOCK_IN	2025-11-04 20:34:09.578	\N	\N	\N	2025-11-04 20:34:09.579	2025-11-04 20:34:09.579	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27700841	-6.06180991	\N	f	\N	\N	\N	f	\N
cmhl11k970025sfrs5qr5o5pc	CLOCK_OUT	2025-11-04 20:34:12.043	\N	\N	\N	2025-11-04 20:34:12.044	2025-11-04 20:34:12.044	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27709615	-6.06178952	\N	f	\N	\N	\N	f	\N
cmhxdk51c002csfcroipkvp62	CLOCK_IN	2025-11-13 11:57:48.287	\N	\N	\N	2025-11-13 11:57:48.288	2025-11-16 16:46:33.769	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27692031	-6.06186962	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1y6thh001psfsursiw9hny)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:46:33.769	t	\N
cmhlqfvx3000fsfgpjhdpy1la	CLOCK_IN	2025-11-05 08:25:10.742	\N	\N	\N	2025-11-05 08:25:10.744	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	36.67	\N	\N	37.27693557	-6.06188440	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhl1zjk0000dsfiblgoufxba	CLOCK_IN	2025-11-04 21:00:37.44	\N	\N	\N	2025-11-04 21:00:37.441	2025-11-04 21:00:37.441	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27715256	-6.06173595	\N	f	\N	\N	\N	f	\N
cmhl1zm2o000hsfiby77484dr	CLOCK_OUT	2025-11-04 21:00:40.704	\N	\N	\N	2025-11-04 21:00:40.705	2025-11-04 21:00:40.705	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27703501	-6.06183866	\N	f	\N	\N	\N	f	\N
cmhl1znn4000lsfibceo6l9ly	CLOCK_IN	2025-11-04 21:00:42.735	\N	\N	\N	2025-11-04 21:00:42.736	2025-11-04 21:00:42.736	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27703501	-6.06183866	\N	f	\N	\N	\N	f	\N
cmhl1zp3o000psfibqkloef8v	CLOCK_OUT	2025-11-04 21:00:44.627	\N	\N	\N	2025-11-04 21:00:44.628	2025-11-04 21:00:44.628	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27703501	-6.06183866	\N	f	\N	\N	\N	f	\N
cmhv5vdx700cfsfapl5i2owsp	CLOCK_IN	2025-11-11 22:47:03.739	\N	\N	\N	2025-11-11 22:47:03.74	2025-11-11 22:47:03.74	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27708523	-6.06166402	\N	f	\N	\N	\N	f	\N
cmhv6924e0001sfzxttw9pamw	CLOCK_IN	2025-11-10 08:00:00	\N	\N	\N	2025-11-11 22:57:41.63	2025-11-11 22:58:39.576	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	Reemplazado por solicitud manual aprobada (ID: cmhv6a2tj00dbsfapx8ivftv1)	REPLACED_BY_MANUAL_REQUEST	2025-11-11 22:58:39.576	t	\N
cmhynsjhl000jsf7ck63rjd58	CLOCK_IN	2025-11-10 08:00:00	\N	Fichaje manual aprobado. Motivo: asdadasdsadasda	\N	2025-11-14 09:32:02.602	2025-11-14 09:32:02.602	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhusv47g0007sfap3a0j0bvj	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjhm000lsf7c2vupoep6	CLOCK_OUT	2025-11-10 16:00:00	\N	Fichaje manual aprobado. Motivo: asdadasdsadasda	\N	2025-11-14 09:32:02.603	2025-11-14 09:32:02.603	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhusv47g0007sfap3a0j0bvj	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhnhy6gv001fsfp50zwhw73m	CLOCK_IN	2025-11-06 14:03:00.03	\N	\N	\N	2025-11-06 14:03:00.031	2025-11-06 14:03:00.031	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	39.00	\N	\N	37.27696228	-6.06179141	\N	f	\N	\N	\N	f	\N
cmhnhy7te001jsfp5xijrr249	CLOCK_OUT	2025-11-06 14:03:01.778	\N	\N	\N	2025-11-06 14:03:01.779	2025-11-06 14:03:01.779	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	39.00	\N	\N	37.27696228	-6.06179141	\N	f	\N	\N	\N	f	\N
cmhnlxkhp001xsfoay8q1ijq9	CLOCK_IN	2025-11-06 15:54:30.012	\N	\N	\N	2025-11-06 15:54:30.013	2025-11-06 15:54:30.013	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	45.63	\N	\N	37.27689514	-6.06188472	\N	f	\N	\N	\N	f	\N
cmhnlxlo30021sfoaddpkmg17	CLOCK_OUT	2025-11-06 15:54:31.539	\N	\N	\N	2025-11-06 15:54:31.54	2025-11-06 15:54:31.54	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27690799	-6.06188098	\N	f	\N	\N	\N	f	\N
cmhnmmy58002lsfoamlz5j1v1	CLOCK_IN	2025-11-06 16:14:14.107	\N	\N	\N	2025-11-06 16:14:14.108	2025-11-06 16:14:14.108	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27690505	-6.06190156	\N	f	\N	\N	\N	f	\N
cmhnroaja003zsfoa5zni396g	BREAK_START	2025-11-06 18:35:14.901	\N	\N	\N	2025-11-06 18:35:14.902	2025-11-06 18:35:14.902	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	40.00	\N	\N	37.27704620	-6.06178570	\N	f	\N	\N	\N	f	\N
cmhnrobmt0043sfoamcjfhkeg	BREAK_END	2025-11-06 18:35:16.324	\N	\N	\N	2025-11-06 18:35:16.326	2025-11-06 18:35:16.326	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27692794	-6.06188964	\N	f	\N	\N	\N	f	\N
cmhxn5048003ksfcrye3bdact	CLOCK_IN	2025-11-13 16:25:58.231	\N	\N	\N	2025-11-13 16:25:58.232	2025-11-16 16:46:33.769	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27690696	-6.06192922	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1y6thh001psfsursiw9hny)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:46:33.769	t	\N
cmhlqtqhl0027sfgpu1zu2x26	CLOCK_OUT	2025-11-05 08:35:56.889	\N	\N	\N	2025-11-05 08:35:56.89	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27698131	-6.06185959	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhnrux9i004fsfoaf9ck443z	CLOCK_OUT	2025-11-06 18:40:24.293	\N	\N	\N	2025-11-06 18:40:24.295	2025-11-06 18:40:24.295	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27692794	-6.06188965	\N	f	\N	\N	\N	f	\N
cmhnruyev004jsfoa25a1ymrx	CLOCK_IN	2025-11-06 18:40:25.782	\N	\N	\N	2025-11-06 18:40:25.783	2025-11-06 18:40:25.783	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27692794	-6.06188965	\N	f	\N	\N	\N	f	\N
cmhnxmq3h000tsfvjgtyauvdq	CLOCK_OUT	2025-11-06 21:21:59.452	\N	\N	\N	2025-11-06 21:21:59.453	2025-11-06 21:21:59.453	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	40.00	\N	\N	37.27704620	-6.06178570	\N	f	\N	\N	\N	f	\N
cmhorkp70001zsfl9dg8r6asw	CLOCK_IN	2025-11-07 11:20:13.452	\N	\N	\N	2025-11-07 11:20:13.453	2025-11-07 11:20:13.453	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	36.67	\N	\N	37.27692055	-6.06187828	\N	f	\N	\N	\N	f	\N
cmhv61p6c00ctsfapg817rnij	CLOCK_OUT	2025-11-11 22:51:58.26	\N	\N	\N	2025-11-11 22:51:58.26	2025-11-11 22:51:58.26	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27704238	-6.06179368	\N	f	\N	\N	\N	f	\N
cmhv6aau400dfsfap1vjfaebm	CLOCK_IN	2025-11-10 08:00:00	\N	Fichaje manual aprobado. Motivo: asdasdasdasd	\N	2025-11-11 22:58:39.581	2025-11-11 22:58:39.581	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhv6a2tj00dbsfapx8ivftv1	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhorljje002fsfl9zheksnji	CLOCK_OUT	2025-11-07 11:20:52.778	\N	\N	\N	2025-11-07 11:20:52.779	2025-11-07 11:20:52.779	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27695976	-6.06186735	\N	f	\N	\N	\N	f	\N
cmhorlmys002jsfl9lkuhqesv	CLOCK_IN	2025-11-07 11:20:57.22	\N	\N	\N	2025-11-07 11:20:57.221	2025-11-07 11:20:57.221	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696667	-6.06183606	\N	f	\N	\N	\N	f	\N
cmhorss6a002nsfl9us69csho	CLOCK_OUT	2025-11-07 11:26:30.561	\N	\N	\N	2025-11-07 11:26:30.562	2025-11-07 11:26:30.562	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696914	-6.06182499	\N	f	\N	\N	\N	f	\N
cmhv6aau700dhsfapyempqimf	CLOCK_OUT	2025-11-10 17:00:00	\N	Fichaje manual aprobado. Motivo: asdasdasdasd	\N	2025-11-11 22:58:39.584	2025-11-11 22:58:39.584	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhv6a2tj00dbsfapx8ivftv1	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhq3xlrc0025sf2oyjhmyi2p	CLOCK_IN	2025-11-08 09:53:57.096	\N	\N	\N	2025-11-08 09:53:57.096	2025-11-08 09:53:57.096	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27707835	-6.06167589	\N	f	\N	\N	\N	f	\N
cmhq3xov40029sf2ou112drt1	CLOCK_OUT	2025-11-08 09:54:01.12	\N	\N	\N	2025-11-08 09:54:01.12	2025-11-08 09:54:01.12	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27711425	-6.06178794	\N	f	\N	\N	\N	f	\N
cmhynsjhp000psf7cmzg67hc0	CLOCK_IN	2025-11-10 08:00:00	\N	Fichaje manual aprobado. Motivo: asdasdadasdad	\N	2025-11-14 09:32:02.605	2025-11-14 09:32:02.605	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhurrv02000zsfz96d0htor4	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjhq000rsf7c5k3ni6tg	CLOCK_OUT	2025-11-10 16:00:00	\N	Fichaje manual aprobado. Motivo: asdasdadasdad	\N	2025-11-14 09:32:02.606	2025-11-14 09:32:02.606	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhurrv02000zsfz96d0htor4	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjhs000vsf7cifqh02of	CLOCK_IN	2025-10-23 07:00:00	\N	Fichaje manual aprobado. Motivo: Se me olvido fichar.	\N	2025-11-14 09:32:02.609	2025-11-14 09:32:02.609	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhly0281003nsf71c1wikq2n	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhynsjht000xsf7cnll0absx	CLOCK_OUT	2025-10-23 16:00:00	\N	Fichaje manual aprobado. Motivo: Se me olvido fichar.	\N	2025-11-14 09:32:02.61	2025-11-14 09:32:02.61	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmhly0281003nsf71c1wikq2n	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi1lyucq000fsf3l6my3hj0t	CLOCK_IN	2025-11-16 11:04:15.914	\N	\N	\N	2025-11-16 11:04:15.915	2025-11-16 11:04:15.915	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27701708	-6.06179837	\N	f	\N	\N	\N	f	\N
cmi1om01l001rsf3lwck6qwuw	CLOCK_OUT	2025-11-16 12:18:15.609	\N	\N	\N	2025-11-16 12:18:15.61	2025-11-16 12:18:15.61	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27691655	-6.06187336	\N	f	\N	\N	\N	f	\N
cmi1om2d9001vsf3lcbimtevy	CLOCK_IN	2025-11-16 12:18:18.62	\N	\N	\N	2025-11-16 12:18:18.621	2025-11-16 12:18:18.621	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27692797	-6.06196830	\N	f	\N	\N	\N	f	\N
cmhujdvus000nsfshyr9q9za5	CLOCK_IN	2025-11-11 12:17:35.62	\N	\N	\N	2025-11-11 12:17:35.621	2025-11-11 12:17:35.621	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27691523	-6.06186516	\N	f	\N	\N	\N	f	\N
cmhujdxjc000rsfshiqcohf2e	CLOCK_OUT	2025-11-11 12:17:37.8	\N	\N	\N	2025-11-11 12:17:37.801	2025-11-11 12:17:37.801	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27695086	-6.06181894	\N	f	\N	\N	\N	f	\N
cmhupd7o6001hsfh50ho1aono	CLOCK_IN	2025-11-11 15:05:01.973	\N	\N	\N	2025-11-11 15:05:01.974	2025-11-11 15:05:01.974	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27695655	-6.06178546	\N	f	\N	\N	\N	f	\N
cmhupd8o6001lsfh5czjgqds4	CLOCK_OUT	2025-11-11 15:05:03.27	\N	\N	\N	2025-11-11 15:05:03.271	2025-11-11 15:05:03.271	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27695655	-6.06178546	\N	f	\N	\N	\N	f	\N
cmhupdd2c001psfh54mxdwdge	CLOCK_IN	2025-11-11 15:05:08.964	\N	\N	\N	2025-11-11 15:05:08.964	2025-11-11 15:05:08.964	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27695655	-6.06178546	\N	f	\N	\N	\N	f	\N
cmhupj87j0003sflexldnipef	CLOCK_OUT	2025-11-11 15:09:42.607	\N	\N	\N	2025-11-11 15:09:42.608	2025-11-11 15:09:42.608	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27695655	-6.06178546	\N	f	\N	\N	\N	f	\N
cmhupr94t0003sf5c5p2sia9n	CLOCK_IN	2025-11-10 08:00:00	\N	\N	\N	2025-11-11 15:15:57.054	2025-11-11 15:15:57.054	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	cmhupr94p0001sf5cghuzfwby	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhupsp1r0003sff2747p5qax	CLOCK_IN	2025-11-11 15:17:04.335	\N	\N	\N	2025-11-11 15:17:04.336	2025-11-11 15:17:04.336	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27694098	-6.06183710	\N	f	\N	\N	\N	f	\N
cmhupst3q0007sff21j51oskb	CLOCK_OUT	2025-11-11 15:17:09.589	\N	\N	\N	2025-11-11 15:17:09.59	2025-11-11 15:17:09.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27694098	-6.06183710	\N	f	\N	\N	\N	f	\N
cmhuremys0003sfz9l0hiw297	CLOCK_IN	2025-11-11 16:02:07.684	\N	\N	\N	2025-11-11 16:02:07.685	2025-11-11 16:02:07.685	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	39.00	\N	\N	37.27695846	-6.06178808	\N	f	\N	\N	\N	f	\N
cmhurep600007sfz9h22db7yu	CLOCK_OUT	2025-11-11 16:02:10.536	\N	\N	\N	2025-11-11 16:02:10.537	2025-11-11 16:02:10.537	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	39.00	\N	\N	37.27695846	-6.06178808	\N	f	\N	\N	\N	f	\N
cmi1w4k7z0011sf0dckjzh0d7	CLOCK_OUT	2025-11-16 15:48:38.879	\N	\N	\N	2025-11-16 15:48:38.88	2025-11-16 15:48:38.88	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	40.00	\N	\N	37.27701950	-6.06181050	\N	f	\N	\N	\N	f	\N
cmi1w4lkf0015sf0d42tic49g	CLOCK_IN	2025-11-16 15:48:40.622	\N	\N	\N	2025-11-16 15:48:40.623	2025-11-16 15:48:40.623	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27704221	-6.06186277	\N	f	\N	\N	\N	f	\N
cmi1w4o0r0019sf0dg0zo153k	CLOCK_OUT	2025-11-16 15:48:43.803	\N	\N	\N	2025-11-16 15:48:43.804	2025-11-16 15:48:43.804	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27704221	-6.06186276	\N	f	\N	\N	\N	f	\N
cmi1w4pmi001dsf0dg9f0gzmp	CLOCK_IN	2025-11-16 15:48:45.881	\N	\N	\N	2025-11-16 15:48:45.882	2025-11-16 15:48:45.882	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27704221	-6.06186276	\N	f	\N	\N	\N	f	\N
cmi1w5rfq001hsf0d74d7hwpn	CLOCK_OUT	2025-11-16 15:49:34.885	\N	\N	\N	2025-11-16 15:49:34.886	2025-11-16 15:49:34.886	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699991	-6.06175269	\N	f	\N	\N	\N	f	\N
cmi1w5skj001lsf0di9nk1rgd	CLOCK_IN	2025-11-16 15:49:36.355	\N	\N	\N	2025-11-16 15:49:36.355	2025-11-16 15:49:36.355	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699995	-6.06175279	\N	f	\N	\N	\N	f	\N
cmi1w5uam001psf0dwvexufti	CLOCK_OUT	2025-11-16 15:49:38.589	\N	\N	\N	2025-11-16 15:49:38.59	2025-11-16 15:49:38.59	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699992	-6.06175273	\N	f	\N	\N	\N	f	\N
cmi1w5vow001tsf0dwyvk7kg0	CLOCK_IN	2025-11-16 15:49:40.399	\N	\N	\N	2025-11-16 15:49:40.4	2025-11-16 15:49:40.4	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699992	-6.06175273	\N	f	\N	\N	\N	f	\N
cmi1w69od0021sf0d19rzflml	CLOCK_OUT	2025-11-16 15:49:58.525	\N	\N	\N	2025-11-16 15:49:58.526	2025-11-16 15:49:58.526	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699988	-6.06175263	\N	f	\N	\N	\N	f	\N
cmi1w6drr0025sf0d63xaax9m	CLOCK_IN	2025-11-16 15:50:03.831	\N	\N	\N	2025-11-16 15:50:03.831	2025-11-16 15:50:03.831	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699988	-6.06175262	\N	f	\N	\N	\N	f	\N
cmi1w6icg002dsf0dmx77yfa8	CLOCK_OUT	2025-11-16 15:50:09.759	\N	\N	\N	2025-11-16 15:50:09.76	2025-11-16 15:50:09.76	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699988	-6.06175262	\N	f	\N	\N	\N	f	\N
cmi1w6jjj002hsf0d2992uyih	CLOCK_IN	2025-11-16 15:50:11.311	\N	\N	\N	2025-11-16 15:50:11.312	2025-11-16 15:50:11.312	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699988	-6.06175262	\N	f	\N	\N	\N	f	\N
cmi1w6kl4002lsf0dw3cznqdn	BREAK_START	2025-11-16 15:50:12.664	\N	\N	\N	2025-11-16 15:50:12.664	2025-11-16 15:50:12.664	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699988	-6.06175262	\N	f	\N	\N	\N	f	\N
cmi1w6ll5002psf0dumnur5f8	BREAK_END	2025-11-16 15:50:13.961	\N	\N	\N	2025-11-16 15:50:13.961	2025-11-16 15:50:13.961	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27699988	-6.06175262	\N	f	\N	\N	\N	f	\N
cmi1xai9p0035sf0daqy3jhzi	CLOCK_IN	2025-11-16 16:21:15.9	\N	\N	\N	2025-11-16 16:21:15.901	2025-11-16 16:21:15.901	cmhi8mawd0000sf8xishgn0j2	cmi0f3yke001xsfn02e2xbe6n	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi1xajr10039sf0duj3a3w8d	CLOCK_OUT	2025-11-16 16:21:17.821	\N	\N	\N	2025-11-16 16:21:17.821	2025-11-16 16:21:17.821	cmhi8mawd0000sf8xishgn0j2	cmi0f3yke001xsfn02e2xbe6n	\N	\N	f	\N	35.00	\N	\N	37.27696859	-6.06188807	\N	f	\N	\N	\N	f	\N
cmi1xakmh003dsf0dykiz5bsh	CLOCK_IN	2025-11-16 16:21:18.953	\N	\N	\N	2025-11-16 16:21:18.953	2025-11-16 16:21:18.953	cmhi8mawd0000sf8xishgn0j2	cmi0f3yke001xsfn02e2xbe6n	\N	\N	f	\N	35.00	\N	\N	37.27696855	-6.06188814	\N	f	\N	\N	\N	f	\N
cmi1xapuh003hsf0dqu8d19tg	CLOCK_OUT	2025-11-16 16:21:25.72	\N	\N	\N	2025-11-16 16:21:25.721	2025-11-16 16:21:25.721	cmhi8mawd0000sf8xishgn0j2	cmi0f3yke001xsfn02e2xbe6n	\N	\N	f	\N	35.00	\N	\N	37.27696857	-6.06188811	\N	f	\N	\N	\N	f	\N
cmhv6cg0300dzsfap8paem3yt	CLOCK_IN	2025-11-11 23:00:19.586	\N	\N	\N	2025-11-11 23:00:19.587	2025-11-16 16:31:28.524	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27708941	-6.06179141	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1xliu50007sfsu615r51c5)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:31:28.523	t	\N
cmhv6cspq00ebsfap7hqex7yd	CLOCK_OUT	2025-11-11 23:00:36.062	\N	\N	\N	2025-11-11 23:00:36.063	2025-11-16 16:31:28.524	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27705977	-6.06182664	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1xliu50007sfsu615r51c5)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:31:28.523	t	\N
cmi1xnmz6000dsfsuferx2iya	CLOCK_IN	2025-11-12 08:00:00	\N	Fichaje manual aprobado. Motivo: hola hola hola	\N	2025-11-16 16:31:28.53	2025-11-16 16:31:28.53	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmi1xliu50007sfsu615r51c5	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi1xnmz8000fsfsurvoo6e7n	CLOCK_OUT	2025-11-12 17:00:00	\N	Fichaje manual aprobado. Motivo: hola hola hola	\N	2025-11-16 16:31:28.533	2025-11-16 16:31:28.533	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmi1xliu50007sfsu615r51c5	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi1y5il90015sfsuahtc4hcn	CLOCK_IN	2025-11-14 08:00:00	\N	Fichaje manual aprobado. Motivo: Testttttttt	\N	2025-11-16 16:45:22.653	2025-11-16 16:45:22.653	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmi1xo0xw000lsfsuphshkzsm	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi1y5ile0017sfsulyxopd2e	CLOCK_OUT	2025-11-14 17:00:00	\N	Fichaje manual aprobado. Motivo: Testttttttt	\N	2025-11-16 16:45:22.658	2025-11-16 16:45:22.658	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmi1xo0xw000lsfsuphshkzsm	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi1y5k9w001dsfsufzewif8q	CLOCK_IN	2025-11-11 08:00:00	\N	Fichaje manual aprobado. Motivo: asdadasdasdadasd	\N	2025-11-16 16:45:24.837	2025-11-16 16:45:24.837	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmi1y4vhl0011sfsufakzzi25	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi1y5ka0001fsfsuj8ws3pre	CLOCK_OUT	2025-11-11 17:00:00	\N	Fichaje manual aprobado. Motivo: asdadasdasdadasd	\N	2025-11-16 16:45:24.841	2025-11-16 16:45:24.841	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmi1y4vhl0011sfsufakzzi25	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmhxdk69m002gsfcrfma5tuz7	CLOCK_OUT	2025-11-13 11:57:49.881	\N	\N	\N	2025-11-13 11:57:49.882	2025-11-16 16:46:33.769	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27694029	-6.06190492	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1y6thh001psfsursiw9hny)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:46:33.769	t	\N
cmhxn51u6003osfcrid8gz1qt	CLOCK_OUT	2025-11-13 16:26:00.461	\N	\N	\N	2025-11-13 16:26:00.462	2025-11-16 16:46:33.769	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27690506	-6.06183195	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1y6thh001psfsursiw9hny)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:46:33.769	t	\N
cmhxdec8u001ksfcry408i3sg	CLOCK_IN	2025-11-13 11:53:17.693	\N	\N	\N	2025-11-13 11:53:17.694	2025-11-16 16:46:33.769	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27689647	-6.06187117	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1y6thh001psfsursiw9hny)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:46:33.769	t	\N
cmhxdedsp001osfcr4b2osoea	CLOCK_OUT	2025-11-13 11:53:19.704	\N	\N	\N	2025-11-13 11:53:19.705	2025-11-16 16:46:33.769	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27692033	-6.06186962	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1y6thh001psfsursiw9hny)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:46:33.769	t	\N
cmhxyroep000vsfhvisy63rdj	CLOCK_IN	2025-11-13 21:51:31.921	\N	\N	\N	2025-11-13 21:51:31.921	2025-11-16 16:46:33.769	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27692031	-6.06187629	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi1y6thh001psfsursiw9hny)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 16:46:33.769	t	\N
cmi1y71gv001tsfsuq64m1ooo	CLOCK_IN	2025-11-13 08:00:00	\N	Fichaje manual aprobado. Motivo: Hola lo siento mucho	\N	2025-11-16 16:46:33.776	2025-11-16 16:46:33.776	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmi1y6thh001psfsursiw9hny	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi1y71gz001vsfsuh20i0z2m	CLOCK_OUT	2025-11-13 16:00:00	\N	Fichaje manual aprobado. Motivo: Hola lo siento mucho	\N	2025-11-16 16:46:33.78	2025-11-16 16:46:33.78	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	t	cmi1y6thh001psfsursiw9hny	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi251lwn0025sfsu9zmch54f	CLOCK_OUT	2025-11-16 19:58:17.638	\N	\N	\N	2025-11-16 19:58:17.639	2025-11-16 19:58:17.639	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	\N	\N	f	\N	35.00	\N	\N	37.27695077	-6.06179114	\N	f	\N	\N	\N	f	\N
cmhlqfx6a000jsfgp7ma9jfrv	CLOCK_OUT	2025-11-05 08:25:12.37	\N	\N	\N	2025-11-05 08:25:12.371	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	36.67	\N	\N	37.27693557	-6.06188440	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqfyfl000nsfgpc917udkj	CLOCK_IN	2025-11-05 08:25:14	\N	\N	\N	2025-11-05 08:25:14.001	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	36.67	\N	\N	37.27693557	-6.06188440	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqfzg9000rsfgp46u77lca	CLOCK_OUT	2025-11-05 08:25:15.32	\N	\N	\N	2025-11-05 08:25:15.322	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	36.67	\N	\N	37.27693557	-6.06188440	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqh00g000xsfgp41pxdjuz	CLOCK_IN	2025-11-05 08:26:02.703	\N	\N	\N	2025-11-05 08:26:02.704	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696608	-6.06182933	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqh1840011sfgppypnyfc0	CLOCK_OUT	2025-11-05 08:26:04.276	\N	\N	\N	2025-11-05 08:26:04.276	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696609	-6.06182932	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqt5kp0017sfgpzv0rers2	CLOCK_IN	2025-11-05 08:35:29.784	\N	\N	\N	2025-11-05 08:35:29.785	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696227	-6.06182193	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqt6p9001bsfgpui02xn6t	CLOCK_OUT	2025-11-05 08:35:31.245	\N	\N	\N	2025-11-05 08:35:31.245	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696227	-6.06182193	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqt7m1001fsfgpldbsiji9	CLOCK_IN	2025-11-05 08:35:32.425	\N	\N	\N	2025-11-05 08:35:32.426	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696227	-6.06182193	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqt8i9001jsfgp5emwx9yw	CLOCK_OUT	2025-11-05 08:35:33.584	\N	\N	\N	2025-11-05 08:35:33.585	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696227	-6.06182193	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqtdsr001nsfgp77pr6dqp	CLOCK_IN	2025-11-05 08:35:40.443	\N	\N	\N	2025-11-05 08:35:40.444	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696227	-6.06182193	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqtgvc001rsfgpas27bdne	CLOCK_OUT	2025-11-05 08:35:44.423	\N	\N	\N	2025-11-05 08:35:44.424	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	37.67	\N	\N	37.27702712	-6.06182718	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqtjdh001vsfgpmkfesnlv	CLOCK_IN	2025-11-05 08:35:47.669	\N	\N	\N	2025-11-05 08:35:47.67	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	37.67	\N	\N	37.27702714	-6.06182718	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqtkpr001zsfgpaax0phzi	CLOCK_OUT	2025-11-05 08:35:49.406	\N	\N	\N	2025-11-05 08:35:49.407	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	37.67	\N	\N	37.27702714	-6.06182718	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqtn1t0023sfgp6t1qk9tl	CLOCK_IN	2025-11-05 08:35:52.432	\N	\N	\N	2025-11-05 08:35:52.433	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	37.67	\N	\N	37.27702714	-6.06182718	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqygtc002bsfgpxkty16xl	CLOCK_IN	2025-11-05 08:39:37.631	\N	\N	\N	2025-11-05 08:39:37.632	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27696737	-6.06186946	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqyj9d002fsfgpkqo0i1lu	CLOCK_OUT	2025-11-05 08:39:40.801	\N	\N	\N	2025-11-05 08:39:40.802	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27690315	-6.06185317	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqynl0002jsfgpjm2h5pfo	CLOCK_IN	2025-11-05 08:39:46.403	\N	\N	\N	2025-11-05 08:39:46.404	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27690315	-6.06185316	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlqyt9u002nsfgpope1atzd	CLOCK_OUT	2025-11-05 08:39:53.778	\N	\N	\N	2025-11-05 08:39:53.779	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27690315	-6.06185316	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlr35fq002rsfgpjscidld7	CLOCK_IN	2025-11-05 08:43:16.165	\N	\N	\N	2025-11-05 08:43:16.166	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27692031	-6.06187188	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlr36hi002vsfgpyw8z3p2m	CLOCK_OUT	2025-11-05 08:43:17.525	\N	\N	\N	2025-11-05 08:43:17.526	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	37.67	\N	\N	37.27708053	-6.06163360	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlrz645002zsfgposhal57e	CLOCK_IN	2025-11-05 09:08:10.035	\N	\N	\N	2025-11-05 09:08:10.036	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlrz7ff0033sfgpf0v6cnrz	CLOCK_OUT	2025-11-05 09:08:11.738	\N	\N	\N	2025-11-05 09:08:11.739	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27693049	-6.06185197	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlrz8zl0037sfgpm91v8ohu	CLOCK_IN	2025-11-05 09:08:13.761	\N	\N	\N	2025-11-05 09:08:13.762	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27693143	-6.06185798	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlrza36003bsfgp2lv35ncp	CLOCK_OUT	2025-11-05 09:08:15.185	\N	\N	\N	2025-11-05 09:08:15.186	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27693176	-6.06186008	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlrzqan003fsfgpdii63yvj	CLOCK_IN	2025-11-05 09:08:36.19	\N	\N	\N	2025-11-05 09:08:36.191	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27693176	-6.06186008	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlrzrwu003jsfgpip3o0h8b	CLOCK_OUT	2025-11-05 09:08:38.285	\N	\N	\N	2025-11-05 09:08:38.287	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27693176	-6.06186008	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls161z003nsfgprywyb2xx	CLOCK_IN	2025-11-05 09:09:43.27	\N	\N	\N	2025-11-05 09:09:43.272	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27693176	-6.06186008	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls17e7003rsfgpktassmpn	CLOCK_OUT	2025-11-05 09:09:45.006	\N	\N	\N	2025-11-05 09:09:45.007	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27701948	-6.06170990	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls18e4003vsfgp1ar803qr	CLOCK_IN	2025-11-05 09:09:46.299	\N	\N	\N	2025-11-05 09:09:46.3	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27701950	-6.06170986	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls19mn003zsfgppdgodwbc	CLOCK_OUT	2025-11-05 09:09:47.902	\N	\N	\N	2025-11-05 09:09:47.903	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27701950	-6.06170986	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls1aup0043sfgpb353shpv	CLOCK_IN	2025-11-05 09:09:49.489	\N	\N	\N	2025-11-05 09:09:49.49	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27701950	-6.06170986	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls1ct50047sfgp1lqcqhod	CLOCK_OUT	2025-11-05 09:09:52.024	\N	\N	\N	2025-11-05 09:09:52.025	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27701950	-6.06170986	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls1ygj004bsfgppas0lbuj	CLOCK_IN	2025-11-05 09:10:20.081	\N	\N	\N	2025-11-05 09:10:20.083	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27698846	-6.06178948	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls20fz004fsfgpqfpiz39z	CLOCK_OUT	2025-11-05 09:10:22.654	\N	\N	\N	2025-11-05 09:10:22.655	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27697753	-6.06181752	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls53sa004vsfgpwrw8ybjv	CLOCK_IN	2025-11-05 09:12:46.953	\N	\N	\N	2025-11-05 09:12:46.954	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27697753	-6.06181752	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls55se004zsfgp3kgiuak3	CLOCK_OUT	2025-11-05 09:12:49.549	\N	\N	\N	2025-11-05 09:12:49.55	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27691841	-6.06185030	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls573o0053sfgpcy8s7n38	CLOCK_IN	2025-11-05 09:12:51.251	\N	\N	\N	2025-11-05 09:12:51.253	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27691841	-6.06185031	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls8hkd0057sfgpuhz29gyq	CLOCK_OUT	2025-11-05 09:15:24.78	\N	\N	\N	2025-11-05 09:15:24.781	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls8jao005bsfgpq7lk8iig	CLOCK_IN	2025-11-05 09:15:27.023	\N	\N	\N	2025-11-05 09:15:27.024	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27691841	-6.06185031	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhls8kpp005fsfgp51lgoz57	CLOCK_OUT	2025-11-05 09:15:28.86	\N	\N	\N	2025-11-05 09:15:28.861	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27691841	-6.06185031	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlvxtob000lsf71multchmb	CLOCK_IN	2025-11-05 10:59:05.723	\N	\N	\N	2025-11-05 10:59:05.724	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27697978	-6.06184660	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlvxy6o000psf71gpgx02zt	CLOCK_OUT	2025-11-05 10:59:11.567	\N	\N	\N	2025-11-05 10:59:11.568	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	37.67	\N	\N	37.27708052	-6.06163360	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlvxz1u000tsf71f1jr5g7t	CLOCK_IN	2025-11-05 10:59:12.689	\N	\N	\N	2025-11-05 10:59:12.69	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27701069	-6.06177897	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlvxzy4000xsf71t5yij0dk	BREAK_START	2025-11-05 10:59:13.852	\N	\N	\N	2025-11-05 10:59:13.852	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27698534	-6.06183174	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmhlvy0xu0011sf7108cm0l1a	BREAK_END	2025-11-05 10:59:15.138	\N	\N	\N	2025-11-05 10:59:15.139	2025-11-16 21:34:52.59	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	f	\N	35.00	\N	\N	37.27698534	-6.06183174	\N	f	Reemplazado por solicitud manual aprobada (ID: cmi28hh6v0001sf84njic2er6)	REPLACED_BY_MANUAL_REQUEST	2025-11-16 21:34:52.59	t	\N
cmi28htbo0005sf84zysc85pw	CLOCK_IN	2025-11-05 08:00:00	\N	Fichaje manual aprobado. Motivo: Se me olvido fichar.	\N	2025-11-16 21:34:52.596	2025-11-16 21:34:52.596	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	t	cmi28hh6v0001sf84njic2er6	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
cmi28htbr0007sf84y8kln6yn	CLOCK_OUT	2025-11-05 16:00:00	\N	Fichaje manual aprobado. Motivo: Se me olvido fichar.	\N	2025-11-16 21:34:52.599	2025-11-16 21:34:52.599	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	\N	\N	t	cmi28hh6v0001sf84njic2er6	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	f	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.users (id, email, password, name, role, "emailVerified", image, active, "createdAt", "updatedAt", "orgId", "mustChangePassword") FROM stdin;
cmhi8may30002sf8x7xpdi79e	admin@demo.com	$2b$10$hUCUFkUNgaM0qk5J8hp8nu2xoMPFhHXiGLTJRygFSQ/rFT6vh3CAm	Admin Demo	ORG_ADMIN	\N	\N	t	2025-11-02 21:42:58.539	2025-11-02 21:42:58.539	cmhi8mawd0000sf8xishgn0j2	f
cmhi8mayd000esf8xrnfzyyb1	employee@demo.com	$2b$10$hUCUFkUNgaM0qk5J8hp8nu2xoMPFhHXiGLTJRygFSQ/rFT6vh3CAm	Empleado Genérico	EMPLOYEE	\N	\N	t	2025-11-02 21:42:58.54	2025-11-02 21:42:58.54	cmhi8mawd0000sf8xishgn0j2	f
cmhxndzjk003ysfcrn1ksk1wd	antonio@timenow.com	$2b$10$x88e/XI7hUOg1FLdJGMbHeq5RkiJoP1YKlFtuYw5L5yQCCa/6fYLa	Antonio Garcia	EMPLOYEE	\N	\N	t	2025-11-13 16:32:57.393	2025-11-13 16:32:57.393	cmhi8mawd0000sf8xishgn0j2	t
cmhkdlfqz000msfdx04z2mfi7	deejaymacro@hotmail.es	$2b$10$lt8i2PxlihfELrV8nmjMXueZzaoy/fyA3c.kYXtBdhDyVXewbMiCW	Jose Francisco Parra Fernandez	EMPLOYEE	\N	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/avatars/cmhkdlfqz000msfdx04z2mfi7.webp	t	2025-11-04 09:37:48.539	2025-11-10 16:33:00.206	cmhi8mawd0000sf8xishgn0j2	f
cmhxnx5f0004csfcrv1evswk3	manuel.parra@timenow.cloud	$2b$10$WcPPJDyl.dTZ3jPigi4.S.R63709c0pBFIzjrQdILfEOMCUcIKzii	Manuel Parra	EMPLOYEE	\N	\N	t	2025-11-13 16:47:51.468	2025-11-13 16:47:51.468	cmhi8mawd0000sf8xishgn0j2	t
cmhxqgmv5004usfcrlwtn0956	juanjesus.cardo@timenow.com	$2b$10$XZxzNTzPknGhOXfKtY8yROQDRTBvXLeo0XyHylfvx0I3YWBAn48.W	Juan Jesus Cardo	EMPLOYEE	\N	\N	t	2025-11-13 17:58:59.777	2025-11-13 17:58:59.777	cmhi8mawd0000sf8xishgn0j2	t
cmhxqs3fv0054sfcrmd0245ok	jantoniogonzalez@timenow.com	$2b$10$sVOUTLz46of7rAodpoU5h.NfeklJlqKs6gdvWuv2VgVIPue2Av9d.	Juan Antonio Gonzalez	EMPLOYEE	\N	\N	t	2025-11-13 18:07:54.476	2025-11-13 18:07:54.476	cmhi8mawd0000sf8xishgn0j2	t
cmhxquicx005esfcrhg8cm7rw	jesus.cardona@timenow.com	$2b$10$lipgKFHP3TZbmJILdLwq/uatxrsQRr86OHr3.o5u7SQ8f6Vzzz2/.	Jesus Cardona	EMPLOYEE	\N	\N	t	2025-11-13 18:09:47.121	2025-11-13 18:09:47.121	cmhi8mawd0000sf8xishgn0j2	t
cmhxr1uzu005osfcrzibyr163	antonia.camacho@timenow.com	$2b$10$BGCBikClaFfhOpcFMhJDZOrfR5256iQ9hj6aFiKywNMTX.rMBVQX.	Antonia Camacho	EMPLOYEE	\N	\N	t	2025-11-13 18:15:30.091	2025-11-13 18:15:30.091	cmhi8mawd0000sf8xishgn0j2	t
cmhxr2phs005ysfcr82xhmslr	jesus.carmona@timenow.com	$2b$10$dQBbUSb8fYRsKE9/F2vJUeuIOOxba16nGJtdaSxYAy9vW4SkhmO32	Jesus Carmona	EMPLOYEE	\N	\N	t	2025-11-13 18:16:09.616	2025-11-13 18:16:09.616	cmhi8mawd0000sf8xishgn0j2	t
cmhxr5ffn006asfcrex55lpw3	deejaymacro2@hotmail.es	$2b$10$c5jSYE.GmKAUkdWfvHTFQOa9qaLi1m3whCcbgohjnd51XQ3gT/4Xe	asdasd asdasdsa	EMPLOYEE	\N	\N	t	2025-11-13 18:18:16.548	2025-11-13 18:18:16.548	cmhi8mawd0000sf8xishgn0j2	t
cmhzgxnrx0005sfcnil5mtonv	deejaymacro5@hotmail.es	$2b$10$IKqkS8eugoXrvMWdZeRdLuakgFwHW1p10QNXe.8UJh18x1G1LzDwy	Jose Francisco Parra Fernandez	EMPLOYEE	\N	\N	t	2025-11-14 23:07:50.301	2025-11-14 23:07:50.301	cmhi8mawd0000sf8xishgn0j2	t
cmhi8mayd000asf8x6u7v665y	hr@demo.com	$2b$10$hUCUFkUNgaM0qk5J8hp8nu2xoMPFhHXiGLTJRygFSQ/rFT6vh3CAm	Ana García Rodríguez	HR_ADMIN	\N	https://473c60e413b9c35c4cfb02b588de90c5.r2.cloudflarestorage.com/erp-documents/org-cmhi8mawd0000sf8xishgn0j2/avatars/cmhi8mayd000asf8x6u7v665y.webp	t	2025-11-02 21:42:58.54	2025-11-15 10:15:30.669	cmhi8mawd0000sf8xishgn0j2	f
cmhi8mayd0008sf8xhdlgqj53	carlos.lopez@demo.com	$2b$10$hUCUFkUNgaM0qk5J8hp8nu2xoMPFhHXiGLTJRygFSQ/rFT6vh3CAm	Carlos López Martín	EMPLOYEE	\N	\N	t	2025-11-02 21:42:58.54	2025-11-15 10:15:47.824	cmhi8mawd0000sf8xishgn0j2	f
cmhi8maye000gsf8xinbq6lnt	maria.perez@demo.com	$2b$10$hUCUFkUNgaM0qk5J8hp8nu2xoMPFhHXiGLTJRygFSQ/rFT6vh3CAm	María Pérez González	EMPLOYEE	\N	\N	t	2025-11-02 21:42:58.54	2025-11-15 10:16:10.358	cmhi8mawd0000sf8xishgn0j2	f
cmhi8mayd000dsf8xojrmtsbz	lucia.fernandez@demo.com	$2b$10$hUCUFkUNgaM0qk5J8hp8nu2xoMPFhHXiGLTJRygFSQ/rFT6vh3CAm	Lucía Fernández Ruiz	EMPLOYEE	\N	\N	t	2025-11-02 21:42:58.54	2025-11-15 10:17:15.064	cmhi8mawd0000sf8xishgn0j2	f
cmi07b9c50003sfn0k2yufwmo	deejaymacro10@hotmail.es	$2b$10$nD8l1KF.hzco5.tH75SN2uR0G54a8ZQEneqO/qCSZj3TjDzE7HscG	Jose Francisco Parra Fernandez	EMPLOYEE	\N	\N	t	2025-11-15 11:26:14.789	2025-11-15 11:26:45.913	cmhi8mawd0000sf8xishgn0j2	f
cmi0fzukv0029sfn0f9n1i7bu	deejaymacro232@hotmail.es	$2b$10$OQEAC/04VG2ytIp.4jqtuOc7PtgoWiNVPXDRC2mZAigihK9iBXySq	Jose Francisco Parra Fernandez	EMPLOYEE	\N	\N	t	2025-11-15 15:29:18.992	2025-11-15 15:29:18.992	cmhi8mawd0000sf8xishgn0j2	t
cmi0hu61a000dsfjwqnm6qfd1	deejaymacro999@hotmail.es	$2b$10$AVFeJt/H8cWzZF3Rvfdn6OkbcohG0t8s.FGMtXeTNXDXYsoNuYRkm	Jose Francisco Parra Fernandez	EMPLOYEE	\N	\N	t	2025-11-15 16:20:53.135	2025-11-15 16:20:53.135	cmhi8mawd0000sf8xishgn0j2	t
cmhi8mayb0005sf8xq50h79x6	manager@demo.com	$2b$10$hUCUFkUNgaM0qk5J8hp8nu2xoMPFhHXiGLTJRygFSQ/rFT6vh3CAm	Juan Empleados Sánchez	EMPLOYEE	\N	\N	t	2025-11-02 21:42:58.539	2025-11-15 22:26:07.717	cmhi8mawd0000sf8xishgn0j2	f
cmhi8mayb0006sf8xx13jtzu4	superadmin@demo.com	$2b$10$hUCUFkUNgaM0qk5J8hp8nu2xoMPFhHXiGLTJRygFSQ/rFT6vh3CAm	Super Admin	SUPER_ADMIN	\N	\N	t	2025-11-02 21:42:58.539	2025-11-15 22:28:23.216	cmhi8mawd0000sf8xishgn0j2	f
cmi0v47n3002lsfjw3oztz6a8	deejaymacro32323@hotmail.es	$2b$10$ESnBXMh0G7YSrvcTeGv9ceoyUdnyC5f3mYMnyRECnWlQ8cmIVii4e	Jose Francisco Parra Fernandez	EMPLOYEE	\N	\N	t	2025-11-15 22:32:36.783	2025-11-15 22:32:36.783	cmhi8mawd0000sf8xishgn0j2	t
cmi0v639h002vsfjwow9tjmrg	deejaymacroqw3e2@hotmail.es	$2b$10$luej9n9N/gWbh1098e1KGuXnrF3CXaUaCsKKWeUpu7rANpiMgOqhu	Jose Francisco Parra	HR_ADMIN	\N	\N	t	2025-11-15 22:34:04.422	2025-11-15 22:34:04.422	cmhi8mawd0000sf8xishgn0j2	t
cmi0f3yk1001tsfn0fov3jeso	sabado.garcia@timenow.cloud	$2b$10$I7JLvznJ15WT6.ERS/937udDJS1MFDuplIj9o6i7aOdP5DvJYUIPe	Sabado Garcia	HR_ADMIN	\N	\N	t	2025-11-15 15:04:31.154	2025-11-16 22:02:20.943	cmhi8mawd0000sf8xishgn0j2	f
cmi2c3xta0001sfeaqufj1fga	mdmcamachog2323@gmail.com	$2b$10$w7PsfC4Ve7S3eZPcQ1Gmn.Q8HmmY3Fxlp6Lp.wmiJPpGYAJnyZ7DC	Jose F Parra Fernandez	EMPLOYEE	\N	\N	t	2025-11-16 23:16:03.694	2025-11-16 23:16:03.694	cmhi8mawd0000sf8xishgn0j2	t
\.


--
-- Data for Name: workday_summaries; Type: TABLE DATA; Schema: public; Owner: erp_user
--

COPY public.workday_summaries (id, date, "clockIn", "clockOut", "totalWorkedMinutes", "totalBreakMinutes", status, notes, "createdAt", "updatedAt", "orgId", "employeeId", "excessiveTimeNotified") FROM stdin;
cmhorkp7a0021sfl94htsesmj	2025-11-06 23:00:00	2025-11-07 11:20:13.452	2025-11-07 11:26:30.561	6.21	0.00	INCOMPLETE	\N	2025-11-07 11:20:13.462	2025-11-07 11:26:30.575	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	f
cmhkdo1eh000usfdxu3hsc92l	2025-11-03 23:00:00	2025-11-04 09:39:49.906	2025-11-04 21:00:44.627	469.53	0.03	COMPLETED	\N	2025-11-04 09:39:49.913	2025-11-04 21:00:44.633	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	f
cmhq3xlrn0027sf2opyvwhcpv	2025-11-07 23:00:00	2025-11-08 09:53:57.096	2025-11-08 09:54:01.12	0.07	0.00	INCOMPLETE	\N	2025-11-08 09:53:57.107	2025-11-08 09:54:01.125	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	f
cmi1xai9v0037sf0d4lw9fqrx	2025-11-15 23:00:00	2025-11-16 16:21:15.9	2025-11-16 16:21:25.72	0.14	0.00	INCOMPLETE	\N	2025-11-16 16:21:15.907	2025-11-16 16:21:25.723	cmhi8mawd0000sf8xishgn0j2	cmi0f3yke001xsfn02e2xbe6n	f
cmhv6cg0c00e1sfapx4qucqgy	2025-11-11 23:00:00	2025-11-12 08:00:00	2025-11-12 17:00:00	540.00	0.00	COMPLETED	\N	2025-11-11 23:00:19.597	2025-11-16 16:31:28.536	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	f
cmi1y5ilh0019sfsu5zxv89s0	2025-11-13 23:00:00	2025-11-14 08:00:00	2025-11-14 17:00:00	540.00	0.00	COMPLETED	\N	2025-11-16 16:45:22.661	2025-11-16 16:45:22.661	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	f
cmhujdvuy000psfshcu1h8oet	2025-11-10 23:00:00	2025-11-11 12:17:35.62	2025-11-11 22:51:58.26	9.66	0.00	INCOMPLETE	\N	2025-11-11 12:17:35.626	2025-11-11 22:51:58.271	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	f
cmi1y5ka4001hsfsut3cvxm0s	2025-11-10 23:00:00	2025-11-11 08:00:00	2025-11-11 17:00:00	540.00	0.00	COMPLETED	\N	2025-11-16 16:45:24.844	2025-11-16 16:45:24.844	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	f
cmhxdec90001msfcrbmfvo5xn	2025-11-12 23:00:00	2025-11-13 08:00:00	2025-11-13 16:00:00	480.00	0.00	COMPLETED	\N	2025-11-13 11:53:17.7	2025-11-16 16:46:33.783	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	f
cmi1lyud2000hsf3l206op81y	2025-11-15 23:00:00	2025-11-16 11:04:15.914	2025-11-16 19:58:17.638	533.72	0.02	COMPLETED	\N	2025-11-16 11:04:15.926	2025-11-16 19:58:17.651	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	f
cmhlqfvxc000hsfgp10232an0	2025-11-04 23:00:00	2025-11-05 08:00:00	2025-11-05 16:00:00	480.00	0.00	COMPLETED	\N	2025-11-05 08:25:10.753	2025-11-16 21:34:52.604	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	f
cmhupr94p0001sf5cghuzfwby	2025-11-09 23:00:00	\N	\N	0.00	0.00	IN_PROGRESS	\N	2025-11-11 15:15:57.05	2025-11-11 15:15:57.05	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	f
cmhnhy6h9001hsfp54d7hnjyj	2025-11-05 23:00:00	2025-11-06 14:03:00.03	2025-11-06 21:21:59.452	307.76	0.02	INCOMPLETE	\N	2025-11-06 14:03:00.046	2025-11-06 21:21:59.465	cmhi8mawd0000sf8xishgn0j2	cmhkdlfp3000ksfdxxb3wbfwi	f
cmhv6924i0003sfzxljmufdna	2025-11-09 23:00:00	2025-11-10 07:00:00	2025-11-10 17:00:00	420.00	0.00	COMPLETED	\N	2025-11-11 22:57:41.634	2025-11-14 09:32:02.608	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	f
cmhynsjhv000zsf7c1k8jy268	2025-10-22 22:00:00	2025-10-23 07:00:00	2025-10-23 16:00:00	540.00	0.00	COMPLETED	\N	2025-11-14 09:32:02.611	2025-11-14 09:32:02.611	cmhi8mawd0000sf8xishgn0j2	cmhi8mayl0014sf8xdt2xyr0t	f
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: absence_types absence_types_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.absence_types
    ADD CONSTRAINT absence_types_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: calendars calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.calendars
    ADD CONSTRAINT calendars_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: dismissed_notifications dismissed_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT dismissed_notifications_pkey PRIMARY KEY (id);


--
-- Name: employee_documents employee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employment_contracts employment_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employment_contracts
    ADD CONSTRAINT employment_contracts_pkey PRIMARY KEY (id);


--
-- Name: expense_approvals expense_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_approvals
    ADD CONSTRAINT expense_approvals_pkey PRIMARY KEY (id);


--
-- Name: expense_approvers expense_approvers_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_approvers
    ADD CONSTRAINT expense_approvers_pkey PRIMARY KEY (id);


--
-- Name: expense_attachments expense_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_attachments
    ADD CONSTRAINT expense_attachments_pkey PRIMARY KEY (id);


--
-- Name: expense_policies expense_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_policies
    ADD CONSTRAINT expense_policies_pkey PRIMARY KEY (id);


--
-- Name: expense_reports expense_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_reports
    ADD CONSTRAINT expense_reports_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: geolocation_consents geolocation_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.geolocation_consents
    ADD CONSTRAINT geolocation_consents_pkey PRIMARY KEY (id);


--
-- Name: manual_time_entry_requests manual_time_entry_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.manual_time_entry_requests
    ADD CONSTRAINT manual_time_entry_requests_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: organization_pto_config organization_pto_config_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.organization_pto_config
    ADD CONSTRAINT organization_pto_config_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: policy_snapshots policy_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.policy_snapshots
    ADD CONSTRAINT policy_snapshots_pkey PRIMARY KEY (id);


--
-- Name: position_levels position_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.position_levels
    ADD CONSTRAINT position_levels_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: pto_balance_adjustments pto_balance_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_balance_adjustments
    ADD CONSTRAINT pto_balance_adjustments_pkey PRIMARY KEY (id);


--
-- Name: pto_balances pto_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_balances
    ADD CONSTRAINT pto_balances_pkey PRIMARY KEY (id);


--
-- Name: pto_notifications pto_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_notifications
    ADD CONSTRAINT pto_notifications_pkey PRIMARY KEY (id);


--
-- Name: pto_requests pto_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_requests
    ADD CONSTRAINT pto_requests_pkey PRIMARY KEY (id);


--
-- Name: recurring_pto_adjustments recurring_pto_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.recurring_pto_adjustments
    ADD CONSTRAINT recurring_pto_adjustments_pkey PRIMARY KEY (id);


--
-- Name: sensitive_data_access sensitive_data_access_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.sensitive_data_access
    ADD CONSTRAINT sensitive_data_access_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: signable_documents signable_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signable_documents
    ADD CONSTRAINT signable_documents_pkey PRIMARY KEY (id);


--
-- Name: signature_evidences signature_evidences_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signature_evidences
    ADD CONSTRAINT signature_evidences_pkey PRIMARY KEY (id);


--
-- Name: signature_requests signature_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_pkey PRIMARY KEY (id);


--
-- Name: signers signers_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signers
    ADD CONSTRAINT signers_pkey PRIMARY KEY (id);


--
-- Name: temporary_passwords temporary_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.temporary_passwords
    ADD CONSTRAINT temporary_passwords_pkey PRIMARY KEY (id);


--
-- Name: time_clock_terminals time_clock_terminals_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.time_clock_terminals
    ADD CONSTRAINT time_clock_terminals_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workday_summaries workday_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.workday_summaries
    ADD CONSTRAINT workday_summaries_pkey PRIMARY KEY (id);


--
-- Name: absence_types_active_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX absence_types_active_idx ON public.absence_types USING btree (active);


--
-- Name: absence_types_orgId_code_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "absence_types_orgId_code_key" ON public.absence_types USING btree ("orgId", code);


--
-- Name: absence_types_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "absence_types_orgId_idx" ON public.absence_types USING btree ("orgId");


--
-- Name: calendar_events_calendarId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "calendar_events_calendarId_idx" ON public.calendar_events USING btree ("calendarId");


--
-- Name: calendar_events_date_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX calendar_events_date_idx ON public.calendar_events USING btree (date);


--
-- Name: calendars_costCenterId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "calendars_costCenterId_idx" ON public.calendars USING btree ("costCenterId");


--
-- Name: calendars_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "calendars_orgId_idx" ON public.calendars USING btree ("orgId");


--
-- Name: calendars_year_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX calendars_year_idx ON public.calendars USING btree (year);


--
-- Name: conversations_lastMessageAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "conversations_lastMessageAt_idx" ON public.conversations USING btree ("lastMessageAt");


--
-- Name: conversations_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "conversations_orgId_idx" ON public.conversations USING btree ("orgId");


--
-- Name: conversations_orgId_userAId_userBId_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "conversations_orgId_userAId_userBId_key" ON public.conversations USING btree ("orgId", "userAId", "userBId");


--
-- Name: conversations_userAId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "conversations_userAId_idx" ON public.conversations USING btree ("userAId");


--
-- Name: conversations_userBId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "conversations_userBId_idx" ON public.conversations USING btree ("userBId");


--
-- Name: cost_centers_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "cost_centers_orgId_idx" ON public.cost_centers USING btree ("orgId");


--
-- Name: departments_managerId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "departments_managerId_idx" ON public.departments USING btree ("managerId");


--
-- Name: departments_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "departments_orgId_idx" ON public.departments USING btree ("orgId");


--
-- Name: dismissed_notifications_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "dismissed_notifications_orgId_idx" ON public.dismissed_notifications USING btree ("orgId");


--
-- Name: dismissed_notifications_userId_type_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "dismissed_notifications_userId_type_idx" ON public.dismissed_notifications USING btree ("userId", type);


--
-- Name: dismissed_notifications_userId_type_referenceId_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "dismissed_notifications_userId_type_referenceId_key" ON public.dismissed_notifications USING btree ("userId", type, "referenceId");


--
-- Name: employee_documents_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "employee_documents_employeeId_idx" ON public.employee_documents USING btree ("employeeId");


--
-- Name: employee_documents_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "employee_documents_orgId_idx" ON public.employee_documents USING btree ("orgId");


--
-- Name: employees_email_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX employees_email_idx ON public.employees USING btree (email);


--
-- Name: employees_expenseApproverId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "employees_expenseApproverId_idx" ON public.employees USING btree ("expenseApproverId");


--
-- Name: employees_orgId_employeeNumber_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "employees_orgId_employeeNumber_key" ON public.employees USING btree ("orgId", "employeeNumber");


--
-- Name: employees_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "employees_orgId_idx" ON public.employees USING btree ("orgId");


--
-- Name: employees_orgId_nifNie_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "employees_orgId_nifNie_key" ON public.employees USING btree ("orgId", "nifNie");


--
-- Name: employees_userId_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "employees_userId_key" ON public.employees USING btree ("userId");


--
-- Name: employment_contracts_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "employment_contracts_employeeId_idx" ON public.employment_contracts USING btree ("employeeId");


--
-- Name: employment_contracts_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "employment_contracts_orgId_idx" ON public.employment_contracts USING btree ("orgId");


--
-- Name: expense_approvals_approverId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expense_approvals_approverId_idx" ON public.expense_approvals USING btree ("approverId");


--
-- Name: expense_approvals_decision_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX expense_approvals_decision_idx ON public.expense_approvals USING btree (decision);


--
-- Name: expense_approvals_expenseId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expense_approvals_expenseId_idx" ON public.expense_approvals USING btree ("expenseId");


--
-- Name: expense_approvers_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expense_approvers_orgId_idx" ON public.expense_approvers USING btree ("orgId");


--
-- Name: expense_approvers_userId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expense_approvers_userId_idx" ON public.expense_approvers USING btree ("userId");


--
-- Name: expense_approvers_userId_orgId_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "expense_approvers_userId_orgId_key" ON public.expense_approvers USING btree ("userId", "orgId");


--
-- Name: expense_attachments_expenseId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expense_attachments_expenseId_idx" ON public.expense_attachments USING btree ("expenseId");


--
-- Name: expense_policies_orgId_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "expense_policies_orgId_key" ON public.expense_policies USING btree ("orgId");


--
-- Name: expense_reports_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expense_reports_orgId_idx" ON public.expense_reports USING btree ("orgId");


--
-- Name: expense_reports_ownerId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expense_reports_ownerId_idx" ON public.expense_reports USING btree ("ownerId");


--
-- Name: expense_reports_status_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX expense_reports_status_idx ON public.expense_reports USING btree (status);


--
-- Name: expenses_category_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX expenses_category_idx ON public.expenses USING btree (category);


--
-- Name: expenses_date_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX expenses_date_idx ON public.expenses USING btree (date);


--
-- Name: expenses_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expenses_employeeId_idx" ON public.expenses USING btree ("employeeId");


--
-- Name: expenses_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expenses_orgId_idx" ON public.expenses USING btree ("orgId");


--
-- Name: expenses_reportId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "expenses_reportId_idx" ON public.expenses USING btree ("reportId");


--
-- Name: expenses_status_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX expenses_status_idx ON public.expenses USING btree (status);


--
-- Name: geolocation_consents_active_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX geolocation_consents_active_idx ON public.geolocation_consents USING btree (active);


--
-- Name: geolocation_consents_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "geolocation_consents_orgId_idx" ON public.geolocation_consents USING btree ("orgId");


--
-- Name: geolocation_consents_userId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "geolocation_consents_userId_idx" ON public.geolocation_consents USING btree ("userId");


--
-- Name: geolocation_consents_userId_orgId_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "geolocation_consents_userId_orgId_key" ON public.geolocation_consents USING btree ("userId", "orgId");


--
-- Name: manual_time_entry_requests_approverId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "manual_time_entry_requests_approverId_idx" ON public.manual_time_entry_requests USING btree ("approverId");


--
-- Name: manual_time_entry_requests_date_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX manual_time_entry_requests_date_idx ON public.manual_time_entry_requests USING btree (date);


--
-- Name: manual_time_entry_requests_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "manual_time_entry_requests_employeeId_idx" ON public.manual_time_entry_requests USING btree ("employeeId");


--
-- Name: manual_time_entry_requests_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "manual_time_entry_requests_orgId_idx" ON public.manual_time_entry_requests USING btree ("orgId");


--
-- Name: manual_time_entry_requests_status_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX manual_time_entry_requests_status_idx ON public.manual_time_entry_requests USING btree (status);


--
-- Name: manual_time_entry_requests_submittedAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "manual_time_entry_requests_submittedAt_idx" ON public.manual_time_entry_requests USING btree ("submittedAt");


--
-- Name: messages_conversationId_createdAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "messages_conversationId_createdAt_idx" ON public.messages USING btree ("conversationId", "createdAt");


--
-- Name: messages_conversationId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "messages_conversationId_idx" ON public.messages USING btree ("conversationId");


--
-- Name: messages_createdAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "messages_createdAt_idx" ON public.messages USING btree ("createdAt");


--
-- Name: messages_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "messages_orgId_idx" ON public.messages USING btree ("orgId");


--
-- Name: messages_senderId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "messages_senderId_idx" ON public.messages USING btree ("senderId");


--
-- Name: organization_pto_config_orgId_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "organization_pto_config_orgId_key" ON public.organization_pto_config USING btree ("orgId");


--
-- Name: organizations_vat_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX organizations_vat_key ON public.organizations USING btree (vat);


--
-- Name: policy_snapshots_expenseId_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "policy_snapshots_expenseId_key" ON public.policy_snapshots USING btree ("expenseId");


--
-- Name: position_levels_order_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX position_levels_order_idx ON public.position_levels USING btree ("order");


--
-- Name: position_levels_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "position_levels_orgId_idx" ON public.position_levels USING btree ("orgId");


--
-- Name: position_levels_orgId_name_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "position_levels_orgId_name_key" ON public.position_levels USING btree ("orgId", name);


--
-- Name: position_levels_orgId_order_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "position_levels_orgId_order_key" ON public.position_levels USING btree ("orgId", "order");


--
-- Name: positions_levelId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "positions_levelId_idx" ON public.positions USING btree ("levelId");


--
-- Name: positions_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "positions_orgId_idx" ON public.positions USING btree ("orgId");


--
-- Name: pto_balance_adjustments_createdAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_balance_adjustments_createdAt_idx" ON public.pto_balance_adjustments USING btree ("createdAt");


--
-- Name: pto_balance_adjustments_createdById_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_balance_adjustments_createdById_idx" ON public.pto_balance_adjustments USING btree ("createdById");


--
-- Name: pto_balance_adjustments_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_balance_adjustments_orgId_idx" ON public.pto_balance_adjustments USING btree ("orgId");


--
-- Name: pto_balance_adjustments_ptoBalanceId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_balance_adjustments_ptoBalanceId_idx" ON public.pto_balance_adjustments USING btree ("ptoBalanceId");


--
-- Name: pto_balances_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_balances_employeeId_idx" ON public.pto_balances USING btree ("employeeId");


--
-- Name: pto_balances_orgId_employeeId_year_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "pto_balances_orgId_employeeId_year_key" ON public.pto_balances USING btree ("orgId", "employeeId", year);


--
-- Name: pto_balances_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_balances_orgId_idx" ON public.pto_balances USING btree ("orgId");


--
-- Name: pto_balances_year_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX pto_balances_year_idx ON public.pto_balances USING btree (year);


--
-- Name: pto_notifications_createdAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_notifications_createdAt_idx" ON public.pto_notifications USING btree ("createdAt");


--
-- Name: pto_notifications_expenseId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_notifications_expenseId_idx" ON public.pto_notifications USING btree ("expenseId");


--
-- Name: pto_notifications_isRead_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_notifications_isRead_idx" ON public.pto_notifications USING btree ("isRead");


--
-- Name: pto_notifications_manualTimeEntryRequestId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_notifications_manualTimeEntryRequestId_idx" ON public.pto_notifications USING btree ("manualTimeEntryRequestId");


--
-- Name: pto_notifications_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_notifications_orgId_idx" ON public.pto_notifications USING btree ("orgId");


--
-- Name: pto_notifications_ptoRequestId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_notifications_ptoRequestId_idx" ON public.pto_notifications USING btree ("ptoRequestId");


--
-- Name: pto_notifications_userId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_notifications_userId_idx" ON public.pto_notifications USING btree ("userId");


--
-- Name: pto_requests_approverId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_requests_approverId_idx" ON public.pto_requests USING btree ("approverId");


--
-- Name: pto_requests_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_requests_employeeId_idx" ON public.pto_requests USING btree ("employeeId");


--
-- Name: pto_requests_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_requests_orgId_idx" ON public.pto_requests USING btree ("orgId");


--
-- Name: pto_requests_startDate_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_requests_startDate_idx" ON public.pto_requests USING btree ("startDate");


--
-- Name: pto_requests_status_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX pto_requests_status_idx ON public.pto_requests USING btree (status);


--
-- Name: pto_requests_submittedAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "pto_requests_submittedAt_idx" ON public.pto_requests USING btree ("submittedAt");


--
-- Name: recurring_pto_adjustments_active_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX recurring_pto_adjustments_active_idx ON public.recurring_pto_adjustments USING btree (active);


--
-- Name: recurring_pto_adjustments_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "recurring_pto_adjustments_employeeId_idx" ON public.recurring_pto_adjustments USING btree ("employeeId");


--
-- Name: recurring_pto_adjustments_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "recurring_pto_adjustments_orgId_idx" ON public.recurring_pto_adjustments USING btree ("orgId");


--
-- Name: recurring_pto_adjustments_startYear_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "recurring_pto_adjustments_startYear_idx" ON public.recurring_pto_adjustments USING btree ("startYear");


--
-- Name: sensitive_data_access_accessedAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "sensitive_data_access_accessedAt_idx" ON public.sensitive_data_access USING btree ("accessedAt");


--
-- Name: sensitive_data_access_dataType_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "sensitive_data_access_dataType_idx" ON public.sensitive_data_access USING btree ("dataType");


--
-- Name: sensitive_data_access_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "sensitive_data_access_orgId_idx" ON public.sensitive_data_access USING btree ("orgId");


--
-- Name: sensitive_data_access_resourceId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "sensitive_data_access_resourceId_idx" ON public.sensitive_data_access USING btree ("resourceId");


--
-- Name: sensitive_data_access_userId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "sensitive_data_access_userId_idx" ON public.sensitive_data_access USING btree ("userId");


--
-- Name: sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");


--
-- Name: sessions_userId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "sessions_userId_idx" ON public.sessions USING btree ("userId");


--
-- Name: signable_documents_category_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX signable_documents_category_idx ON public.signable_documents USING btree (category);


--
-- Name: signable_documents_createdById_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signable_documents_createdById_idx" ON public.signable_documents USING btree ("createdById");


--
-- Name: signable_documents_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signable_documents_orgId_idx" ON public.signable_documents USING btree ("orgId");


--
-- Name: signature_evidences_createdAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signature_evidences_createdAt_idx" ON public.signature_evidences USING btree ("createdAt");


--
-- Name: signature_evidences_requestId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signature_evidences_requestId_idx" ON public.signature_evidences USING btree ("requestId");


--
-- Name: signature_evidences_result_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX signature_evidences_result_idx ON public.signature_evidences USING btree (result);


--
-- Name: signature_evidences_signerId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signature_evidences_signerId_idx" ON public.signature_evidences USING btree ("signerId");


--
-- Name: signature_requests_documentId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signature_requests_documentId_idx" ON public.signature_requests USING btree ("documentId");


--
-- Name: signature_requests_expiresAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signature_requests_expiresAt_idx" ON public.signature_requests USING btree ("expiresAt");


--
-- Name: signature_requests_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signature_requests_orgId_idx" ON public.signature_requests USING btree ("orgId");


--
-- Name: signature_requests_status_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX signature_requests_status_idx ON public.signature_requests USING btree (status);


--
-- Name: signers_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signers_employeeId_idx" ON public.signers USING btree ("employeeId");


--
-- Name: signers_requestId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signers_requestId_idx" ON public.signers USING btree ("requestId");


--
-- Name: signers_signToken_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "signers_signToken_idx" ON public.signers USING btree ("signToken");


--
-- Name: signers_signToken_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "signers_signToken_key" ON public.signers USING btree ("signToken");


--
-- Name: signers_status_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX signers_status_idx ON public.signers USING btree (status);


--
-- Name: temporary_passwords_active_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX temporary_passwords_active_idx ON public.temporary_passwords USING btree (active);


--
-- Name: temporary_passwords_expiresAt_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "temporary_passwords_expiresAt_idx" ON public.temporary_passwords USING btree ("expiresAt");


--
-- Name: temporary_passwords_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "temporary_passwords_orgId_idx" ON public.temporary_passwords USING btree ("orgId");


--
-- Name: temporary_passwords_userId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "temporary_passwords_userId_idx" ON public.temporary_passwords USING btree ("userId");


--
-- Name: time_clock_terminals_costCenterId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "time_clock_terminals_costCenterId_idx" ON public.time_clock_terminals USING btree ("costCenterId");


--
-- Name: time_clock_terminals_orgId_code_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "time_clock_terminals_orgId_code_key" ON public.time_clock_terminals USING btree ("orgId", code);


--
-- Name: time_clock_terminals_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "time_clock_terminals_orgId_idx" ON public.time_clock_terminals USING btree ("orgId");


--
-- Name: time_entries_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "time_entries_employeeId_idx" ON public.time_entries USING btree ("employeeId");


--
-- Name: time_entries_entryType_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "time_entries_entryType_idx" ON public.time_entries USING btree ("entryType");


--
-- Name: time_entries_isCancelled_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "time_entries_isCancelled_idx" ON public.time_entries USING btree ("isCancelled");


--
-- Name: time_entries_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "time_entries_orgId_idx" ON public.time_entries USING btree ("orgId");


--
-- Name: time_entries_timestamp_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX time_entries_timestamp_idx ON public.time_entries USING btree ("timestamp");


--
-- Name: time_entries_workdayId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "time_entries_workdayId_idx" ON public.time_entries USING btree ("workdayId");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "users_orgId_idx" ON public.users USING btree ("orgId");


--
-- Name: workday_summaries_date_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX workday_summaries_date_idx ON public.workday_summaries USING btree (date);


--
-- Name: workday_summaries_employeeId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "workday_summaries_employeeId_idx" ON public.workday_summaries USING btree ("employeeId");


--
-- Name: workday_summaries_orgId_employeeId_date_key; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE UNIQUE INDEX "workday_summaries_orgId_employeeId_date_key" ON public.workday_summaries USING btree ("orgId", "employeeId", date);


--
-- Name: workday_summaries_orgId_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX "workday_summaries_orgId_idx" ON public.workday_summaries USING btree ("orgId");


--
-- Name: workday_summaries_status_idx; Type: INDEX; Schema: public; Owner: erp_user
--

CREATE INDEX workday_summaries_status_idx ON public.workday_summaries USING btree (status);


--
-- Name: absence_types absence_types_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.absence_types
    ADD CONSTRAINT "absence_types_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_calendarId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT "calendar_events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES public.calendars(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: calendars calendars_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.calendars
    ADD CONSTRAINT "calendars_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calendars calendars_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.calendars
    ADD CONSTRAINT "calendars_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_userAId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_userBId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cost_centers cost_centers_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT "cost_centers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: departments departments_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: departments departments_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: departments departments_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dismissed_notifications dismissed_notifications_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT "dismissed_notifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dismissed_notifications dismissed_notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT "dismissed_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT "employee_documents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT "employee_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employees employees_expenseApproverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_expenseApproverId_fkey" FOREIGN KEY ("expenseApproverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employment_contracts employment_contracts_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employment_contracts
    ADD CONSTRAINT "employment_contracts_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employment_contracts employment_contracts_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employment_contracts
    ADD CONSTRAINT "employment_contracts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employment_contracts employment_contracts_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employment_contracts
    ADD CONSTRAINT "employment_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employment_contracts employment_contracts_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employment_contracts
    ADD CONSTRAINT "employment_contracts_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employment_contracts employment_contracts_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employment_contracts
    ADD CONSTRAINT "employment_contracts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employment_contracts employment_contracts_positionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.employment_contracts
    ADD CONSTRAINT "employment_contracts_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public.positions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_approvals expense_approvals_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_approvals
    ADD CONSTRAINT "expense_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expense_approvals expense_approvals_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_approvals
    ADD CONSTRAINT "expense_approvals_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_approvers expense_approvers_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_approvers
    ADD CONSTRAINT "expense_approvers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_approvers expense_approvers_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_approvers
    ADD CONSTRAINT "expense_approvers_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_attachments expense_attachments_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_attachments
    ADD CONSTRAINT "expense_attachments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_policies expense_policies_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_policies
    ADD CONSTRAINT "expense_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_reports expense_reports_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_reports
    ADD CONSTRAINT "expense_reports_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_reports expense_reports_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expense_reports
    ADD CONSTRAINT "expense_reports_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_reimbursedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_reimbursedBy_fkey" FOREIGN KEY ("reimbursedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public.expense_reports(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: geolocation_consents geolocation_consents_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.geolocation_consents
    ADD CONSTRAINT "geolocation_consents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: geolocation_consents geolocation_consents_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.geolocation_consents
    ADD CONSTRAINT "geolocation_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: manual_time_entry_requests manual_time_entry_requests_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.manual_time_entry_requests
    ADD CONSTRAINT "manual_time_entry_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: manual_time_entry_requests manual_time_entry_requests_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.manual_time_entry_requests
    ADD CONSTRAINT "manual_time_entry_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: manual_time_entry_requests manual_time_entry_requests_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.manual_time_entry_requests
    ADD CONSTRAINT "manual_time_entry_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: organization_pto_config organization_pto_config_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.organization_pto_config
    ADD CONSTRAINT "organization_pto_config_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: policy_snapshots policy_snapshots_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.policy_snapshots
    ADD CONSTRAINT "policy_snapshots_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: position_levels position_levels_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.position_levels
    ADD CONSTRAINT "position_levels_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: positions positions_levelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT "positions_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES public.position_levels(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: positions positions_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT "positions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_balance_adjustments pto_balance_adjustments_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_balance_adjustments
    ADD CONSTRAINT "pto_balance_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pto_balance_adjustments pto_balance_adjustments_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_balance_adjustments
    ADD CONSTRAINT "pto_balance_adjustments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_balance_adjustments pto_balance_adjustments_ptoBalanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_balance_adjustments
    ADD CONSTRAINT "pto_balance_adjustments_ptoBalanceId_fkey" FOREIGN KEY ("ptoBalanceId") REFERENCES public.pto_balances(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_balances pto_balances_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_balances
    ADD CONSTRAINT "pto_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_balances pto_balances_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_balances
    ADD CONSTRAINT "pto_balances_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_notifications pto_notifications_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_notifications
    ADD CONSTRAINT "pto_notifications_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_notifications pto_notifications_manualTimeEntryRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_notifications
    ADD CONSTRAINT "pto_notifications_manualTimeEntryRequestId_fkey" FOREIGN KEY ("manualTimeEntryRequestId") REFERENCES public.manual_time_entry_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_notifications pto_notifications_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_notifications
    ADD CONSTRAINT "pto_notifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_notifications pto_notifications_ptoRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_notifications
    ADD CONSTRAINT "pto_notifications_ptoRequestId_fkey" FOREIGN KEY ("ptoRequestId") REFERENCES public.pto_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_notifications pto_notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_notifications
    ADD CONSTRAINT "pto_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_requests pto_requests_absenceTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_requests
    ADD CONSTRAINT "pto_requests_absenceTypeId_fkey" FOREIGN KEY ("absenceTypeId") REFERENCES public.absence_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pto_requests pto_requests_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_requests
    ADD CONSTRAINT "pto_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pto_requests pto_requests_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_requests
    ADD CONSTRAINT "pto_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pto_requests pto_requests_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.pto_requests
    ADD CONSTRAINT "pto_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: recurring_pto_adjustments recurring_pto_adjustments_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.recurring_pto_adjustments
    ADD CONSTRAINT "recurring_pto_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: recurring_pto_adjustments recurring_pto_adjustments_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.recurring_pto_adjustments
    ADD CONSTRAINT "recurring_pto_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: recurring_pto_adjustments recurring_pto_adjustments_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.recurring_pto_adjustments
    ADD CONSTRAINT "recurring_pto_adjustments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sensitive_data_access sensitive_data_access_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.sensitive_data_access
    ADD CONSTRAINT "sensitive_data_access_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sensitive_data_access sensitive_data_access_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.sensitive_data_access
    ADD CONSTRAINT "sensitive_data_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: signable_documents signable_documents_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signable_documents
    ADD CONSTRAINT "signable_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: signable_documents signable_documents_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signable_documents
    ADD CONSTRAINT "signable_documents_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: signature_evidences signature_evidences_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signature_evidences
    ADD CONSTRAINT "signature_evidences_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.signature_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: signature_evidences signature_evidences_signerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signature_evidences
    ADD CONSTRAINT "signature_evidences_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES public.signers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: signature_requests signature_requests_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT "signature_requests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public.signable_documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: signature_requests signature_requests_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT "signature_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: signers signers_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signers
    ADD CONSTRAINT "signers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: signers signers_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.signers
    ADD CONSTRAINT "signers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.signature_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: temporary_passwords temporary_passwords_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.temporary_passwords
    ADD CONSTRAINT "temporary_passwords_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: temporary_passwords temporary_passwords_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.temporary_passwords
    ADD CONSTRAINT "temporary_passwords_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: temporary_passwords temporary_passwords_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.temporary_passwords
    ADD CONSTRAINT "temporary_passwords_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: time_clock_terminals time_clock_terminals_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.time_clock_terminals
    ADD CONSTRAINT "time_clock_terminals_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: time_clock_terminals time_clock_terminals_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.time_clock_terminals
    ADD CONSTRAINT "time_clock_terminals_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: time_entries time_entries_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT "time_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: time_entries time_entries_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT "time_entries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: time_entries time_entries_terminalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT "time_entries_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES public.time_clock_terminals(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: time_entries time_entries_workdayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT "time_entries_workdayId_fkey" FOREIGN KEY ("workdayId") REFERENCES public.workday_summaries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workday_summaries workday_summaries_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.workday_summaries
    ADD CONSTRAINT "workday_summaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workday_summaries workday_summaries_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: erp_user
--

ALTER TABLE ONLY public.workday_summaries
    ADD CONSTRAINT "workday_summaries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: erp_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

